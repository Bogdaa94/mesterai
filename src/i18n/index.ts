import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

import ro from '../locales/ro.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import uk from '../locales/uk.json';
import it from '../locales/it.json';

// ── Constante ──────────────────────────────────────────────────────────────────

const LANGUAGE_KEY = 'app_language';

export const SUPPORTED_CODES = ['ro', 'en', 'fr', 'es', 'uk', 'it'] as const;
export type LanguageCode = (typeof SUPPORTED_CODES)[number];

export const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'ro', name: 'Română',      flag: '🇷🇴' },
  { code: 'en', name: 'English',     flag: '🇬🇧' },
  { code: 'fr', name: 'Français',    flag: '🇫🇷' },
  { code: 'es', name: 'Español',     flag: '🇪🇸' },
  { code: 'uk', name: 'Українська',  flag: '🇺🇦' },
  { code: 'it', name: 'Italiano',    flag: '🇮🇹' },
];

// ── Init ───────────────────────────────────────────────────────────────────────

export async function initI18n(): Promise<void> {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  // Limba dispozitivului (ex: "ro-RO" → "ro")
  const deviceLocale = Localization.getLocales?.()[0]?.languageCode
    ?? Localization.locale?.split('-')[0]
    ?? 'ro';

  const initialLanguage: string =
    savedLanguage ??
    (SUPPORTED_CODES.includes(deviceLocale as LanguageCode) ? deviceLocale : 'ro');

  await i18n.use(initReactI18next).init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      uk: { translation: uk },
      it: { translation: it },
    },
    lng: initialLanguage,
    fallbackLng: 'ro',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

// ── Schimbare limbă ────────────────────────────────────────────────────────────

export async function changeLanguage(
  code: LanguageCode,
  userId?: string
): Promise<void> {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_KEY, code);

  // Sync cross-device în Firestore (opțional, dacă user e logat)
  if (userId) {
    try {
      await updateDoc(doc(db, 'users', userId, 'preferences', 'settings'), {
        language: code,
      });
    } catch {
      // Ignorăm dacă documentul nu există — se va crea la prima preferință
    }
  }
}

// ── Utilitar ───────────────────────────────────────────────────────────────────

export function getCurrentLanguage(): LanguageCode {
  return (i18n.language ?? 'ro') as LanguageCode;
}

export function getLanguageInfo(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export default i18n;
