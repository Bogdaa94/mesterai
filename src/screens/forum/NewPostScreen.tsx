import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { brand, categories as catColors } from '../../theme/colors';
import { createPost, containsUrl, PostCategory } from '../../utils/forumHelpers';
import { checkForumPostLimit, incrementForumPostCount } from '../../firebase/firestore';
import { RootStackParamList } from '../../navigation/AppNavigator';

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: { id: PostCategory; label: string; emoji: string }[] = [
  { id: 'sanitare',    label: 'Sanitare',    emoji: '🔧' },
  { id: 'electric',    label: 'Electric',    emoji: '⚡' },
  { id: 'constructii', label: 'Construcții', emoji: '🏗️' },
  { id: 'gradina',     label: 'Grădină',     emoji: '🪴' },
  { id: 'mobila',      label: 'Mobilă',      emoji: '🪵' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewPostScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [category, setCategory]   = useState<PostCategory | null>(null);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = title.trim().length >= 10 && content.trim().length >= 20 && !!category;

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isValid || !user || loading) return;

    // URL detection
    if (containsUrl(title) || containsUrl(content)) {
      Alert.alert(
        'Link-uri interzise',
        'Postările nu pot conține link-uri sau adrese web.',
      );
      return;
    }

    // Rate limit check
    const { hasReachedLimit, count } = await checkForumPostLimit(user.uid);
    if (hasReachedLimit) {
      Alert.alert(
        'Limită atinsă',
        `Poți publica maxim 3 postări pe zi. Ai publicat deja ${count}. Revino mâine!`,
      );
      return;
    }

    const displayName = user.displayName ?? user.email ?? 'Utilizator';
    const initials = displayName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    setLoading(true);
    try {
      await createPost({
        title:          title.trim(),
        content:        content.trim(),
        category:       category!,
        authorName:     displayName,
        authorInitials: initials,
        userId:         user.uid,
      });
      await incrementForumPostCount(user.uid);
      setSubmitted(true);
    } catch (e: unknown) {
      Alert.alert('Eroare', (e as Error).message || 'Nu am putut trimite postarea.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <View style={[styles.successRoot, { backgroundColor: colors.bgPage }]}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
          Postare publicată!
        </Text>
        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          Comunitatea îți va răspunde în curând. Primești{' '}
          <Text style={{ color: brand.orange, fontFamily: 'DMSans_500Medium' }}>+10 puncte</Text>
          {' '}când postarea ta e marcată ca rezolvată.
        </Text>
        <TouchableOpacity
          style={styles.successBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.successBtnText}>Înapoi la Forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          Postează o întrebare 💬
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Descrie problema clar — cu cât dai mai multe detalii, cu atât primești răspuns mai rapid.
        </Text>

        {/* Category */}
        <FieldLabel label="Categorie *" colors={colors} />
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            const cat    = catColors[c.id];
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.categoryBtn,
                  {
                    backgroundColor: active ? cat.primary : colors.bgCard,
                    borderColor:     active ? cat.primary : colors.border,
                  },
                ]}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: active ? '#fff' : colors.textPrimary }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <FieldLabel label={`Titlu * (${title.trim().length}/100)`} colors={colors} />
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Ex: Robinet care picură la bucătărie — ce fac?"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        {title.trim().length > 0 && title.trim().length < 10 && (
          <Text style={styles.hint}>Titlul trebuie să aibă cel puțin 10 caractere.</Text>
        )}

        {/* Content */}
        <FieldLabel label={`Detalii * (${content.trim().length}/1000)`} colors={colors} />
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder={
            'Descrie problema în detaliu:\n• Când a apărut?\n• Ce ai încercat deja?\n• Ce simptome observi?'
          }
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />
        {content.trim().length > 0 && content.trim().length < 20 && (
          <Text style={styles.hint}>Adaugă cel puțin 20 de caractere.</Text>
        )}

        {/* Points info */}
        <View style={[styles.pointsInfo, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="star" size={16} color={brand.orange} />
          <Text style={[styles.pointsText, { color: colors.textSecondary }]}>
            Câștigă{' '}
            <Text style={{ color: brand.orange, fontFamily: 'DMSans_500Medium' }}>+10 puncte</Text>
            {' '}când postarea ta e marcată ca rezolvată de comunitate.
          </Text>
        </View>

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
            <Text style={styles.submitBtnText}>Publică întrebarea</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          * Câmpuri obligatorii. Postările respectă Regulile Comunității.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },

  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },

  fieldLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  categoryEmoji: { fontSize: 15 },
  categoryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  textArea: {
    height: 140,
    paddingTop: 12,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#E53935',
    marginBottom: 12,
    marginTop: 2,
  },

  // Points info
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  pointsText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },

  // Submit
  submitBtn: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
  successRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successEmoji:    { fontSize: 56, marginBottom: 16 },
  successTitle:    { fontFamily: 'Syne_700Bold', fontSize: 24, marginBottom: 12, textAlign: 'center' },
  successSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successBtn: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  successBtnText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
  },
});
