import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { auth } from '../firebase/config';
import {
  createUserProfile,
  deleteUserData,
  getUserProfile,
  updateLastActive,
} from '../firebase/firestore';

// ── Detecție mediu ────────────────────────────────────────────────────────────
//
// Constants.appOwnership === 'expo'  → rulează în Expo Go
// null / 'standalone'               → build EAS (production sau development build)

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Client IDs Google OAuth
const WEB_CLIENT_ID = '14861675685-9rjgp8ukmg8ll0offp1mf7ej1mbe8udo.apps.googleusercontent.com';
const IOS_CLIENT_ID = '14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla.apps.googleusercontent.com';

// ── Modul nativ — încărcat DOAR în EAS Build ──────────────────────────────────
//
// @react-native-google-signin/google-signin conține modulul nativ RNGoogleSignin
// care nu există în Expo Go și cauzează crash la import.
// Soluție: require() condiționat, evaluat la runtime după detecția mediului.

let NativeSignin:          any                               = null;
let nativeStatusCodes:     Record<string, string>            = {};
let nativeIsErrorWithCode: (err: unknown) => boolean         = () => false;

if (!IS_EXPO_GO) {
  const gsi          = require('@react-native-google-signin/google-signin');
  NativeSignin            = gsi.GoogleSignin;
  nativeStatusCodes       = gsi.statusCodes;
  nativeIsErrorWithCode   = gsi.isErrorWithCode;

  // Configurare o singură dată — trebuie apelat înainte de orice SignIn
  NativeSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: '14861675685-4jlj0ub1789rn0e0s2pk6vc291jpqpm1.apps.googleusercontent.com',
  });
}

// Necesar pentru ca expo-web-browser să poată finaliza redirect-ul în Expo Go
WebBrowser.maybeCompleteAuthSession();

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:               User | null;
  loading:            boolean;
  googleRequestReady: boolean;
  signInWithEmail:    (email: string, password: string) => Promise<void>;
  signUpWithEmail:    (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle:   () => Promise<void>;
  signOut:            () => Promise<void>;
  deleteAccount:      () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── expo-auth-session hook ─────────────────────────────────────────────────
  //
  // OBLIGATORIU apelat necondiționat (rules of hooks).
  // În EAS Build, promptAsync() nu va fi niciodată chemat,
  // deci hook-ul rulează fără efect vizibil.
  //
  // SETUP NECESAR pentru Google Sign-In în Expo Go:
  //   1. În Google Cloud Console → Credentials → iOS OAuth client →
  //      adaugă "com.mesterai.app:/oauthredirect" la Authorized redirect URIs
  //   2. Sau creează un OAuth client de tip "Web application" cu redirect URI
  //      generat de makeRedirectUri() afișat în consolă la prima rulare.

  const [expoRequest, expoResponse, expoPromptAsync] = Google.useAuthRequest({
    iosClientId:  IOS_CLIENT_ID,
    webClientId:  WEB_CLIENT_ID,
    // androidClientId: opțional — folosim webClientId ca fallback
    scopes: ['profile', 'email'],
  });

  // ── Gestionare răspuns expo-auth-session (Expo Go) ─────────────────────────
  useEffect(() => {
    if (!IS_EXPO_GO) return;
    if (expoResponse?.type !== 'success') return;

    // expo-auth-session v7 face auto-exchange PKCE și populează `authentication`
    const idToken     = expoResponse.authentication?.idToken
                     ?? (expoResponse as any).params?.id_token
                     ?? null;
    const accessToken = expoResponse.authentication?.accessToken
                     ?? (expoResponse as any).params?.access_token
                     ?? null;

    if (!idToken && !accessToken) {
      Alert.alert('Eroare', 'Google Sign-In: token lipsă după autentificare.');
      return;
    }

    (async () => {
      try {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const result     = await signInWithCredential(auth, credential);

        const existing = await getUserProfile(result.user.uid);
        if (!existing) {
          await createUserProfile(
            result.user.uid,
            result.user.displayName ?? 'Utilizator',
            result.user.email ?? '',
            'google'
          );
        }
      } catch (err: any) {
        Alert.alert('Eroare Google', err?.message ?? 'Autentificarea Google a eșuat.');
      }
    })();
  }, [expoResponse]);

  // ── Firebase auth state ────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) updateLastActive(firebaseUser.uid);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Email / Parolă ─────────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await createUserProfile(result.user.uid, name, email, 'email');
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────

  const signInWithGoogle = async () => {
    if (IS_EXPO_GO) {
      // Expo Go: deschide browser via expo-auth-session
      // Rezultatul revine asincron prin useEffect-ul de mai sus (expoResponse)
      await expoPromptAsync();
      return;
    }

    // EAS Build: @react-native-google-signin (nativ, fără browser)
    if (Platform.OS === 'android') {
      await NativeSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await NativeSignin.signIn();

    // Suport ambele forme de răspuns: v6–v12 și v13+
    const idToken: string | null =
      response?.idToken ??
      response?.data?.idToken ??
      null;

    if (!idToken) throw new Error('Google Sign-In: lipsă idToken.');

    const credential = GoogleAuthProvider.credential(idToken);
    const result     = await signInWithCredential(auth, credential);

    const existing = await getUserProfile(result.user.uid);
    if (!existing) {
      await createUserProfile(
        result.user.uid,
        result.user.displayName ?? 'Utilizator',
        result.user.email ?? '',
        'google'
      );
    }
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────

  const signOut = async () => {
    if (!IS_EXPO_GO) {
      // Curăță contul selectat pe Android (ignorăm erorile)
      try { await NativeSignin.signOut(); } catch {}
    }
    await firebaseSignOut(auth);
  };

  // ── Delete Account ─────────────────────────────────────────────────────────

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      await deleteUserData(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Autentificare necesară',
          'Deconectează-te și reconectează-te, apoi încearcă din nou.'
        );
      } else {
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      // În Expo Go: butonul Google e activ abia după ce request-ul e pregătit
      // În EAS Build: SDK-ul nativ e mereu gata
      googleRequestReady: IS_EXPO_GO ? !!expoRequest : true,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Google Sign-In error helper ───────────────────────────────────────────────
//
// Folosit din AuthScreen pentru a traduce erorile native în mesaje UI.
// În Expo Go, erorile OAuth sunt gestionate prin Alert în useEffect.

export function googleSignInErrorMessage(error: unknown): string {
  if (IS_EXPO_GO) return 'Autentificarea Google a eșuat în Expo Go.';
  if (!nativeIsErrorWithCode(error)) return 'Eroare necunoscută Google Sign-In.';
  switch ((error as any).code) {
    case nativeStatusCodes.SIGN_IN_CANCELLED:
      return '';
    case nativeStatusCodes.IN_PROGRESS:
      return 'Autentificarea este deja în curs.';
    case nativeStatusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services indisponibil pe acest dispozitiv.';
    default:
      return 'Autentificarea Google a eșuat. Încearcă din nou.';
  }
}
