import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'journal-outline' as const,
    color: '#60a5fa',
    title: 'Journal d\'entraînement',
    desc: 'Enregistre chaque séance — run, CrossFit, renfo.',
  },
  {
    icon: 'trophy-outline' as const,
    color: '#facc15',
    title: 'Records personnels',
    desc: 'Suivi automatique de tes PRs force, course et CrossFit.',
  },
  {
    icon: 'barbell-outline' as const,
    color: '#a78bfa',
    title: 'Programmes guidés',
    desc: 'Wendler 5/3/1, plan 5K/10K, calisthenics… et plus.',
  },
  {
    icon: 'analytics-outline' as const,
    color: '#4ade80',
    title: 'Progression visible',
    desc: 'Historique, statistiques, séries de jours consécutifs.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Logo / hero ── */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🏋️</Text>
        </View>
        <Text style={styles.appName}>SpoRunFit</Text>
        <Text style={styles.tagline}>Ton journal sportif personnel</Text>
      </View>

      {/* ── Features ── */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
              <Ionicons name={f.icon} size={20} color={f.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── CTA ── */}
      <View style={styles.ctas}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupBtn}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.signupBtnText}>Créer un compte gratuit</Text>
        </TouchableOpacity>

        <Text style={styles.browseHint}>
          👇 Continue à naviguer pour explorer l'app
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#07070e' },
  container: {
    paddingTop: 72, paddingHorizontal: 24,
    paddingBottom: 40, gap: 0,
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#f2631812', borderWidth: 1, borderColor: '#f2631830',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 38 },
  appName: {
    fontSize: 36, fontWeight: '900', color: '#eaeaf6',
    letterSpacing: -1.5, marginBottom: 8,
  },
  tagline: { color: '#7272a0', fontSize: 15, fontWeight: '500' },

  // Features
  features: {
    gap: 14, marginBottom: 36,
    backgroundColor: '#0e0e1d',
    borderRadius: 20, borderWidth: 1, borderColor: '#1e1e36',
    padding: 20,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { color: '#eaeaf6', fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  featureDesc: { color: '#7272a0', fontSize: 12, lineHeight: 18 },

  // CTAs
  ctas: { gap: 10 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f26318', borderRadius: 14,
    paddingVertical: 16,
  },
  loginBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  signupBtn: {
    backgroundColor: '#0e0e1d', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e1e36',
  },
  signupBtnText: { color: '#7272a0', fontWeight: '700', fontSize: 14 },
  browseHint: {
    color: '#3d3d5e', fontSize: 12, textAlign: 'center',
    marginTop: 6, fontStyle: 'italic',
  },
});
