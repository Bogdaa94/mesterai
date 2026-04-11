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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../firebase/config';
import { createUserProfile, deleteUserData, getUserProfile, updateLastActive } from '../firebase/firestore';

// ── Configurare Google Sign-In ────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId: '14861675685-9rjgp8ukmg8ll0offp1mf7ej1mbe8udo.apps.googleusercontent.com',
  iosClientId: '14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla.apps.googleusercontent.com',
  offlineAccess: true,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        updateLastActive(firebaseUser.uid);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Email/Parolă ────────────────────────────────────────────────────────────

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
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) throw new Error('Nu s-a obținut token Google.');

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      // Creează profilul Firestore dacă e user nou
      const existing = await getUserProfile(result.user.uid);
      if (!existing) {
        await createUserProfile(
          result.user.uid,
          result.user.displayName ?? 'Utilizator',
          result.user.email ?? '',
          'google'
        );
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Eroare', 'Google Play Services nu este disponibil.');
        return;
      }
      console.error('Google Sign-In error:', error);
      Alert.alert('Eroare Google', error.message || 'Autentificarea Google a eșuat.');
      throw error;
    }
  };

  // ── Sign Out ────────────────────────────────────────────────────────────────

  const signOut = async () => {
    try {
      await GoogleSignin.signOut().catch(() => {}); // ignoră dacă nu e sesiune Google
    } catch {}
    await firebaseSignOut(auth);
  };

  // ── Delete Account ──────────────────────────────────────────────────────────

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      await deleteUserData(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
    } catch (error: any) {
      // Firebase necesită re-autentificare recentă
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Autentificare necesară',
          'Te rog deconectează-te și reconectează-te, apoi încearcă din nou ștergerea contului.'
        );
      } else {
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
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
