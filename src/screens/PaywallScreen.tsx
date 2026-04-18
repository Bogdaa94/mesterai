import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PurchasesPackage } from 'react-native-purchases';

import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { brand } from '../theme/colors';
import { getOfferings, extractPlans } from '../services/revenuecat';

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = 'annual' | 'monthly';

interface Feature {
  icon: string;
  text: string;
}

// ── Static data ────────────────────────────────────────────────────────────────

const FEATURES: Feature[] = [
  { icon: '∞',  text: 'Conversații nelimitate cu AI' },
  { icon: '📸', text: 'Foto diagnostic multiplu + analiză detaliată' },
  { icon: '🎤', text: 'Input vocal' },
  { icon: '🏘️', text: 'Meșteri din zona ta cu filtru distanță' },
  { icon: '💬', text: 'Forum comunitate complet' },
  { icon: '🔔', text: 'Notificări pentru răspunsuri și activitate' },
];

// Prețuri fallback dacă RevenueCat nu e disponibil (Expo Go / dev)
const FALLBACK_PRICES = {
  annual:  { price: '413,91 RON/an',   monthly: '34,49 RON/lună' },
  monthly: { price: '45,99 RON/lună',  monthly: null },
};

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { colors }                                    = useTheme();
  const { purchasePackage, restorePurchases, purchaseLoading } = usePro();
  const navigation                                    = useNavigation();
  const insets                                        = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');

  // Pachete RevenueCat
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg,  setAnnualPkg]  = useState<PurchasesPackage | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // ── Fetch offerings ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    getOfferings().then((offerings) => {
      if (cancelled || !offerings) { setLoadingOffers(false); return; }
      const { monthly, annual } = extractPlans(offerings);
      setMonthlyPkg(monthly);
      setAnnualPkg(annual);
      setLoadingOffers(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Derived prices (RevenueCat dacă disponibil, fallback static) ─────────

  const annualPrice   = annualPkg?.product.priceString  ?? FALLBACK_PRICES.annual.price;
  const monthlyPrice  = monthlyPkg?.product.priceString ?? FALLBACK_PRICES.monthly.price;

  // Prețul afișat pe cardul de plan
  const planDisplayPrice = selectedPlan === 'annual' ? annualPrice : monthlyPrice;

  // Label CTA
  const ctaLabel = selectedPlan === 'annual'
    ? `Începe Pro · ${annualPrice}`
    : `Începe Pro · ${monthlyPrice}`;

  // Prețul de reînnoire pentru nota legală
  const renewalPrice = selectedPlan === 'annual' ? annualPrice : monthlyPrice;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCTA = async () => {
    const pkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

    if (!pkg) {
      // RevenueCat nedisponibil (Expo Go sau keys lipsă)
      Alert.alert(
        'Indisponibil momentan',
        'Achizițiile necesită un build de producție. Revino în curând!'
      );
      return;
    }

    const success = await purchasePackage(pkg);
    if (success) navigation.goBack();
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) navigation.goBack();
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  const isBusy = purchaseLoading || loadingOffers;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Buton X */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={purchaseLoading}
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

          {/* Card Anual */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: colors.bgCard, borderColor: selectedPlan === 'annual' ? brand.orange : colors.border },
              selectedPlan === 'annual' && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.75}
            disabled={isBusy}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recomandat</Text>
            </View>
            <Text style={[styles.planLabel, { color: colors.textPrimary }]}>Anual</Text>
            {loadingOffers ? (
              <ActivityIndicator size="small" color={brand.orange} style={{ marginVertical: 4 }} />
            ) : (
              <>
                <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                  {annualPkg
                    ? `~${formatMonthlyFromAnnual(annualPkg)} · facturat anual`
                    : `~34,49 RON/lună · facturat anual`}
                </Text>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{annualPrice}</Text>
              </>
            )}
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-25%</Text>
            </View>
          </TouchableOpacity>

          {/* Card Lunar */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: colors.bgCard, borderColor: selectedPlan === 'monthly' ? brand.orange : colors.border },
              selectedPlan === 'monthly' && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.75}
            disabled={isBusy}
          >
            <Text style={[styles.planLabel, { color: colors.textPrimary }]}>Lunar</Text>
            {loadingOffers ? (
              <ActivityIndicator size="small" color={brand.orange} style={{ marginVertical: 4 }} />
            ) : (
              <>
                <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                  Flexibil · anulezi oricând
                </Text>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{monthlyPrice}</Text>
              </>
            )}
          </TouchableOpacity>

        </View>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.ctaBtn, isBusy && { opacity: 0.7 }]}
          onPress={handleCTA}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          {purchaseLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {/* ── Discount note ─────────────────────────────────────────────── */}
        <View style={[styles.discountNote, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.discountNoteTitle, { color: colors.textPrimary }]}>
            💡 Reduceri disponibile
          </Text>
          <Text style={[styles.discountNoteText, { color: colors.textSecondary }]}>
            • Referral: până la -40% luna următoare{'\n'}
            • Puncte forum: până la -40 RON la anual{'\n'}
            • Reducerile nu se cumulează în aceeași perioadă
          </Text>
        </View>

        {/* ── Legal note ────────────────────────────────────────────────── */}
        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          {selectedPlan === 'monthly'
            ? `Se reînnoiește automat la ${monthlyPrice === FALLBACK_PRICES.monthly.price ? '45,99 RON/lună' : monthlyPrice}.`
            : `Se reînnoiește automat la ${annualPrice === FALLBACK_PRICES.annual.price ? '413,91 RON/an' : annualPrice}.`}
          {'\n'}
          {`Poți anula oricând din setările ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} cu 24h înainte de reînnoire.`}
        </Text>

        {/* ── Restore + links ───────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleRestore}
          style={styles.restoreBtn}
          disabled={isBusy}
        >
          {purchaseLoading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restaurează achizițiile
            </Text>
          )}
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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Calculează prețul lunar echivalent dintr-un pachet anual. */
function formatMonthlyFromAnnual(pkg: PurchasesPackage): string {
  const annual = pkg.product.price;
  if (!annual) return pkg.product.priceString;
  const monthly = annual / 12;
  // Folosim același simbol de monedă din priceString (ex: "RON")
  const currency = pkg.product.currencyCode ?? 'RON';
  return `${monthly.toFixed(2)} ${currency}/lună`;
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
    minHeight: 130,
    justifyContent: 'center',
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
    textAlign: 'center',
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

  ctaBtn: {
    width: '100%',
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 52,
    justifyContent: 'center',
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

  discountNote: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  discountNoteTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    marginBottom: 6,
  },
  discountNoteText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
  },

  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  restoreBtn: { marginBottom: 12, minHeight: 20, justifyContent: 'center' },
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
  linkDot:  { fontSize: 13 },
  linkText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
