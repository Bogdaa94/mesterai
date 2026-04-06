import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { brand } from '../../theme/colors';

// ─── Google icon (SVG-free fallback cu text) ──────────────────────────────────

function GoogleLogo() {
  return (
    <Text style={{ fontSize: 18, fontWeight: '700', marginRight: 10, color: '#4285F4' }}>G</Text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const s = styles(colors);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Câmpuri incomplete', 'Introdu email și parolă.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Câmpuri incomplete', 'Introdu numele tău.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(name.trim(), email.trim(), password);
      }
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code);
      Alert.alert('Eroare', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      Alert.alert('Eroare', 'Autentificarea Google a eșuat.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoRow}>
          <Text style={s.logoText}>Mester</Text>
          <View style={s.dot} />
          <Text style={s.logoText}>AI</Text>
        </View>

        {/* Titlu */}
        <Text style={s.title}>Bun venit!</Text>
        <Text style={s.subtitle}>Rezolvăm orice problemă acasă</Text>

        {/* Câmp Nume (doar register) */}
        {mode === 'register' && (
          <TextInput
            style={s.input}
            placeholder="Numele tău"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        {/* Email */}
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Parolă */}
        <TextInput
          style={s.input}
          placeholder="Parolă"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />

        {/* Buton principal */}
        <TouchableOpacity style={s.btnPrimary} onPress={handleSubmit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnPrimaryText}>
              {mode === 'login' ? 'Intră în cont' : 'Creează cont'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Separator */}
        <View style={s.separatorRow}>
          <View style={s.separatorLine} />
          <Text style={s.separatorText}>sau</Text>
          <View style={s.separatorLine} />
        </View>

        {/* Google */}
        <TouchableOpacity style={s.btnGoogle} onPress={handleGoogle} disabled={busy}>
          <GoogleLogo />
          <Text style={s.btnGoogleText}>Continuă cu Google</Text>
        </TouchableOpacity>

        {/* Toggle */}
        <TouchableOpacity
          style={s.toggleRow}
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setName('');
            setEmail('');
            setPassword('');
          }}
        >
          <Text style={s.toggleText}>
            {mode === 'login'
              ? 'Nu ai cont? '
              : 'Ai cont? '}
            <Text style={s.toggleLink}>
              {mode === 'login' ? 'Înregistrează-te' : 'Intră'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function styles(colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) {
  return StyleSheet.create({
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    logoText: {
      fontFamily: 'Syne_800ExtraBold',
      fontSize: 32,
      color: colors.textPrimary,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: brand.orange,
      marginHorizontal: 3,
      marginBottom: 4,
    },
    title: {
      fontFamily: 'Syne_800ExtraBold',
      fontSize: 28,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    input: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: 'DMSans_400Regular',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    btnPrimary: {
      backgroundColor: brand.orange,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    btnPrimaryText: {
      fontFamily: 'Syne_700Bold',
      fontSize: 16,
      color: '#fff',
    },
    separatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    separatorText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      color: colors.textSecondary,
      marginHorizontal: 12,
    },
    btnGoogle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      marginBottom: 24,
    },
    btnGoogleText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 15,
      color: colors.textPrimary,
    },
    toggleRow: {
      alignItems: 'center',
    },
    toggleText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    toggleLink: {
      color: brand.orange,
      fontFamily: 'DMSans_500Medium',
    },
  });
}

// ─── Firebase error messages ──────────────────────────────────────────────────

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email sau parolă incorectă.';
    case 'auth/email-already-in-use':
      return 'Există deja un cont cu acest email.';
    case 'auth/weak-password':
      return 'Parola trebuie să aibă cel puțin 6 caractere.';
    case 'auth/invalid-email':
      return 'Adresa de email nu este validă.';
    case 'auth/too-many-requests':
      return 'Prea multe încercări. Încearcă mai târziu.';
    default:
      return 'A apărut o eroare. Încearcă din nou.';
  }
}
