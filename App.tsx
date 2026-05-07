import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';
import {
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { ProProvider } from './src/context/ProContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initI18n } from './src/i18n';
import { brand } from './src/theme/colors';

// Previne ascunderea automată a splash-ului nativ până când fonturile sunt gata.
// Pe Android production, fără acest apel splash-ul dispare înainte ca JS-ul
// să fie pregătit → ecran negru.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

// Culoare de fundal fixă folosită în fallback-uri (înainte de ThemeProvider)
const FALLBACK_BG = '#1C1C1E';

// ── I18n loader ───────────────────────────────────────────────────────────────

function useI18nReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().then(() => setReady(true)).catch(() => setReady(true));
  }, []);
  return ready;
}

// ── App content ───────────────────────────────────────────────────────────────

function AppContent() {
  const { mode, colors } = useTheme();
  const i18nReady = useI18nReady();

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  // Ascunde splash-ul nativ odată ce fonturile sunt gata.
  // Fără hideAsync(), pe Android splash-ul rămâne sau dispare prea devreme.
  useEffect(() => {
    if (fontsLoaded) {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Timeout de siguranță — ascunde splash-ul după maxim 5s
  // dacă fonturile nu se termină de încărcat (edge case Android production)
  useEffect(() => {
    const timer = setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Returnează fundal solid — nu `null` — ca să evităm ecranul negru pe Android
  // în timp ce fonturile se încarcă.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: FALLBACK_BG }} />;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <ProProvider>
          <AppContent />
        </ProProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
