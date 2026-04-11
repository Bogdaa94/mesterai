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
import { Alert } from 'react-native';

// TODO: înlocuiește cu @react-native-google-signin/google-signin în producție
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { auth } from '../firebase/config';
import { createUserProfile, deleteUserData, getUserProfile, updateLastActive } from '../firebase/firestore';

// Necesar pentru expo-auth-session pe iOS
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  googleRequestReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Google Auth Request (expo-auth-session) ─────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla.apps.googleusercontent.com',
    webClientId: '14861675685-9rjgp8ukmg8ll0offp1mf7ej1mbe8udo.apps.googleusercontent.com',
  });

  // Procesează răspunsul Google după redirect
  useEffect(() => {
    if (response?.type !== 'success') return;

    const { id_token } = response.params;
    if (!id_token) return;

    const credential = GoogleAuthProvider.credential(id_token);
    signInWithCredential(auth, credential)
      .then(async (result) => {
        const existing = await getUserProfile(result.user.uid);
        if (!existing) {
          await createUserProfile(
            result.user.uid,
            result.user.displayName ?? 'Utilizator',
            result.user.email ?? '',
            'google'
          );
        }
      })
      .catch((err) => {
        console.error('Google credential error:', err);
        Alert.alert('Eroare', 'Autentificarea Google a eșuat. Încearcă din nou.');
      });
  }, [response]);

  // ── Auth state listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) updateLastActive(firebaseUser.uid);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Email / Parolă ──────────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await createUserProfile(result.user.uid, name, email, 'email');
  };

  // ── Google Sign-In ──────────────────────────────────────────────────────────

  const signInWithGoogle = async () => {
    await promptAsync();
  };

  // ── Sign Out ────────────────────────────────────────────────────────────────

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // ── Delete Account ──────────────────────────────────────────────────────────

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
      user, loading,
      googleRequestReady: !!request,
      signInWithEmail, signUpWithEmail,
      signInWithGoogle,
      signOut, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
