import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, ThemeColors } from '../../lib/ThemeContext';
import { PROGRAMS, ProgramTemplate } from '../../lib/programs';

type UserProgram = {
  id: string;
  program_id: string;
  start_date: string;
  sessions_done: number;
  active: boolean;
  config?: Record<string, any> | null;
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
  const { theme } = useTheme();
  const router = useRouter();
  const [userPrograms, setUserPrograms]       = useState<UserProgram[]>([]);
  const [pausedPrograms, setPausedPrograms]   = useState<UserProgram[]>([]);
  const [myCustomPrograms, setMyCustomPrograms] = useState<MyCustomProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [session])
  );

  async function fetchAll() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const [upRes, cpRes] = await Promise.all([
      supabase.from('user_programs')
        .select('id, program_id, start_date, sessions_done, active, config')
        .eq('user_id', session.user.id),
      supabase.from('custom_programs')
        .select('id, name, emoji, level, duration_weeks, sessions_per_week, sessions, share_token')
        .eq('author_id', session.user.id)
        .order('created_at', { ascending: false }),
    ]);
    const all = upRes.data ?? [];
    const ups     = all.filter(u => u.active === true);
    const paused  = all.filter(u => u.active === false && u.config?.paused === true);
    setUserPrograms(ups);
    setPausedPrograms(paused);

    // Récupère aussi les programmes custom dans lesquels l'user est inscrit (actifs + pausés)
    const customIds = [...ups, ...paused]
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

  async function handlePause(up: UserProgram) {
    await supabase.from('user_programs')
      .update({ active: false, config: { ...(up.config ?? {}), paused: true } })
      .eq('id', up.id);
    fetchAll();
  }

  async function handleResume(up: UserProgram) {
    const updatedConfig = { ...(up.config ?? {}) };
    delete updatedConfig.paused;
    await supabase.from('user_programs')
      .update({ active: true, config: updatedConfig })
      .eq('id', up.id);
    fetchAll();
  }

  async function handleAbandon(up: UserProgram) {
    const doAbandon = async () => {
      await supabase.from('user_programs').delete().eq('id', up.id);
      fetchAll();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Abandonner ce programme ? Cette action est irréversible.')) doAbandon();
    } else {
      Alert.alert(
        'Abandonner le programme',
        'Cette action est irréversible. Tu pourras le recommencer depuis le catalogue.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Abandonner', style: 'destructive', onPress: doAbandon },
        ],
      );
    }
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

  const activeIds  = new Set(userPrograms.map(u => u.program_id));
  const pausedIds  = new Set(pausedPrograms.map(u => u.program_id));

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
            const isCatalog = !!PROGRAMS.find(p => p.id === up.program_id);
            const cp = myCustomPrograms.find(p => p.id === up.program_id);
            const destination = isCatalog
              ? `/program/${up.program_id}`
              : cp ? `/program/share/${cp.share_token}` : null;

            return (
              <View key={up.id} style={styles.activeCard}>
                <TouchableOpacity
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

                {/* Actions Pause / Abandon */}
                {!finished && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.pauseBtn} onPress={() => handlePause(up)}>
                      <Ionicons name="pause-circle-outline" size={14} color={theme.t2} />
                      <Text style={styles.pauseBtnText}>Mettre en pause</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.abandonBtn} onPress={() => handleAbandon(up)}>
                      <Ionicons name="close-circle-outline" size={14} color="#f87171" />
                      <Text style={styles.abandonBtnText}>Abandonner</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* ── Programmes en pause ── */}
      {pausedPrograms.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>En pause</Text>
          {pausedPrograms.map(up => {
            const { done, total, pct, name, emoji } = getProgress(up);
            if (!total) return null;
            const isCatalog = !!PROGRAMS.find(p => p.id === up.program_id);
            const cp = myCustomPrograms.find(p => p.id === up.program_id);
            const destination = isCatalog
              ? `/program/${up.program_id}`
              : cp ? `/program/share/${cp.share_token}` : null;

            return (
              <View key={up.id} style={[styles.activeCard, styles.pausedCard]}>
                <TouchableOpacity
                  onPress={() => destination && router.push(destination as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.activeCardTop}>
                    <View style={[styles.activeEmojiWrap, styles.pausedEmojiWrap]}>
                      <Text style={styles.activeEmoji}>{emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activeName, { color: theme.t2 }]}>{name}</Text>
                      <Text style={styles.activeMeta}>Séance {done}/{total} · en pause</Text>
                    </View>
                    <View style={[styles.pctBadge, styles.pausedPctBadge]}>
                      <Text style={[styles.pctText, { color: theme.t2 }]}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, styles.pausedProgressFill, { width: `${pct}%` as any }]} />
                  </View>
                </TouchableOpacity>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.pauseBtn, styles.resumeBtn]} onPress={() => handleResume(up)}>
                    <Ionicons name="play-circle-outline" size={14} color={theme.orange} />
                    <Text style={[styles.pauseBtnText, { color: theme.orange }]}>Reprendre</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.abandonBtn} onPress={() => handleAbandon(up)}>
                    <Ionicons name="close-circle-outline" size={14} color="#f87171" />
                    <Text style={styles.abandonBtnText}>Abandonner</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
        const isActive = activeIds.has(tpl.id) || pausedIds.has(tpl.id);
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content:   { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40 },
    centered:  { justifyContent: 'center', alignItems: 'center' },

    header: { fontSize: 32, fontWeight: '900', color: c.t1, letterSpacing: -1 },
    sectionLabel: {
      color: c.t3, fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 6,
    },

    activeCard: {
      backgroundColor: c.surf, borderRadius: 18,
      borderWidth: 1, borderColor: c.orange + '32',
      padding: 18, marginBottom: 20, gap: 14,
    },
    activeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    activeEmojiWrap: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.orange + '12', borderWidth: 1, borderColor: c.orange + '28',
      justifyContent: 'center', alignItems: 'center',
    },
    activeEmoji: { fontSize: 26 },
    activeName: { color: c.t1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    activeMeta: { color: c.t2, fontSize: 12, marginTop: 2 },
    pctBadge: {
      backgroundColor: c.orange + '10', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 5,
      borderWidth: 1, borderColor: c.orange + '30',
    },
    pctText: { color: c.orange, fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },

    progressTrack: { height: 4, backgroundColor: c.border2, borderRadius: 2, overflow: 'hidden' },
    progressFill:  { height: 4, backgroundColor: c.orange, borderRadius: 2 },

    nextSessionBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.bg, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    nextSessionFinished: { borderColor: '#4ade8028' },
    nextSessionLabel: { color: c.t3, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
    nextSessionTitle: { color: c.t1, fontSize: 13, fontWeight: '600', flex: 1 },
    finishedText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },

    // ── Actions sur les cartes en cours ───────────────────
    cardActions: {
      flexDirection: 'row', gap: 8,
      borderTopWidth: 1, borderTopColor: c.border,
      paddingTop: 12, marginTop: 4,
    },
    pauseBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      backgroundColor: c.bg, borderRadius: 10,
      paddingVertical: 9, borderWidth: 1, borderColor: c.border,
    },
    resumeBtn: { borderColor: c.orange + '40', backgroundColor: c.orange + '08' },
    pauseBtnText: { color: c.t2, fontSize: 12, fontWeight: '600' },
    abandonBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      backgroundColor: '#f8717108', borderRadius: 10,
      paddingVertical: 9, borderWidth: 1, borderColor: '#f8717128',
    },
    abandonBtnText: { color: '#f87171', fontSize: 12, fontWeight: '600' },

    // ── Carte pausée ──────────────────────────────────────
    pausedCard: { borderColor: c.border, opacity: 0.85 },
    pausedEmojiWrap: { backgroundColor: c.surf2, borderColor: c.border2 },
    pausedPctBadge: { backgroundColor: c.bg, borderColor: c.border },
    pausedProgressFill: { backgroundColor: c.t3 },

    catalogHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, marginTop: 4,
    },
    catalogCount: { color: c.t3, fontSize: 11, fontWeight: '600' },

    catalogCard: {
      backgroundColor: c.surf, borderRadius: 18,
      borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12, gap: 12,
    },
    catalogCardActive: { borderColor: c.orange + '28' },
    catalogTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    catalogEmojiWrap: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.surf2, borderWidth: 1, borderColor: c.border2,
      justifyContent: 'center', alignItems: 'center',
    },
    catalogEmoji: { fontSize: 26 },
    catalogName:   { color: c.t1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    catalogAuthor: { color: c.t3, fontSize: 12, marginTop: 2 },
    catalogDesc:   { color: c.t2, fontSize: 13, lineHeight: 20 },

    activeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.orange + '12', borderRadius: 8,
      paddingHorizontal: 9, paddingVertical: 4,
      borderWidth: 1, borderColor: c.orange + '30',
    },
    activeBadgeText: { color: c.orange, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    tag: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 },
    tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    metaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg, borderRadius: 100,
      paddingHorizontal: 9, paddingVertical: 3,
      borderWidth: 1, borderColor: c.border,
    },
    metaChipText: { color: c.t3, fontSize: 10, fontWeight: '600' },

    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 22,
    },
    createBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: c.orange + '12', borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 9,
      borderWidth: 1, borderColor: c.orange + '32',
    },
    createBtnText: { color: c.orange, fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },

    customCard: {
      backgroundColor: c.surf, borderRadius: 18,
      borderWidth: 1, borderColor: c.border,
      marginBottom: 12, overflow: 'hidden',
    },
    customCardBody: { padding: 16 },
    shareBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderTopWidth: 1, borderTopColor: c.border,
      paddingHorizontal: 16, paddingVertical: 11,
    },
    shareBtnText: { color: c.t3, fontSize: 12, fontWeight: '600' },
  });
}
