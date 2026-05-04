import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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
          <StatCard
            icon="checkmark-circle-outline"
            value={stats.completedSessions}
            label="Séances"
            color="#4ade80"
          />
          <StatCard
            icon="flame-outline"
            value={stats.streak}
            label={stats.streak > 1 ? 'Jours de suite' : 'Jour de suite'}
            color="#e85d04"
          />
          <StatCard
            icon="barbell-outline"
            value={stats.activePrograms}
            label={stats.activePrograms > 1 ? 'Programmes' : 'Programme'}
            color="#a78bfa"
          />
        </View>
      ) : null}

      {/* ── Section paramètres ── */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>Compte</Text>

        <View style={styles.settingsCard}>
          <SettingRow icon="person-outline" label="Pseudo" value={displayName} />
          <View style={styles.settingDivider} />
          <SettingRow icon="mail-outline" label="Email" value={email} />
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

function StatCard({ icon, value, label, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={18} color="#555" />
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 20,
  },

  // Identité
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, marginBottom: 16,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1a0e00',
    borderWidth: 2, borderColor: '#e85d04',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { color: '#e85d04', fontSize: 22, fontWeight: '800' },
  identityInfo: { flex: 1, gap: 4 },
  displayName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emailText: { color: '#888', fontSize: 13 },

  // Stats
  statsLoading: { height: 90, justifyContent: 'center', alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row', gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1, backgroundColor: '#111',
    borderRadius: 14, borderWidth: 1, borderColor: '#1e1e1e',
    padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  statLabel: { color: '#777', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },

  // Settings
  settingsSection: { marginBottom: 24 },
  sectionLabel: {
    color: '#666', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: '#111', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingDivider: { height: 1, backgroundColor: '#161616', marginHorizontal: 16 },
  settingLabel: { color: '#777', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  settingValue: { color: '#ccc', fontSize: 14 },

  // Logout
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#111', borderRadius: 12,
    paddingVertical: 15, borderWidth: 1, borderColor: '#f8717125',
    marginBottom: 24,
  },
  logoutText: { color: '#f87171', fontWeight: '600', fontSize: 15 },

  version: { color: '#444', fontSize: 11, textAlign: 'center' },
});
