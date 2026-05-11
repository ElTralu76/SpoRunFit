import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sporunfit_theme';

// ─── Couleurs ─────────────────────────────────────────────

export type ThemeColors = {
  bg: string;
  surf: string;
  surf2: string;
  border: string;
  border2: string;
  t1: string;     // texte principal
  t2: string;     // secondaire
  t3: string;     // tertiaire / disabled
  orange: string;
  tabBg1: string; // gradient tab bar haut
  tabBg2: string; // gradient tab bar bas
  tabBorder: string;
  tabInactive: string;
  isDark: boolean;
};

export const DARK: ThemeColors = {
  bg:         '#07070e',
  surf:       '#0e0e1d',
  surf2:      '#141428',
  border:     '#1e1e36',
  border2:    '#2a2a48',
  t1:         '#eaeaf6',
  t2:         '#7272a0',
  t3:         '#3d3d5e',
  orange:     '#f26318',
  tabBg1:     '#0c0c1e',
  tabBg2:     '#07070e',
  tabBorder:  '#1a1a30',
  tabInactive:'#383858',
  isDark: true,
};

export const LIGHT: ThemeColors = {
  bg:         '#f2f2f8',
  surf:       '#ffffff',
  surf2:      '#e8e8f2',
  border:     '#e0e0ee',
  border2:    '#c8c8dc',
  t1:         '#0e0e1e',
  t2:         '#6868a0',
  t3:         '#aeaec8',
  orange:     '#f26318',
  tabBg1:     '#f8f8fc',
  tabBg2:     '#eeeeF6',
  tabBorder:  '#e0e0ee',
  tabInactive:'#aeaec0',
  isDark: false,
};

// ─── Context ──────────────────────────────────────────────

type ThemeContextType = {
  theme: ThemeColors;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: DARK,
  isDark: true,
  toggle: () => {},
});

// ─── Provider ─────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let stored: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          stored = localStorage.getItem(STORAGE_KEY);
        } else {
          stored = await AsyncStorage.getItem(STORAGE_KEY);
        }
        if (stored === 'light') setIsDark(false);
      } catch {}
      setReady(true);
    })();
  }, []);

  async function toggle() {
    const next = !isDark;
    setIsDark(next);
    try {
      const val = next ? 'dark' : 'light';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, val);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, val);
      }
    } catch {}
  }

  const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  // Éviter le flash en attendant la préférence stockée
  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}
