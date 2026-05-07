import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { LANGUAGES, LanguageCode, changeLanguage } from '../i18n';
import {
  saveUserLocation,
  setLocationDisabled,
  setOnboardingCompleted,
} from '../firebase/firestore';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OnboardingScreenProps {
  userId:     string;
  onComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ userId, onComplete }: OnboardingScreenProps) {
  const { colors }              = useTheme();
  const insets                  = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [selectedLang, setSelectedLang] = useState<LanguageCode>('ro');
  const [currentStep, setCurrentStep]   = useState<1 | 2>(1);
  const [locLoading, setLocLoading]     = useState(false);
  const [saving, setSaving]             = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Slide to step ────────────────────────────────────────────────────────

  const goToStep2 = async () => {
    await changeLanguage(selectedLang, userId);
    setCurrentStep(2);
    Animated.timing(slideAnim, {
      toValue:        -SCREEN_WIDTH,
      duration:       320,
      useNativeDriver: true,
    }).start();
  };

  const goToStep1 = () => {
    setCurrentStep(1);
    Animated.timing(slideAnim, {
      toValue:        0,
      duration:       320,
      useNativeDriver: true,
    }).start();
  };

  // ── Finish ───────────────────────────────────────────────────────────────

  const finish = async (withLocation: boolean, lat?: number, lng?: number) => {
    setSaving(true);
    try {
      if (withLocation && lat != null && lng != null) {
        await saveUserLocation(userId, lat, lng);
      } else {
        await setLocationDisabled(userId);
      }
      await setOnboardingCompleted(userId);
      onComplete();
    } catch {
      Alert.alert('Eroare', 'A apărut o problemă. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  // ── Use location ─────────────────────────────────────────────────────────

  const handleUseLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Locație dezactivată',
          'Activează locația din Setări pentru a găsi meșteri din zona ta.',
          [
            { text: 'Mai târziu', onPress: () => finish(false) },
            { text: 'OK' },
          ]
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await finish(true, loc.coords.latitude, loc.coords.longitude);
    } catch {
      await finish(false);
    } finally {
      setLocLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage, paddingTop: insets.top }]}>

      {/* Back button — only on step 2 */}
      <View style={styles.topBar}>
        {currentStep === 2 ? (
          <TouchableOpacity
            onPress={goToStep1}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: brand.orange }]} />
          <View style={[
            styles.dot,
            { backgroundColor: currentStep === 2 ? brand.orange : colors.border },
          ]} />
        </View>

        <View style={{ width: 24 }} />
      </View>

      {/* Slide container */}
      <View style={[styles.slideOuter, { width: SCREEN_WIDTH }]}>
        <Animated.View
          style={[
            styles.slideInner,
            { width: SCREEN_WIDTH * 2, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* ── STEP 1: Language ─────────────────────────────────────────── */}
          <View style={[styles.step, { width: SCREEN_WIDTH }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              În ce limbă preferi?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Poți schimba oricând din Profil
            </Text>

            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => {
                const active = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langCard,
                      {
                        backgroundColor: active ? brand.orange : colors.bgCard,
                        borderColor:     active ? brand.orange : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedLang(lang.code)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.langName,
                      { color: active ? '#fff' : colors.textPrimary },
                    ]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={goToStep2}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continuă →</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 2: Location ─────────────────────────────────────────── */}
          <View style={[styles.step, { width: SCREEN_WIDTH }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              De unde ești?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Te ajutăm să găsești meșteri din zona ta
            </Text>

            <View style={styles.locationIllustration}>
              <Text style={styles.locationEmoji}>📍</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: locLoading || saving ? 0.6 : 1 }]}
              onPress={handleUseLocation}
              disabled={locLoading || saving}
              activeOpacity={0.85}
            >
              {locLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>📍 Folosește locația mea</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.skipBtn, { opacity: locLoading || saving ? 0.4 : 1 }]}
              onPress={() => finish(false)}
              disabled={locLoading || saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color={colors.textSecondary} size="small" />
              ) : (
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                  Completez mai târziu
                </Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.locationNote, { color: colors.textSecondary }]}>
              Locația nu este stocată permanent și nu este partajată cu terți.
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={{ height: insets.bottom + 16 }} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical:   12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap:           8,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },

  slideOuter: {
    flex:     1,
    overflow: 'hidden',
  },
  slideInner: {
    flex:          1,
    flexDirection: 'row',
  },
  step: {
    flex:              1,
    paddingHorizontal: 28,
    paddingTop:        24,
    gap:               16,
  },

  title: {
    fontFamily: 'Syne_700Bold',
    fontSize:   28,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   15,
    lineHeight: 21,
    marginTop:  -6,
  },

  // ── Language grid ────────────────────────────────────────────────────────
  langGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            12,
    marginTop:       8,
  },
  langCard: {
    width:          '47%',
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingVertical:   14,
    paddingHorizontal: 16,
    borderRadius:   14,
    borderWidth:    1.5,
  },
  langFlag: {
    fontSize: 22,
  },
  langName: {
    fontFamily: 'DMSans_500Medium',
    fontSize:   14,
    flex:       1,
  },

  // ── Location step ────────────────────────────────────────────────────────
  locationIllustration: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  locationEmoji: {
    fontSize: 72,
  },
  locationNote: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   11,
    textAlign:  'center',
    lineHeight: 16,
    paddingHorizontal: 12,
    marginTop:  -4,
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: brand.orange,
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       8,
  },
  primaryBtnText: {
    fontFamily: 'Syne_700Bold',
    fontSize:   16,
    color:      '#fff',
  },
  skipBtn: {
    alignItems:  'center',
    paddingVertical: 10,
  },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   14,
    textDecorationLine: 'underline',
  },
});
