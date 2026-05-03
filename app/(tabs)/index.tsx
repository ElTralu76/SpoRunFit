import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// ─── Types ────────────────────────────────────────────────

type Session = {
  id: string;
  date: string;
  type: 'run' | 'crossfit' | 'renfo' | 'autre';
  status: 'planned' | 'completed' | 'skipped';
  notes: string | null;
  duration: number | null;
};

type DisplayStatus = 'completed' | 'today' | 'late' | 'planned' | 'skipped';

// ─── Config ───────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  run:      { label: 'Run',      icon: '🏃', color: '#60a5fa' },
  crossfit: { label: 'CrossFit', icon: '🔥', color: '#e85d04' },
  renfo:    { label: 'Renfo',    icon: '🏋️', color: '#a78bfa' },
  autre:    { label: 'Autre',    icon: '💪', color: '#facc15' },
};

const STATUS_CONFIG: Record<DisplayStatus, {
  label: string; icon: string; color: string; barColor: string;
}> = {
  completed: { label: 'Terminée',    icon: '✓',  color: '#4ade80', barColor: '#4ade80' },
  today:     { label: "Auj.",        icon: '◎',  color: '#facc15', barColor: '#facc15' },
  late:      { label: 'En retard',   icon: '!',  color: '#f87171', barColor: '#f87171' },
  planned:   { label: 'Planifiée',   icon: '○',  color: '#60a5fa', barColor: '#60a5fa' },
  skipped:   { label: 'Passée',      icon: '–',  color: '#444',    barColor: '#2a2a2a' },
};

// Pour les chips filtres — garde les emojis lisibles
const FILTER_EMOJI: Record<DisplayStatus, string> = {
  completed: '✅', today: '🎯', late: '⚠️', planned: '📅', skipped: '⏭️',
};

const ALL_FILTERS: DisplayStatus[] = ['completed', 'today', 'late', 'planned', 'skipped'];

// ─── Helpers ──────────────────────────────────────────────

function getDisplayStatus(status: Session['status'], date: string): DisplayStatus {
  if (status === 'completed') return 'completed';
  if (status === 'skipped')   return 'skipped';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'today';
  if (d < today) return 'late';
  return 'planned';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  });
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

function todayLabel(): string {
  const now = new Date();
  const d = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ─── Composant ────────────────────────────────────────────

export default function JournalScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<DisplayStatus>>(
    new Set(ALL_FILTERS)
  );

  useFocusEffect(
    useCallback(() => { fetchSessions(); }, [session])
  );

  async function fetchSessions() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('id, date, type, status, notes, duration')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .limit(100);
    if (!error && data) setSessions(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await supabase.from('sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  function toggleFilter(f: DisplayStatus) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(f)) {
        if (next.size === 1) return prev;
        next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
  }

  function selectAll() { setActiveFilters(new Set(ALL_FILTERS)); }

  const filtered = sessions.filter(s =>
    activeFilters.has(getDisplayStatus(s.status, s.date))
  );
  const isAllSelected = activeFilters.size === ALL_FILTERS.length;

  // Compter les séances à faire aujourd'hui / en retard pour le badge
  const urgent = sessions.filter(s => {
    const ds = getDisplayStatus(s.status, s.date);
    return ds === 'today' || ds === 'late';
  }).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.dateLabel}>{todayLabel()}</Text>
            <Text style={styles.header}>Mon journal</Text>
          </View>
          <TouchableOpacity
            style={styles.importCsvBtn}
            onPress={() => router.push('/import-csv')}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#e85d04" />
            <Text style={styles.importCsvText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{sessions.filter(s => s.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>terminées</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statValue, urgent > 0 && { color: '#f87171' }]}>{urgent}</Text>
            <Text style={styles.statLabel}>à faire</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{sessions.filter(s => s.status === 'planned').length}</Text>
            <Text style={styles.statLabel}>planifiées</Text>
          </View>
        </View>
      </View>

      {/* ── Filtres ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersRow}
      >
        <TouchableOpacity
          style={[styles.filterChip, isAllSelected && styles.filterChipAll]}
          onPress={selectAll}
        >
          <Text style={[styles.filterChipText, isAllSelected && styles.filterChipTextAll]}>
            Tout
          </Text>
        </TouchableOpacity>

        {ALL_FILTERS.map(f => {
          const cfg = STATUS_CONFIG[f];
          const active = activeFilters.has(f) && !isAllSelected;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                active && { borderColor: cfg.color + '60' },
              ]}
              onPress={() => {
                if (isAllSelected) {
                  setActiveFilters(new Set([f]));
                } else {
                  toggleFilter(f);
                }
              }}
            >
              <Text style={styles.filterChipIcon}>{FILTER_EMOJI[f]}</Text>
              <Text style={[
                styles.filterChipText,
                active && { color: cfg.color },
              ]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={40} color="#2a2a2a" />
          <Text style={styles.emptyText}>Aucune séance dans ce filtre</Text>
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.emptyHint}>Afficher tout →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const ds = getDisplayStatus(item.status, item.date);
            const statusCfg = STATUS_CONFIG[ds];
            const typeCfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.autre;
            const isConfirming = confirmDeleteId === item.id;
            const dur = formatDuration(item.duration);

            return (
              <View style={[
                styles.card,
                isConfirming && styles.cardConfirming,
              ]}>
                {/* Barre gauche colorée */}
                <View style={[styles.cardAccentBar, { backgroundColor: statusCfg.barColor }]} />

                {/* Zone tappable */}
                <TouchableOpacity
                  style={styles.cardBody}
                  onPress={() => {
                    if (isConfirming) { setConfirmDeleteId(null); return; }
                    router.push(`/session/${item.id}`);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTypeIcon}>{typeCfg.icon}</Text>
                      <Text style={[styles.cardType, { color: typeCfg.color }]}>
                        {typeCfg.label}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { borderColor: statusCfg.color + '40' }]}>
                      <Text style={[styles.statusIcon, { color: statusCfg.color }]}>
                        {statusCfg.icon}
                      </Text>
                      <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                    {dur && (
                      <>
                        <Text style={styles.cardMetaDot}>·</Text>
                        <Text style={styles.cardMeta}>{dur}</Text>
                      </>
                    )}
                  </View>

                  {item.notes && (
                    <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>
                  )}
                </TouchableOpacity>

                {/* Actions */}
                {!isConfirming ? (
                  <View style={styles.actionsBar}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push(`/edit-session/${item.id}`)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={15} color="#555" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setConfirmDeleteId(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#555" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.confirmBar}>
                    <Text style={styles.confirmLabel}>Supprimer cette séance ?</Text>
                    <View style={styles.confirmBtns}>
                      <TouchableOpacity
                        style={styles.confirmYes}
                        onPress={() => handleDelete(item.id)}
                        disabled={deleting}
                      >
                        {deleting
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.confirmYesText}>Supprimer</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmNo}
                        onPress={() => setConfirmDeleteId(null)}
                      >
                        <Text style={styles.confirmNoText}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 56, paddingHorizontal: 16 },
  centered:   { justifyContent: 'center', alignItems: 'center' },

  // Header
  headerSection: { marginBottom: 14 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 14,
  },
  dateLabel:  { color: '#444', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  header:     { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  importCsvBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#161616', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#242424',
  },
  importCsvText: { color: '#e85d04', fontWeight: '700', fontSize: 13 },

  // Stats row
  statsRow: {
    flexDirection: 'row', backgroundColor: '#111',
    borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e',
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  statChip: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#444', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 28, backgroundColor: '#1e1e1e' },

  // Filtres
  filtersScroll: { flexGrow: 0, marginBottom: 12 },
  filtersRow: { flexDirection: 'row', gap: 7, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: '#111', borderColor: '#1e1e1e',
  },
  filterChipAll: { backgroundColor: '#1a0e00', borderColor: '#e85d04' },
  filterChipIcon: { fontSize: 12 },
  filterChipText: { color: '#444', fontSize: 12, fontWeight: '700' },
  filterChipTextAll: { color: '#e85d04' },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#555', fontSize: 15 },
  emptyHint: { color: '#e85d04', fontSize: 13, fontWeight: '600' },

  // Carte
  card: {
    borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#1e1e1e',
    backgroundColor: '#111',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  cardConfirming: { borderColor: '#f8717140' },
  cardAccentBar: { height: 3, width: '100%' },
  cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },

  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTypeIcon: { fontSize: 18 },
  cardType: { fontSize: 15, fontWeight: '700' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: '#0a0a0a',
  },
  statusIcon:  { fontSize: 11, fontWeight: '700' },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate:    { color: '#555', fontSize: 13 },
  cardMetaDot: { color: '#333', fontSize: 12 },
  cardMeta:    { color: '#888', fontSize: 13, fontWeight: '600' },
  cardNotes:   { color: '#444', fontSize: 12, marginTop: 5, fontStyle: 'italic' },

  // Barre d'actions
  actionsBar: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: '#161616',
    paddingHorizontal: 12, paddingVertical: 8, gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: '#0a0a0a',
    borderWidth: 1, borderColor: '#1a1a1a',
  },

  // Confirmation suppression
  confirmBar: {
    borderTopWidth: 1, borderTopColor: '#f8717125',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  confirmLabel: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmYes: {
    flex: 1, backgroundColor: '#f87171', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
  },
  confirmYesText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  confirmNo: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  confirmNoText: { color: '#888', fontWeight: '700', fontSize: 14 },
});
