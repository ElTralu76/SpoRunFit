/**
 * /program/share/[token]
 * Page publique accessible sans connexion.
 * Affiche un programme personnalisé et permet de l'ajouter à ses programmes.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

type CustomProgram = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  level: string;
  duration_weeks: number;
  sessions_per_week: number;
  sessions: any[];
  author_id: string;
};

const LEVEL_COLOR: Record<string, string> = {
  'Débutant': '#4ade80', 'Intermédiaire': '#facc15', 'Avancé': '#f87171',
};

export default function ShareProgramScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [program, setProgram] = useState<CustomProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgram();
  }, [token]);

  async function fetchProgram() {
    if (!token) return;
    const { data, error } = await supabase
      .from('custom_programs')
      .select('id, name, emoji, description, level, duration_weeks, sessions_per_week, sessions, author_id')
      .eq('share_token', token)
      .maybeSingle();
    if (error || !data) {
      setError('Programme introuvable ou lien invalide.');
    } else {
      setProgram(data);
      // Vérifier si l'utilisateur a déjà ce programme
      if (session?.user) {
        const { data: existing } = await supabase
          .from('user_programs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('program_id', data.id)
          .eq('active', true)
          .maybeSingle();
        if (existing) setAdded(true);
      }
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!session?.user) {
      // Redirige vers login avec retour après
      router.push('/(auth)/login');
      return;
    }
    if (!program) return;
    setAdding(true);

    const total = program.sessions.length;
    const firstSession = program.sessions[0];

    // Crée une séance planifiée pour demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    let journalId: string | null = null;
    if (firstSession) {
      const sessionType = firstSession.type ?? 'renfo';
      const { data: journalData } = await supabase
        .from('sessions')
        .insert({
          user_id: session.user.id,
          date,
          type: sessionType,
          status: 'planned',
          source: 'program',
          visibility: 'private',
          notes: `[${program.name}] ${firstSession.title}`,
          data: buildSessionData(firstSession),
        })
        .select('id')
        .maybeSingle();
      journalId = journalData?.id ?? null;
    }

    const { error: dbErr } = await supabase.from('user_programs').insert({
      user_id: session.user.id,
      program_id: program.id,
      program_type: 'custom',
      sessions_done: 0,
      active: true,
      config: journalId ? { current_journal_id: journalId } : {},
    });

    setAdding(false);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setAdded(true);
    }
  }

  function buildSessionData(s: any) {
    if (s.type === 'renfo') return { movements: s.movements ?? [] };
    if (s.type === 'run') return s.run ?? {};
    if (s.type === 'crossfit') return s.crossfit ?? {};
    return {};
  }

  function copyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator?.clipboard) navigator.clipboard.writeText(url);
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#e85d04" size="large" />
      </View>
    );
  }

  if (error || !program) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="link-outline" size={48} color="#2a2a2a" />
        <Text style={{ color: '#888', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
          {error || 'Programme introuvable'}
        </Text>
      </View>
    );
  }

  const levelColor = LEVEL_COLOR[program.level] ?? '#888';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Badge partagé */}
      <View style={styles.sharedBadge}>
        <Ionicons name="share-social-outline" size={13} color="#e85d04" />
        <Text style={styles.sharedBadgeText}>Programme partagé</Text>
      </View>

      {/* Identité du programme */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>{program.emoji}</Text>
        <Text style={styles.heroName}>{program.name}</Text>
        {program.description && (
          <Text style={styles.heroDesc}>{program.description}</Text>
        )}
        <View style={styles.heroMeta}>
          <View style={[styles.tag, { borderColor: levelColor + '50' }]}>
            <Text style={[styles.tagText, { color: levelColor }]}>{program.level}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={11} color="#555" />
            <Text style={styles.metaChipText}>{program.duration_weeks} semaines</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color="#555" />
            <Text style={styles.metaChipText}>{program.sessions_per_week} séances/sem.</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="layers-outline" size={11} color="#555" />
            <Text style={styles.metaChipText}>{program.sessions.length} séances</Text>
          </View>
        </View>
      </View>

      {/* Aperçu des séances (3 premières) */}
      <Text style={styles.sectionLabel}>Aperçu des séances</Text>
      {program.sessions.slice(0, 5).map((s: any, i: number) => (
        <View key={i} style={styles.previewSession}>
          <Text style={styles.previewTitle}>{s.title}</Text>
          {s.type === 'renfo' && s.movements?.length > 0 && (
            <Text style={styles.previewDetail} numberOfLines={1}>
              {s.movements.map((m: any) => m.name).filter(Boolean).join(' · ')}
            </Text>
          )}
          {s.type === 'run' && s.run?.distance && (
            <Text style={styles.previewDetail}>{s.run.distance} km</Text>
          )}
          {s.type === 'crossfit' && s.crossfit?.description && (
            <Text style={styles.previewDetail} numberOfLines={1}>{s.crossfit.description}</Text>
          )}
        </View>
      ))}
      {program.sessions.length > 5 && (
        <Text style={styles.moreText}>+ {program.sessions.length - 5} séances…</Text>
      )}

      {/* CTA */}
      {added ? (
        <View style={styles.addedBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={styles.addedText}>
            Programme ajouté ! Première séance planifiée pour demain.
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
          {adding
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}>
                  {session ? 'Ajouter à mes programmes' : 'Se connecter pour ajouter'}
                </Text>
              </>
          }
        </TouchableOpacity>
      )}

      {/* Copier le lien */}
      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.copyBtn} onPress={copyLink}>
          <Ionicons name="copy-outline" size={15} color="#555" />
          <Text style={styles.copyBtnText}>Copier le lien de partage</Text>
        </TouchableOpacity>
      )}

      {error ? <Text style={{ color: '#f87171', textAlign: 'center', marginTop: 12 }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  sharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', marginBottom: 20,
    backgroundColor: '#1a0e00', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e85d0440',
  },
  sharedBadgeText: { color: '#e85d04', fontSize: 12, fontWeight: '700' },

  heroCard: {
    backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#1e1e1e',
    padding: 24, alignItems: 'center', gap: 10, marginBottom: 24,
  },
  heroEmoji: { fontSize: 48 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroDesc: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },

  sectionLabel: {
    color: '#333', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  previewSession: {
    backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#1e1e1e',
    padding: 12, marginBottom: 8,
  },
  previewTitle: { color: '#ddd', fontSize: 13, fontWeight: '700' },
  previewDetail: { color: '#555', fontSize: 12, marginTop: 3 },
  moreText: { color: '#333', fontSize: 12, textAlign: 'center', marginBottom: 8 },

  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a0a0a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  metaChipText: { color: '#555', fontSize: 11 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#e85d04', borderRadius: 14,
    paddingVertical: 16, marginTop: 24,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  addedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0a2116', borderRadius: 14, borderWidth: 1, borderColor: '#4ade8030',
    padding: 16, marginTop: 24,
  },
  addedText: { color: '#4ade80', fontSize: 14, fontWeight: '600', flex: 1 },

  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, padding: 12,
  },
  copyBtnText: { color: '#444', fontSize: 13 },
});
