import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { RootStackParamList, MesteriFormData } from '../navigation/AppNavigator';

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORII = ['Sanitare', 'Electric', 'Construcții', 'Grădină', 'Mobilă'] as const;
type Categorie = typeof CATEGORII[number];

type NavProp = StackNavigationProp<RootStackParamList, 'FiiMester'>;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FormularMesterScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [name,        setName]        = useState('');
  const [category,    setCategory]    = useState<Categorie | null>(null);
  const [localitate,  setLocalitate]  = useState('');
  const [judet,       setJudet]       = useState('');
  const [whatsapp,    setWhatsapp]    = useState('');
  const [description, setDescription] = useState('');

  const descriptionTrimmed = description.trim();
  const isValid =
    name.trim().length >= 3 &&
    !!category &&
    localitate.trim().length >= 2 &&
    judet.trim().length >= 2 &&
    whatsapp.trim().length >= 9 &&
    descriptionTrimmed.length >= 50;

  const handleContinua = () => {
    if (!isValid || !category) return;
    const formData: MesteriFormData = {
      name:        name.trim(),
      category,
      location:    `${localitate.trim()}, ${judet.trim()}`,
      whatsapp:    whatsapp.trim(),
      description: descriptionTrimmed,
    };
    navigation.navigate('MesteriPolitica', { formData });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: colors.bgNav,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
        },
      ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Înregistrare Meșter
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Completează datele de profil. Vor fi vizibile utilizatorilor Pro din zona ta.
        </Text>

        {/* Nume complet */}
        <Label text="Nume complet *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: Ion Popescu"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Categorie */}
        <Label text="Categorie *" colors={colors} />
        <View style={styles.chipsGrid}>
          {CATEGORII.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? brand.orange : colors.bgCard,
                    borderColor:     active ? brand.orange : colors.border,
                  },
                ]}
                onPress={() => setCategory(c)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textPrimary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Localitate */}
        <Label text="Localitate *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: Cluj-Napoca"
          placeholderTextColor={colors.textSecondary}
          value={localitate}
          onChangeText={setLocalitate}
          autoCapitalize="words"
        />

        {/* Județ */}
        <Label text="Județ *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: Cluj"
          placeholderTextColor={colors.textSecondary}
          value={judet}
          onChangeText={setJudet}
          autoCapitalize="words"
        />

        {/* WhatsApp */}
        <Label text="Număr WhatsApp *" colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: 0712 345 678"
          placeholderTextColor={colors.textSecondary}
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />

        {/* Descriere */}
        <Label text="Experiență și specializări *" colors={colors} />
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Descrie experiența ta, specializările și zona în care activezi... (min. 50 caractere)"
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={500}
          textAlignVertical="top"
        />
        <View style={styles.charRow}>
          {descriptionTrimmed.length < 50 && (
            <Text style={[styles.charHint, { color: '#FF9500' }]}>
              Minim 50 caractere ({50 - descriptionTrimmed.length} rămase)
            </Text>
          )}
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {descriptionTrimmed.length}/500
          </Text>
        </View>

        {/* Buton */}
        <TouchableOpacity
          style={[styles.continueBtn, { opacity: isValid ? 1 : 0.45 }]}
          onPress={handleContinua}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continuă →</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          * Câmpuri obligatorii. Pasul următor: politica meșteri și plata de 1,99€.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Label({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.label, { color: colors.textSecondary }]}>{text}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 34 },
  headerTitle: { fontFamily: 'Syne_700Bold', fontSize: 17 },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },

  label: {
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
  textArea: { height: 120, paddingTop: 12, marginBottom: 4 },

  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  charHint:  { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  charCount: { fontFamily: 'DMSans_400Regular', fontSize: 11 },

  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 14 },

  continueBtn: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
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
});
