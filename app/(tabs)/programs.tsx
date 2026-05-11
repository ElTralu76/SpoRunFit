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

type MyCustomProgram = {
  id: string;
  name: string;
  emoji: string;
  level: string;
  duration_weeks: number;
  sessions_per_week: number;
  sessions: any[];
  share_token: string;
};

// Couleur d'accentuation par tag de catégorie
const LEVEL_COLOR: Record<string, string> = {
  'Débutant':      '#4ade80',
  'Intermédiaire': '#facc15',
  'Avancé':        '#f87171',
};

const CATEGORY_TAG: Record<string, { label: string; color: string }> = {
  'premiere-traction': { label: 'Force',     color: '#a78bfa' },
  'tractions-pavel':   { label: 'Force',     color: '#a78bfa' },
  'wendler-531':       { label: 'Force',     color: '#a78bfa' },
  'force-stricte':     { label: 'Poids corp.', color: '#4ade80' },
  'plan-5k':           { label: 'Run',       color: '#60a5fa' },
  'plan-10k':          { label: 'Run',       color: '#60a5fa' },
};

export default function ProgramsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [myCustomPrograms, setMyCustomPrograms] = useState<MyCustomProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [session])
  );

  async function fetchAll() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const [upRes, cpRes] = await Promise.all([
      supabase.from('user_programs')
        .select('id, program_id, start_date, sessions_done, active')
        .eq('user_id', session.user.id).eq('active', true),
      supabase.from('custom_programs')
        .select('id, name, emoji, level, duration_weeks, sessions_per_week, sessions, share_token')
        .eq('author_id', session.user.id)
        .order('created_at', { ascending: false }),
    ]);
    const ups = upRes.data ?? [];
    setUserPrograms(ups);

    // Récupère aussi les programmes custom dans lesquels l'user est inscrit
    const customIds = ups
      .map(u => u.program_id)
      .filter(id => !PROGRAMS.find(p => p.id === id)); // IDs non trouvés dans le catalogue = custom

    let allCustom = cpRes.data ?? [];
    if (customIds.length > 0) {
      const { data: enrolled } = await supabase
        .from('custom_programs')
        .select('id, name, emoji, level, duration_weeks, sessions_per_week, sessions, share_token')
        .in('id', customIds);
      // Fusionne sans doublons
      const merged = [...allCustom];
      for (const p of enrolled ?? []) {
        if (!merged.find(m => m.id === p.id)) merged.push(p);
      }
      allCustom = merged;
    }
    setMyCustomPrograms(allCustom);
    setLoading(false);
  }

  function getProgress(up: UserProgram) {
    // Catalogue
    const tpl = PROGRAMS.find(p => p.id === up.program_id);
    if (tpl) {
      const pct = Math.min(100, Math.round((up.sessions_done / tpl.sessions_total) * 100));
      return { done: up.sessions_done, total: tpl.sessions_total, pct,
        name: tpl.name, emoji: tpl.emoji, nextTitle: tpl.sessions[up.sessions_done]?.title ?? null };
    }
    // Custom
    const cp = myCustomPrograms.find(p => p.id === up.program_id);
    if (cp) {
      const total = cp.sessions.length;
      const pct = Math.min(100, Math.round((up.sessions_done / total) * 100));
      return { done: up.sessions_done, total, pct,
        name: cp.name, emoji: cp.emoji, nextTitle: cp.sessions[up.sessions_done]?.title ?? null };
    }
    return { done: up.sessions_done, total: 0, pct: 0, name: '—', emoji: '💪', nextTitle: null };
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
      <View style={styles.headerRow}>
        <Text style={styles.header}>Programmes</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-program')}>
          <Ionicons name="add" size={16} color="#e85d04" />
          <Text style={styles.createBtnText}>Créer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Mes programmes perso ── */}
      {myCustomPrograms.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Mes programmes</Text>
          {myCustomPrograms.map(cp => {
            const levelColor = LEVEL_COLOR[cp.level] ?? '#888';
            const shareUrl = `https://spo-run-fit.vercel.app/program/share/${cp.share_token}`;
            return (
              <View key={cp.id} style={styles.customCard}>
                <TouchableOpacity style={styles.customCardBody}
                  onPress={() => router.push(`/program/share/${cp.share_token}` as any)}
                  activeOpacity={0.85}>
                  <View style={styles.catalogTop}>
                    <View style={styles.catalogEmojiWrap}>
                      <Text style={styles.catalogEmoji}>{cp.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.catalogName}>{cp.name}</Text>
                      <Text style={styles.catalogAuthor}>
                        {cp.duration_weeks} sem. · {cp.sessions_per_week} séances/sem. · {cp.sessions.length} séances
                      </Text>
                    </View>
                    <View style={[styles.tag, { borderColor: levelColor + '50' }]}>
                      <Text style={[styles.tagText, { color: levelColor }]}>{cp.level}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Bouton partager */}
                <TouchableOpacity style={styles.shareBtn} onPress={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(shareUrl);
                  }
                }}>
                  <Ionicons name="share-outline" size={14} color="#555" />
                  <Text style={styles.shareBtnText}>Copier le lien</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      {/* ── Programmes en cours ── */}
      {userPrograms.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>En cours</Text>
          {userPrograms.map(up => {
            const { done, total, pct, name, emoji, nextTitle } = getProgress(up);
            if (!total) return null;
            const finished = done >= total;

            // Navigation : catalogue vs custom
            const isCatalog = !!PROGRAMS.find(p => p.id === up.program_id);
            const cp = myCustomPrograms.find(p => p.id === up.program_id);
            const destination = isCatalog
              ? `/program/${up.program_id}`
              : cp ? `/program/share/${cp.share_token}` : null;

            return (
              <TouchableOpacity
                key={up.id}
                style={styles.activeCard}
                onPress={() => destination && router.push(destination as any)}
                activeOpacity={0.85}
              >
                <View style={styles.activeCardTop}>
                  <View style={styles.activeEmojiWrap}>
                    <Text style={styles.activeEmoji}>{emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeName}>{name}</Text>
                    <Text style={styles.activeMeta}>
                      Séance {Math.min(done + 1, total)}/{total}
                    </Text>
                  </View>
                  <View style={styles.pctBadge}>
                    <Text style={styles.pctText}>{pct}%</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>

                {!finished && nextTitle && (
                  <View style={styles.nextSessionBox}>
                    <Text style={styles.nextSessionLabel}>PROCHAINE</Text>
                    <Text style={styles.nextSessionTitle}>{nextTitle}</Text>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070e' },
  content:   { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40 },
  centered:  { justifyContent: 'center', alignItems: 'center' },

  header: { fontSize: 32, fontWeight: '900', color: '#eaeaf6', letterSpacing: -1 },
  sectionLabel: {
    color: '#505070', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 6,
  },

  // ── Programme actif ──────────────────────────────────────
  activeCard: {
    backgroundColor: '#0e0e1d',
    borderRadius: 18, borderWidth: 1, borderColor: '#f2631832',
    padding: 18, marginBottom: 20, gap: 14,
    // subtle orange top glow via borderColor
  },
  activeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  activeEmojiWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#f2631812', borderWidth: 1, borderColor: '#f2631828',
    justifyContent: 'center', alignItems: 'center',
  },
  activeEmoji: { fontSize: 26 },
  activeName: { color: '#eaeaf6', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  activeMeta: { color: '#7272a0', fontSize: 12, marginTop: 2 },
  pctBadge: {
    backgroundColor: '#f2631810', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#f2631830',
  },
  pctText: { color: '#f26318', fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },

  progressTrack: {
    height: 4, backgroundColor: '#1a1a30', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#f26318', borderRadius: 2 },

  nextSessionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#07070e', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e1e36',
  },
  nextSessionFinished: { borderColor: '#4ade8028' },
  nextSessionLabel: {
    color: '#505070', fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  nextSessionTitle: { color: '#c8c8e0', fontSize: 13, fontWeight: '600', flex: 1 },
  finishedText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },

  // ── Catalogue ────────────────────────────────────────────
  catalogHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  catalogCount: { color: '#505070', fontSize: 11, fontWeight: '600' },

  catalogCard: {
    backgroundColor: '#0e0e1d', borderRadius: 18,
    borderWidth: 1, borderColor: '#1e1e36',
    padding: 16, marginBottom: 12, gap: 12,
  },
  catalogCardActive: { borderColor: '#f2631828' },
  catalogTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  catalogEmojiWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#141428', borderWidth: 1, borderColor: '#2a2a44',
    justifyContent: 'center', alignItems: 'center',
  },
  catalogEmoji: { fontSize: 26 },
  catalogName:   { color: '#eaeaf6', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  catalogAuthor: { color: '#505070', fontSize: 12, marginTop: 2 },
  catalogDesc:   { color: '#7272a0', fontSize: 13, lineHeight: 20 },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f2631812', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#f2631830',
  },
  activeBadgeText: { color: '#f26318', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // Tags & meta
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    borderWidth: 1, borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#07070e', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#1e1e36',
  },
  metaChipText: { color: '#505070', fontSize: 10, fontWeight: '600' },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#f2631812', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#f2631832',
  },
  createBtnText: { color: '#f26318', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },

  // Programmes perso
  customCard: {
    backgroundColor: '#0e0e1d', borderRadius: 18,
    borderWidth: 1, borderColor: '#1e1e36',
    marginBottom: 12, overflow: 'hidden',
  },
  customCardBody: { padding: 16 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: '#14142a',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  shareBtnText: { color: '#505070', fontSize: 12, fontWeight: '600' },
});
