import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';

type Props = {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title?: string;
  subtitle?: string;
};

export default function LoginGate({
  icon = 'lock-closed-outline',
  title = 'Connexion requise',
  subtitle = 'Connecte-toi pour accéder à cette section.',
}: Props) {
  const router = useRouter();
  const { theme: c } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: c.orange + '10', borderColor: c.orange + '28' }]}>
        <Ionicons name={icon} size={34} color={c.orange} />
      </View>

      <Text style={[styles.title, { color: c.t1 }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: c.t2 }]}>{subtitle}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: c.orange }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signupBtn, { backgroundColor: c.surf, borderColor: c.border }]}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={[styles.signupBtnText, { color: c.t2 }]}>Créer un compte gratuit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 0,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#f2631810',
    borderWidth: 1, borderColor: '#f2631828',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#eaeaf6', fontSize: 22, fontWeight: '800',
    letterSpacing: -0.5, textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#7272a0', fontSize: 14, textAlign: 'center',
    lineHeight: 21, marginBottom: 32,
  },
  actions: { width: '100%', gap: 10 },
  loginBtn: {
    backgroundColor: '#f26318', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  loginBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  signupBtn: {
    backgroundColor: '#0e0e1d', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e1e36',
  },
  signupBtnText: { color: '#7272a0', fontWeight: '700', fontSize: 14 },
});
