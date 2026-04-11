import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { brand, categories } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';

// ── Types ──────────────────────────────────────────────────────────────────────

type CategoryKey = keyof typeof categories;

interface Mester {
  id: string;
  name: string;
  category: CategoryKey;
  categoryLabel: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  whatsapp: string;
}

type RadiusOption = 5 | 10 | 25 | 50;

// ── Mock data ──────────────────────────────────────────────────────────────────

const MESTERI_MOCK: Mester[] = [
  { id: '1', name: 'Ion Popescu',    category: 'sanitare',    categoryLabel: 'Sanitare',    distanceKm: 3.2,  rating: 4.8, reviewCount: 47, whatsapp: '40712345678' },
  { id: '2', name: 'Mihai Ionescu',  category: 'electric',    categoryLabel: 'Electric',    distanceKm: 5.7,  rating: 4.6, reviewCount: 31, whatsapp: '40723456789' },
  { id: '3', name: 'Gheorghe Radu',  category: 'constructii', categoryLabel: 'Construcții', distanceKm: 8.1,  rating: 4.9, reviewCount: 89, whatsapp: '40734567890' },
  { id: '4', name: 'Alexandru Stan', category: 'electric',    categoryLabel: 'Electric',    distanceKm: 12.4, rating: 4.5, reviewCount: 22, whatsapp: '40745678901' },
  { id: '5', name: 'Vasile Dumitru', category: 'gradina',     categoryLabel: 'Grădină',     distanceKm: 15.8, rating: 4.7, reviewCount: 15, whatsapp: '40756789012' },
  { id: '6', name: 'Costin Marin',   category: 'mobila',      categoryLabel: 'Mobilă',      distanceKm: 22.3, rating: 4.4, reviewCount: 38, whatsapp: '40767890123' },
];

const RADIUS_OPTIONS: RadiusOption[] = [5, 10, 25, 50];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color="#F9A825"
        />
      ))}
      <Text style={starStyles.label}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  label: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: '#F9A825', marginLeft: 2 },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function MesteriScreen() {
  const { colors } = useTheme();
  const { isPro } = usePro();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [selectedRadius, setSelectedRadius] = useState<RadiusOption>(10);

  const filtered = MESTERI_MOCK.filter(m => m.distanceKm <= selectedRadius);

  const handleWhatsApp = (mester: Mester) => {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    const url = `whatsapp://send?phone=${mester.whatsapp}&text=Bună ziua! Te-am găsit pe Mester AI și aș avea nevoie de ajutorul tău.`;
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp', 'Nu s-a putut deschide WhatsApp. Verifică dacă e instalat.')
    );
  };

  const handleRadiusPress = (r: RadiusOption) => {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    setSelectedRadius(r);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgApp, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meșteri din zonă</Text>
        <Ionicons name="location-outline" size={20} color={brand.orange} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filtru rază */}
        <View style={styles.radiusSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Raza de căutare {!isPro && <Text style={{ color: brand.orange }}>· PRO</Text>}
          </Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map(r => {
              const active = selectedRadius === r && isPro;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusBtn,
                    { borderColor: active ? brand.orange : colors.border, backgroundColor: active ? brand.orange : colors.bgCard },
                  ]}
                  onPress={() => handleRadiusPress(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radiusBtnText, { color: active ? '#fff' : colors.textSecondary }]}>
                    {r} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lista meșteri */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginHorizontal: 16 }]}>
          {filtered.length} meșteri găsiți în raza de {selectedRadius} km
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🔧</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Niciun meșter în raza selectată
            </Text>
          </View>
        ) : (
          filtered.map(mester => {
            const catColors = categories[mester.category];
            const initial = mester.name.charAt(0).toUpperCase();

            return (
              <View key={mester.id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {/* Avatar + info */}
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: catColors.light }]}>
                    <Text style={[styles.avatarText, { color: catColors.primary }]}>{initial}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{mester.name}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: catColors.light }]}>
                        <Text style={[styles.categoryText, { color: catColors.primary }]}>
                          {mester.categoryLabel}
                        </Text>
                      </View>
                      <Text style={[styles.distance, { color: colors.textSecondary }]}>
                        📍 ~{mester.distanceKm} km
                      </Text>
                    </View>
                    <View style={styles.ratingRow}>
                      <StarRating rating={mester.rating} />
                      <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
                        ({mester.reviewCount})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Buton WhatsApp */}
                <TouchableOpacity
                  style={[styles.waBtn, isPro ? styles.waBtnActive : styles.waBtnBlurred]}
                  onPress={() => handleWhatsApp(mester)}
                  activeOpacity={0.8}
                >
                  {isPro ? (
                    <>
                      <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                      <Text style={styles.waBtnText}>Contactează</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={14} color={brand.orange} />
                      <Text style={[styles.waBtnText, { color: brand.orange }]}>PRO 💎</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: 'Syne_700Bold', fontSize: 20 },

  scroll: { paddingTop: 16 },

  sectionLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Radius filter
  radiusSection: { paddingHorizontal: 16, marginBottom: 20 },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  radiusBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 13 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },

  // Mester card
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', gap: 12 },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 20 },

  info: { flex: 1, gap: 4 },
  name: { fontFamily: 'Syne_700Bold', fontSize: 15 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  distance: { fontFamily: 'DMSans_400Regular', fontSize: 12 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewCount: { fontFamily: 'DMSans_400Regular', fontSize: 11 },

  // WhatsApp button
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  waBtnActive: { backgroundColor: '#25D366' },
  waBtnBlurred: {
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  waBtnText: { color: '#fff', fontFamily: 'DMSans_400Regular', fontSize: 14 },
});
