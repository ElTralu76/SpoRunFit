import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useTheme, ThemeColors } from '../../lib/ThemeContext';
import LoginGate from '../../components/LoginGate';

type Stats = {
  totalSessions: number;
  completedSessions: number;
  activePrograms: number;
  streak: number;
};

function getInitials(name: string): string {
  return name
    .split(/[\s@_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates]
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort()
    .reverse();
  const unique = [...new Set(sorted)];
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let current = today;
  for (const d of unique) {
    if (d === current) {
      streak++;
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      current = prev.toISOString().split('T')[0];
    } else if (d < current) {
      break;
    }
  }
  return streak;
}

export default function ProfileScreen() {
  const { session } = useAuth();
  const { theme, isDark, toggle } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const displayName = session?.user?.user_metadata?.display_name
    ?? session?.user?.email?.split('@')[0]
    ?? 'Athlète';
  const email = session?.user?.email ?? '';
  const initials = getInitials(displayName);

  useFocusEffect(
    useCallback(() => { fetchStats(); }, [session])
  );

  async function fetchStats() {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);

    const [sessionsRes, programsRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('date, status')
        .eq('user_id', session.user.id),
      supabase
        .from('user_programs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('active', true),
    ]);

    const allSessions = sessionsRes.data ?? [];
    const completed = allSessions.filter(s => s.status === 'completed');
    const streak = computeStreak(completed.map(s => s.date));

    setStats({
      totalSessions:   allSessions.length,
      completedSessions: completed.length,
      activePrograms:  (programsRes.data ?? []).length,
      streak,
    });
    setLoading(false);
  }

  async function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Te déconnecter de SpoRunFit ?')) {
        await supabase.auth.signOut();
      }
    } else {
      Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ]);
    }
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Profil</Text>
        <LoginGate
          icon="person-circle-outline"
          title="Ton espace perso"
          subtitle="Connecte-toi pour accéder à ton profil, tes statistiques et tes programmes en cours."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profil</Text>

      {/* ── Avatar + identité ── */}
      <View style={styles.identityCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.identityInfo}>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>
      </View>

      {/* ── Stats ── */}
      {loading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator color="#e85d04" size="small" />
        </View>
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard icon="checkmark-circle-outline" value={stats.completedSessions} label="Séances"    color="#4ade80" theme={theme} />
          <StatCard icon="flame-outline"             value={stats.streak}            label={stats.streak > 1 ? 'Jours de suite' : 'Jour de suite'} color="#f26318" theme={theme} />
          <StatCard icon="barbell-outline"           value={stats.activePrograms}    label={stats.activePrograms > 1 ? 'Programmes' : 'Programme'}  color="#a78bfa" theme={theme} />
        </View>
      ) : null}

      {/* ── Section paramètres ── */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="person-outline" label="Pseudo" value={displayName} theme={theme} />
          <View style={styles.settingDivider} />
          <SettingRow icon="mail-outline" label="Email" value={email} theme={theme} />
        </View>
      </View>

      {/* ── Apparence ── */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>Apparence</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.themeRow} onPress={toggle}>
            <View style={styles.themeLeft}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={18} color={theme.t2}
              />
              <View>
                <Text style={styles.settingLabel}>Thème</Text>
                <Text style={styles.settingValue}>{isDark ? 'Sombre' : 'Clair'}</Text>
              </View>
            </View>
            <View style={[styles.toggleTrack, isDark ? styles.toggleTrackOn : styles.toggleTrackOff]}>
              <View style={[styles.toggleThumb, isDark ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Déconnexion ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#f87171" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SpoRunFit · v1.0</Text>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────

function StatCard({ icon, value, label, color, theme }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  color: string;
  theme: ThemeColors;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({ icon, label, value, theme }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  theme: ThemeColors;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={18} color={theme.t2} />
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles dynamiques ────────────────────────────────────

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingTop: 56, paddingHorizontal: 16 },
    header: { fontSize: 32, fontWeight: '900', color: c.t1, letterSpacing: -1, marginBottom: 22 },

    identityCard: {
      flexDirection: 'row', alignItems: 'center', gap: 18,
      backgroundColor: c.surf, borderRadius: 18,
      borderWidth: 1, borderColor: c.border,
      padding: 18, marginBottom: 16,
    },
    avatarCircle: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: c.orange + '12',
      borderWidth: 2, borderColor: c.orange,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarInitials: { color: c.orange, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
    identityInfo: { flex: 1, gap: 5 },
    displayName: { color: c.t1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    emailText: { color: c.t2, fontSize: 13 },

    statsLoading: { height: 96, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: {
      flex: 1, backgroundColor: c.surf,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, alignItems: 'center', gap: 4,
    },
    statValue: { fontSize: 28, fontWeight: '900', lineHeight: 32, letterSpacing: -1 },
    statLabel: {
      color: c.t3, fontSize: 9, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 1,
      textAlign: 'center', lineHeight: 13,
    },

    settingsSection: { marginBottom: 22 },
    sectionLabel: {
      color: c.t3, fontSize: 10, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
    },
    settingsCard: {
      backgroundColor: c.surf, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 18, paddingVertical: 15,
    },
    settingDivider: { height: 1, backgroundColor: c.border, marginHorizontal: 18 },
    settingLabel: { color: c.t3, fontSize: 10, fontWeight: '700', marginBottom: 3, letterSpacing: 0.5 },
    settingValue: { color: c.t1, fontSize: 14, fontWeight: '500' },

    // Toggle thème
    themeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 15,
    },
    themeLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    toggleTrack: {
      width: 46, height: 26, borderRadius: 13,
      padding: 2, justifyContent: 'center',
    },
    toggleTrackOn:  { backgroundColor: c.orange },
    toggleTrackOff: { backgroundColor: c.border2 },
    toggleThumb: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: '#fff',
    },
    toggleThumbLeft:  { alignSelf: 'flex-start' },
    toggleThumbRight: { alignSelf: 'flex-end' },

    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, backgroundColor: '#f8717110', borderRadius: 14,
      paddingVertical: 16, borderWidth: 1, borderColor: '#f8717128', marginBottom: 24,
    },
    logoutText: { color: '#f87171', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
    version: { color: c.t3, fontSize: 11, textAlign: 'center', letterSpacing: 0.5 },
  });
}
