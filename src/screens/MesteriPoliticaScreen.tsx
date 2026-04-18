import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { db } from '../firebase/config';
import { purchaseMesterRegistration, isRcInitialized } from '../services/revenuecat';

// ── Types ─────────────────────────────────────────────────────────────────────

type RouteP  = RouteProp<RootStackParamList, 'MesteriPolitica'>;
type NavProp = StackNavigationProp<RootStackParamList, 'MesteriPolitica'>;

const CHECKBOXES = [
  'Informațiile mele sunt corecte și reale',
  'Am experiență practică în categoria aleasă',
  'Mă angajez să răspund solicitărilor în maxim 24h',
  'Am înțeles sistemul de feedback și sancțiuni',
  'Înțeleg că taxa de 1,99€ este nereturnabilă',
  'Am citit și accept Politica Meșteri Mester AI',
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MesteriPoliticaScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteP>();
  const insets     = useSafeAreaInsets();

  const { formData } = route.params;

  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKBOXES.length).fill(false));
  const [loading, setLoading] = useState(false);

  const allChecked = checked.every(Boolean);

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // ── Logică plată ───────────────────────────────────────────────────────────

  const handlePlata = async () => {
    if (!user || !allChecked) return;
    setLoading(true);

    try {
      // 1. Verifică duplicat
      const existing = await getDocs(
        query(collection(db, 'mesteri_aplicatii'), where('userId', '==', user.uid), limit(1))
      );
      if (!existing.empty) {
        Alert.alert('Deja înregistrat', 'Ești deja înregistrat ca meșter în Mester AI.');
        return;
      }

      // 2. Plată RevenueCat
      if (!isRcInitialized()) {
        Alert.alert(
          'Plată indisponibilă',
          'Achizițiile nu sunt disponibile în Expo Go. Folosiți un EAS Build.'
        );
        return;
      }

      const result = await purchaseMesterRegistration();

      if (result.userCancelled) return; // utilizatorul a anulat — fără alertă

      if (!result.success) {
        Alert.alert(
          'Plată eșuată',
          result.error ?? 'Eroare necunoscută. Verifică conexiunea și încearcă din nou.'
        );
        return;
      }

      // 3. Crează documentul în Firestore
      await addDoc(collection(db, 'mesteri_aplicatii'), {
        ...formData,
        userId:        user.uid,
        email:         user.email ?? '',
        status:        'active',
        feedbackNegativ: 0,
        avertismente:  0,
        purchaseDate:  serverTimestamp(),
        purchaseToken: result.customerInfo?.originalPurchaseDate ?? '',
        createdAt:     serverTimestamp(),
      });

      // 4. Succes — afișează alert și navighează la tab-ul Meșteri
      Alert.alert(
        '🎉 Felicitări!',
        'Profilul tău de meșter este acum activ. Vei fi vizibil utilizatorilor Pro din zona ta.',
        [{
          text: 'Mergi la Meșteri',
          onPress: () => navigation.navigate('MainTabs'),
        }],
        { cancelable: false }
      );

    } catch (e: any) {
      Alert.alert('Eroare', e?.message ?? 'A apărut o eroare neașteptată. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Înainte să continui
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Citește și confirmă politica Mester AI
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Politica */}
        <View style={[styles.policyBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.policyText, { color: colors.textPrimary }]}>
            Prin înregistrarea ca meșter în Mester AI confirmi că:
          </Text>

          {[
            'Informațiile furnizate (nume, categorie, locație, contact) sunt corecte și reale',
            'Ai experiență practică în categoria aleasă',
            'Te angajezi să răspunzi solicitărilor utilizatorilor în maxim 24 de ore',
            'Profilul tău poate fi vizibil utilizatorilor Pro din zona ta',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: brand.orange }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{item}</Text>
            </View>
          ))}

          <Text style={[styles.policySectionTitle, { color: colors.textPrimary }]}>
            SISTEM DE FEEDBACK ȘI SANCȚIUNI
          </Text>

          {[
            '1–2 feedback-uri negative → avertisment vizibil pe profil',
            '3 feedback-uri negative → suspendare automată a profilului',
            'Informații false dovedite → eliminare imediată, fără rambursarea taxei',
            'Profil suspendat → reînregistrare posibilă după 30 zile + nouă taxă de 1,99€',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: '#FF3B30' }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{item}</Text>
            </View>
          ))}

          <View style={[styles.taxaBox, { backgroundColor: 'rgba(255,107,0,0.08)', borderColor: 'rgba(255,107,0,0.25)' }]}>
            <Text style={[styles.taxaTitle, { color: brand.orange }]}>TAXA DE ÎNREGISTRARE</Text>
            <Text style={[styles.taxaText, { color: colors.textPrimary }]}>
              1,99€ — plată unică, nereturnabilă
            </Text>
            <Text style={[styles.taxaText, { color: colors.textSecondary }]}>
              Acoperă înregistrarea și vizibilitatea permanentă în director
            </Text>
          </View>
        </View>

        {/* Rezumat date formular */}
        <View style={[styles.summaryBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>DATELE TALE</Text>
          <SummaryRow label="Nume"       value={formData.name}        colors={colors} />
          <SummaryRow label="Categorie"  value={formData.category}    colors={colors} />
          <SummaryRow label="Locație"    value={formData.location}    colors={colors} />
          <SummaryRow label="WhatsApp"   value={formData.whatsapp}    colors={colors} />
        </View>

        {/* Checkbox-uri */}
        <View style={[styles.checkboxesBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {CHECKBOXES.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.checkboxRow,
                i < CHECKBOXES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={() => toggle(i)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={checked[i] ? 'checkbox' : 'square-outline'}
                size={22}
                color={checked[i] ? brand.orange : colors.textSecondary}
              />
              <Text style={[styles.checkboxText, { color: colors.textPrimary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buton plată */}
        <TouchableOpacity
          style={[styles.payBtn, { opacity: allChecked && !loading ? 1 : 0.45 }]}
          onPress={handlePlata}
          disabled={!allChecked || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.payBtnText}>Continuă la plată · 1,99€ →</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textSecondary }]}>
          Plata este procesată prin App Store / Google Play. Taxa este nereturnabilă.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={[summaryStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[summaryStyles.value, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888' },
  value: { fontFamily: 'DMSans_500Medium', fontSize: 13, flexShrink: 1, marginLeft: 8, textAlign: 'right' },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:       { width: 34 },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerTitle:   { fontFamily: 'Syne_700Bold', fontSize: 16 },
  headerSubtitle:{ fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  // Policy box
  policyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  policyText:        { fontFamily: 'DMSans_500Medium', fontSize: 14, marginBottom: 4 },
  policySectionTitle:{ fontFamily: 'DMSans_500Medium', fontSize: 12, letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  bulletRow:         { flexDirection: 'row', gap: 8, marginBottom: 2 },
  bullet:            { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20, width: 10 },
  bulletText:        { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19, flex: 1 },
  taxaBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  taxaTitle: { fontFamily: 'DMSans_500Medium', fontSize: 12, letterSpacing: 0.5 },
  taxaText:  { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },

  // Summary box
  summaryBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Checkboxes
  checkboxesBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  checkboxText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    flex: 1,
    lineHeight: 19,
  },

  // Pay button
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
  },

  legal: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
});
