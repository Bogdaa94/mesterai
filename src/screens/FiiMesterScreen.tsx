import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { db } from '../firebase/config';

// ── Types ──────────────────────────────────────────────────────────────────────

const CATEGORII = ['Sanitare', 'Electric', 'Construcții', 'Grădină', 'Mobilă', 'Altele'] as const;
type Categorie = typeof CATEGORII[number];

// ── Main screen ────────────────────────────────────────────────────────────────

export default function FiiMesterScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [nume, setNume] = useState('');
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [oras, setOras] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [descriere, setDescriere] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = !!nume.trim() && !!categorie && !!oras.trim() && !!whatsapp.trim();

  const handleSubmit = async () => {
    if (!isValid || !user) return;

    const payload = {
      userId: user.uid,
      email: user.email ?? '',
      nume: nume.trim(),
      categorie,
      oras: oras.trim(),
      whatsapp: whatsapp.trim(),
      descriere: descriere.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    console.log('[FiiMester] trimit la Firestore:', JSON.stringify({
      ...payload,
      createdAt: '<serverTimestamp>',
    }, null, 2));

    setLoading(true);
    try {
      await addDoc(collection(db, 'mesteri_aplicatii'), payload);
      setSubmitted(true);
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Eroare trimitere cerere mester:', error);
      Alert.alert('Eroare', error.message || 'Eroare necunoscută');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.successRoot, { backgroundColor: colors.bgPage }]}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
          Cerere trimisă!
        </Text>
        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          Îți vom răspunde în 24-48 de ore la adresa de email asociată contului tău.
          Bine ai venit în echipa Mester AI! 🔧
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bgPage }]}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Înregistrează-te ca Meșter 🔧
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Completează formularul și te contactăm pentru verificare.
        </Text>

        {/* Câmp: Nume */}
        <FieldLabel label="Nume complet *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: Ion Popescu"
          placeholderTextColor={colors.textSecondary}
          value={nume}
          onChangeText={setNume}
          autoCapitalize="words"
        />

        {/* Câmp: Categorie */}
        <FieldLabel label="Categorie *" colors={colors} />
        <View style={styles.categoriiGrid}>
          {CATEGORII.map(c => {
            const active = categorie === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.categorieBtn,
                  {
                    backgroundColor: active ? brand.orange : colors.bgCard,
                    borderColor: active ? brand.orange : colors.border,
                  },
                ]}
                onPress={() => setCategorie(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categorieBtnText, { color: active ? '#fff' : colors.textPrimary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Câmp: Oraș */}
        <FieldLabel label="Oraș / Zonă *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: București, Sector 2"
          placeholderTextColor={colors.textSecondary}
          value={oras}
          onChangeText={setOras}
        />

        {/* Câmp: WhatsApp */}
        <FieldLabel label="Număr WhatsApp *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: 0712 345 678"
          placeholderTextColor={colors.textSecondary}
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />

        {/* Câmp: Descriere */}
        <FieldLabel label="Descriere scurtă" colors={colors} />
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Descrie experiența ta, specializările și zona în care activezi..."
          placeholderTextColor={colors.textSecondary}
          value={descriere}
          onChangeText={setDescriere}
          multiline
          numberOfLines={4}
          maxLength={400}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.textSecondary }]}>{descriere.length}/400</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || loading) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Trimite cererea</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          * Câmpuri obligatorii. Datele tale sunt procesate conform Politicii de Confidențialitate.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Field label helper ─────────────────────────────────────────────────────────

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },

  fieldLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 16,
  },
  textArea: { height: 110, paddingTop: 12 },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },

  categoriiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categorieBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  categorieBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },

  submitBtn: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
  },
  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Success state
  successRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontFamily: 'Syne_700Bold', fontSize: 24, marginBottom: 12, textAlign: 'center' },
  successSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
