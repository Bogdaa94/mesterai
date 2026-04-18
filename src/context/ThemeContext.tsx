import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dark, light } from '../theme/colors';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof dark;
  toggleTheme: () => void;
}

const THEME_KEY = 'app_theme_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode,   setMode]   = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  // Citim preferința din AsyncStorage înainte de primul render al UI-ului
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'light' || val === 'dark') setMode(val);
      setLoaded(true);
    });
  }, []);

  const toggleTheme = () =>
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });

  const colors = mode === 'dark' ? dark : light;

  // Nu randăm nimic până nu știm tema salvată — evităm flash-ul de culoare
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
