import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = 'annual' | 'monthly';

interface Feature {
  icon: string;
  text: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const FEATURES: Feature[] = [
  { icon: '∞',  text: 'Conversații nelimitate cu AI' },
  { icon: '📸', text: 'Foto diagnostic multiplu + analiză detaliată' },
  { icon: '🎤', text: 'Input vocal' },
  { icon: '🔧', text: 'Meșteri din zona ta cu filtru distanță' },
  { icon: '💬', text: 'Forum comunitate complet' },
  { icon: '📊', text: 'Raport Casa Mea' },
  { icon: '⏰', text: 'Remindere întreținere' },
  { icon: '💰', text: 'Calculator buget renovare' },
  { icon: '📐', text: 'Scanare schițe apartament (Gemini Vision)' },
];

const PLANS = {
  annual: {
    label: 'Anual',
    subtitle: '8,33 RON/lună · facturat anual',
    price: '99,99 RON/an',
    cta: 'Începe Pro · 99,99 RON/an',
    discount: '-58%',
    recommended: true,
  },
  monthly: {
    label: 'Lunar',
    subtitle: 'Flexibil · anulezi oricând',
    price: '19,99 RON/lună',
    cta: 'Începe Pro · 19,99 RON/lună',
    discount: null,
    recommended: false,
  },
} as const;

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');

  const activePlan = PLANS[selectedPlan];

  const handleCTA = () => {
    Alert.alert('Coming soon 🚀', 'RevenueCat va fi integrat în curând!');
  };

  const handleRestore = () => {
    Alert.alert('Restaurare', 'RevenueCat va fi integrat în curând!');
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Buton X */}
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
      >
        {/* ── PRO badge ─────────────────────────────────────────────────── */}
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>💎 PRO</Text>
        </View>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Text style={styles.heroEmoji}>💎</Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Mester AI Pro</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          Totul despre casa ta, rezolvat complet
        </Text>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <View style={[styles.featuresCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <React.Fragment key={f.text}>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{f.text}</Text>
              </View>
              {i < FEATURES.length - 1 && (
                <View style={[styles.featureSep, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Plan selector ─────────────────────────────────────────────── */}
        <View style={styles.planRow}>
          {(['annual', 'monthly'] as Plan[]).map(plan => {
            const p = PLANS[plan];
            const active = selectedPlan === plan;
            return (
              <TouchableOpacity
                key={plan}
                style={[
                  styles.planCard,
                  { backgroundColor: colors.bgCard, borderColor: active ? brand.orange : colors.border },
                  active && styles.planCardActive,
                ]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.75}
              >
                {p.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recomandat</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, { color: colors.textPrimary }]}>{p.label}</Text>
                <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>{p.subtitle}</Text>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{p.price}</Text>
                {p.discount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{p.discount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.ctaBtn} onPress={handleCTA} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{activePlan.cta}</Text>
        </TouchableOpacity>

        {/* ── Legal note ────────────────────────────────────────────────── */}
        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          Abonamentul se reînnoiește automat.{'\n'}
          Poți anula oricând din setările{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}{' '}
          cu 24h înainte de reînnoire.
        </Text>

        {/* ── Restore + links ───────────────────────────────────────────── */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Restaurează achizițiile
          </Text>
        </TouchableOpacity>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => openLink('https://mesterai.ro/terms')}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Termeni</Text>
          </TouchableOpacity>
          <Text style={[styles.linkDot, { color: colors.textSecondary }]}>·</Text>
          <TouchableOpacity onPress={() => openLink('https://mesterai.ro/privacy')}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Confidențialitate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, alignItems: 'center' },

  // PRO badge
  proBadge: {
    backgroundColor: brand.orange,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  proBadgeText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Hero
  heroEmoji: { fontSize: 50, marginBottom: 12 },
  heroTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },

  // Features
  featuresCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  featureIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  featureText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  featureSep: { height: 1, marginHorizontal: 16 },

  // Plan selector
  planRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  planCardActive: {
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  recommendedBadge: {
    backgroundColor: brand.orange,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  recommendedText: {
    color: '#fff',
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  planLabel: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
  },
  planSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  planPrice: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    marginTop: 4,
  },
  discountBadge: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  discountText: {
    color: brand.orange,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    fontWeight: '700',
  },

  // CTA
  ctaBtn: {
    width: '100%',
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Legal
  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  // Restore + links
  restoreBtn: { marginBottom: 12 },
  restoreText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkDot: { fontSize: 13 },
  linkText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
