import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import WelcomeScreen from '../../components/WelcomeScreen';

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
        <ActivityIndicator color="#f26318" size="large" />
      </View>
    );
  }

  // Non connecté → écran d'accueil
  if (!session) {
    return <WelcomeScreen />;
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
              <View style={[styles.card, isConfirming && styles.cardConfirming]}>
                {/* ── Barre couleur verticale gauche ── */}
                <View style={[styles.cardStripe, { backgroundColor: statusCfg.barColor }]} />

                {/* ── Contenu ── */}
                <View style={styles.cardInner}>
                  <TouchableOpacity
                    style={styles.cardBody}
                    onPress={() => {
                      if (isConfirming) { setConfirmDeleteId(null); return; }
                      router.push(`/session/${item.id}`);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardTop}>
                      {/* Type + date */}
                      <View style={styles.cardTitleRow}>
                        <View style={[styles.typeIconWrap, { backgroundColor: typeCfg.color + '18' }]}>
                          <Text style={styles.cardTypeIcon}>{typeCfg.icon}</Text>
                        </View>
                        <View style={{ gap: 2 }}>
                          <Text style={[styles.cardType, { color: typeCfg.color }]}>{typeCfg.label}</Text>
                          <View style={styles.cardMetaRow}>
                            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                            {dur && (
                              <>
                                <Text style={styles.cardMetaDot}>·</Text>
                                <Text style={styles.cardMeta}>{dur}</Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                      {/* Status badge */}
                      <View style={[styles.statusBadge, {
                        borderColor: statusCfg.color + '30',
                        backgroundColor: statusCfg.color + '0c',
                      }]}>
                        <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                          {statusCfg.icon}  {statusCfg.label}
                        </Text>
                      </View>
                    </View>

                    {item.notes && (
                      <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Actions / Confirm */}
                  {!isConfirming ? (
                    <View style={styles.actionsBar}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/edit-session/${item.id}`)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#484868" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setConfirmDeleteId(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#484868" />
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
  container:  { flex: 1, backgroundColor: '#07070e', paddingTop: 56, paddingHorizontal: 16 },
  centered:   { justifyContent: 'center', alignItems: 'center' },

  // ── Header ──────────────────────────────────────────────
  headerSection: { marginBottom: 16 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 16,
  },
  dateLabel: {
    color: '#f26318', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
  },
  header: { fontSize: 32, fontWeight: '900', color: '#eaeaf6', letterSpacing: -1 },
  importCsvBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f2631810', borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 9,
    borderWidth: 1, borderColor: '#f2631828',
  },
  importCsvText: { color: '#f26318', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },

  // ── Stats ────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0e0e1d',
    borderRadius: 14, borderWidth: 1, borderColor: '#1e1e36',
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
  },
  statChip: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: '#eaeaf6', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { color: '#505070', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: '#1e1e36' },

  // ── Filtres ──────────────────────────────────────────────
  filtersScroll: { flexGrow: 0, marginBottom: 14 },
  filtersRow: { flexDirection: 'row', gap: 7, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1,
    backgroundColor: '#0e0e1d', borderColor: '#1e1e36',
  },
  filterChipAll: { backgroundColor: '#f2631814', borderColor: '#f2631840' },
  filterChipIcon: { fontSize: 11 },
  filterChipText: { color: '#505070', fontSize: 11, fontWeight: '700' },
  filterChipTextAll: { color: '#f26318' },

  // ── Empty ─────────────────────────────────────────────────
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  emptyText: { color: '#7272a0', fontSize: 15, fontWeight: '600' },
  emptyHint: { color: '#f26318', fontSize: 13, fontWeight: '600' },

  // ── Carte ─────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#1e1e36',
    backgroundColor: '#0e0e1d',
    overflow: 'hidden',
  },
  cardConfirming: { borderColor: '#f8717138' },

  // Barre colorée verticale gauche
  cardStripe: { width: 4 },

  // Contenu à droite de la barre
  cardInner: { flex: 1 },
  cardBody: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },

  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTypeIcon: { fontSize: 17 },
  cardType: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },

  statusBadge: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1,
  },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  cardDate:    { color: '#7272a0', fontSize: 12 },
  cardMetaDot: { color: '#3d3d5e', fontSize: 11 },
  cardMeta:    { color: '#9090b8', fontSize: 12, fontWeight: '600' },
  cardNotes:   { color: '#505070', fontSize: 12, marginTop: 6, fontStyle: 'italic', lineHeight: 17 },

  // ── Barre d'actions ──────────────────────────────────────
  actionsBar: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: '#14142a',
    paddingHorizontal: 10, paddingVertical: 7, gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },

  // ── Confirmation suppression ─────────────────────────────
  confirmBar: {
    borderTopWidth: 1, borderTopColor: '#f8717120',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  confirmLabel: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmYes: {
    flex: 1, backgroundColor: '#f8717120', borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: '#f8717138',
  },
  confirmYesText: { color: '#f87171', fontWeight: '700', fontSize: 13 },
  confirmNo: {
    flex: 1, backgroundColor: '#0e0e1d', borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e1e36',
  },
  confirmNoText: { color: '#7272a0', fontWeight: '700', fontSize: 13 },
});
