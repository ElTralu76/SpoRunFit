import { useEffect } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Forcer le titre du navigateur à toujours afficher "SpoRunFit" sur web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'SpoRunFit';
    }
  }, [segments]); // se relance à chaque changement de route

  useEffect(() => {
    // Attendre que la navigation soit prête ET que l'auth soit résolue
    if (!navState?.key || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Si connecté et sur une page auth → on renvoie vers l'app
    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
    // Si non connecté → on laisse naviguer librement (pas de redirection forcée)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, navState?.key]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07070e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#f26318" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="import-csv" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+html" options={{ headerShown: false }} />
    </Stack>
  );
}
