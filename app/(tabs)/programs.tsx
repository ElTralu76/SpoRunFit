import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { PROGRAMS, ProgramTemplate } from '../../lib/programs';

type UserProgram = {
  id: string;
  program_id: string;
  start_date: string;
  sessions_done: number;
  active: boolean;
};

// Couleur d'accentuation par tag de catégorie
const LEVEL_COLOR: Record<string, string> = {
  'Débutant':      '#4ade80',
  'Intermédiaire': '#facc15',
  'Avancé':        '#f87171',
};

const CATEGORY_TAG: Record<string, { label: string; color: string }> = {
  'tractions-pavel': { label: 'Force', color: '#a78bfa' },
  'wendler-531':     { label: 'Force', color: '#a78bfa' },
  'plan-5k':         { label: 'Run',   color: '#60a5fa' },
  'plan-10k':        { label: 'Run',   color: '#60a5fa' },
};

export default function ProgramsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { fetchUserPrograms(); }, [session])
  );

  async function fetchUserPrograms() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_programs')
      .select('id, program_id, start_date, sessions_done, active')
      .eq('user_id', session.user.id)
      .eq('active', true);
    setUserPrograms(data ?? []);
    setLoading(false);
  }

  function getProgress(up: UserProgram) {
    const tpl = PROGRAMS.find(p => p.id === up.program_id);
    if (!tpl) return { done: up.sessions_done, total: 0, pct: 0 };
    const pct = Math.min(100, Math.round((up.sessions_done / tpl.sessions_total) * 100));
    return { done: up.sessions_done, total: tpl.sessions_total, pct };
  }

  const activeIds = new Set(userPrograms.map(u => u.program_id));

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Programmes</Text>

      {/* ── Programmes actifs ── */}
      {userPrograms.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>En cours</Text>
          {userPrograms.map(up => {
            const tpl = PROGRAMS.find(p => p.id === up.program_id);
            if (!tpl) return null;
            const { done, total, pct } = getProgress(up);
            const nextSession = tpl.sessions[done];
            const finished = done >= total;

            return (
              <TouchableOpacity
                key={up.id}
                style={styles.activeCard}
                onPress={() => router.push(`/program/${tpl.id}`)}
                activeOpacity={0.85}
              >
                {/* En-tête */}
                <View style={styles.activeCardTop}>
                  <View style={styles.activeEmojiWrap}>
                    <Text style={styles.activeEmoji}>{tpl.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeName}>{tpl.name}</Text>
                    <Text style={styles.activeMeta}>
                      Séance {Math.min(done + 1, total)}/{total}
                    </Text>
                  </View>
                  <View style={styles.pctBadge}>
                    <Text style={styles.pctText}>{pct}%</Text>
                  </View>
                </View>

                {/* Barre de progression */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>

                {/* Prochaine séance */}
                {!finished && nextSession && (
                  <View style={styles.nextSessionBox}>
                    <Text style={styles.nextSessionLabel}>PROCHAINE</Text>
                    <Text style={styles.nextSessionTitle}>{nextSession.title}</Text>
                  </View>
                )}
                {finished && (
                  <View style={[styles.nextSessionBox, styles.nextSessionFinished]}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.finishedText}>Programme terminé ! 🏁</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* ── Catalogue ── */}
      <View style={styles.catalogHeader}>
        <Text style={styles.sectionLabel}>Catalogue</Text>
        <Text style={styles.catalogCount}>{PROGRAMS.length} programmes</Text>
      </View>

      {PROGRAMS.map(tpl => {
        const isActive = activeIds.has(tpl.id);
        const catTag = CATEGORY_TAG[tpl.id];
        const levelColor = LEVEL_COLOR[tpl.level] ?? '#888';

        return (
          <TouchableOpacity
            key={tpl.id}
            style={[styles.catalogCard, isActive && styles.catalogCardActive]}
            onPress={() => router.push(`/program/${tpl.id}`)}
            activeOpacity={0.85}
          >
            {/* Top */}
            <View style={styles.catalogTop}>
              <View style={styles.catalogEmojiWrap}>
                <Text style={styles.catalogEmoji}>{tpl.emoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.catalogName}>{tpl.name}</Text>
                <Text style={styles.catalogAuthor}>par {tpl.author}</Text>
              </View>
              {isActive ? (
                <View style={styles.activeBadge}>
                  <Ionicons name="play-circle" size={12} color="#e85d04" />
                  <Text style={styles.activeBadgeText}>En cours</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#333" />
              )}
            </View>

            {/* Description */}
            <Text style={styles.catalogDesc} numberOfLines={2}>{tpl.description}</Text>

            {/* Tags */}
            <View style={styles.tagsRow}>
              {/* Niveau */}
              <View style={[styles.tag, { borderColor: levelColor + '50' }]}>
                <Text style={[styles.tagText, { color: levelColor }]}>{tpl.level}</Text>
              </View>

              {/* Catégorie */}
              {catTag && (
                <View style={[styles.tag, { borderColor: catTag.color + '50' }]}>
                  <Text style={[styles.tagText, { color: catTag.color }]}>{catTag.label}</Text>
                </View>
              )}

              {/* Durée */}
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color="#444" />
                <Text style={styles.metaChipText}>{tpl.duration_weeks} sem.</Text>
              </View>

              {/* Fréquence */}
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={11} color="#444" />
                <Text style={styles.metaChipText}>{tpl.frequency}</Text>
              </View>

              {/* Total séances */}
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={11} color="#444" />
                <Text style={styles.metaChipText}>{tpl.sessions_total} séances</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Placeholder programme perso */}
      <TouchableOpacity style={styles.customProgCard} disabled>
        <Ionicons name="add-circle-outline" size={24} color="#2a2a2a" />
        <View style={{ flex: 1 }}>
          <Text style={styles.customProgTitle}>Créer un programme</Text>
          <Text style={styles.customProgSub}>Bientôt disponible</Text>
        </View>
        <View style={styles.soonBadge}>
          <Text style={styles.soonText}>Bientôt</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content:   { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40 },
  centered:  { justifyContent: 'center', alignItems: 'center' },

  header: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 20,
  },
  sectionLabel: {
    color: '#333', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },

  // ── Programme actif ──
  activeCard: {
    backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: '#e85d04',
    padding: 16, marginBottom: 20, gap: 12,
  },
  activeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeEmojiWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1a0e00', borderWidth: 1, borderColor: '#e85d0430',
    justifyContent: 'center', alignItems: 'center',
  },
  activeEmoji: { fontSize: 24 },
  activeName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  activeMeta: { color: '#666', fontSize: 12, marginTop: 1 },
  pctBadge: {
    backgroundColor: '#1a0e00', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e85d0430',
  },
  pctText: { color: '#e85d04', fontSize: 14, fontWeight: '800' },

  progressTrack: {
    height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 5, backgroundColor: '#e85d04', borderRadius: 3,
  },

  nextSessionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0a0a0a', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  nextSessionFinished: { borderColor: '#4ade8030' },
  nextSessionLabel: {
    color: '#333', fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  nextSessionTitle: { color: '#ccc', fontSize: 13, fontWeight: '600', flex: 1 },
  finishedText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },

  // ── Catalogue ──
  catalogHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, marginTop: 4,
  },
  catalogCount: { color: '#333', fontSize: 11 },

  catalogCard: {
    backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, marginBottom: 12, gap: 10,
  },
  catalogCardActive: { borderColor: '#e85d0430' },
  catalogTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catalogEmojiWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#222',
    justifyContent: 'center', alignItems: 'center',
  },
  catalogEmoji: { fontSize: 24 },
  catalogName:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  catalogAuthor: { color: '#444', fontSize: 12 },
  catalogDesc:   { color: '#555', fontSize: 13, lineHeight: 19 },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a0e00', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  activeBadgeText: { color: '#e85d04', fontSize: 11, fontWeight: '700' },

  // Tags & meta
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a0a0a', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  metaChipText: { color: '#444', fontSize: 11 },

  // Placeholder programme perso
  customProgCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0d0d0d', borderRadius: 16,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#222',
    padding: 16, marginTop: 4,
  },
  customProgTitle: { color: '#333', fontSize: 14, fontWeight: '700' },
  customProgSub:   { color: '#222', fontSize: 12, marginTop: 2 },
  soonBadge: {
    backgroundColor: '#161616', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#222',
  },
  soonText: { color: '#333', fontSize: 10, fontWeight: '700' },
});
