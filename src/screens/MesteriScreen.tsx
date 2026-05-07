import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { useAuth } from '../context/AuthContext';
import { brand, categories } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { db } from '../firebase/config';
import { saveContactEvent, getUserContactedMesters } from '../firebase/firestore';
import RatingModal from '../components/RatingModal';

// ── Types ──────────────────────────────────────────────────────────────────────

type CategoryKey = keyof typeof categories;

/** Document din colecția mesteri_aplicatii (status in ['active','approved']) */
interface MesteriDoc {
  userId:           string;
  // Câmpuri noi (FormularMesterScreen)
  name?:            string;
  category?:        string;
  location?:        string;
  description?:     string;
  // Câmpuri vechi (retrocompatibilitate)
  nume?:            string;
  categorie?:       string;
  oras?:            string;
  descriere?:       string;
  // Comune
  whatsapp:         string;
  status:           string;
  feedbackNegativ?: number;
  avertismente?:    number;
  rating?:          number;
  reviewCount?:     number;
  totalRatings?:    number;
  badge?:           'nou' | 'verificat' | 'top';
  lat?:             number;
  lng?:             number;
  createdAt?:       Timestamp;
}

interface Mester extends MesteriDoc {
  id: string;
}

// ── Helpers pentru câmpuri dual-format ────────────────────────────────────────

function getMesterName(m: MesteriDoc):     string { return m.name     ?? m.nume     ?? '—'; }
function getMesterCategory(m: MesteriDoc): string { return m.category ?? m.categorie ?? 'Altele'; }
function getMesterLocation(m: MesteriDoc): string { return m.location ?? m.oras      ?? ''; }
function getMesterDesc(m: MesteriDoc):     string { return m.description ?? m.descriere ?? ''; }

// ──

type MesterDisplay = Mester & {
  categoryKey:   CategoryKey;
  categoryLabel: string;
  computedKm:    number | null;
  displayName:   string;
  displayLoc:    string;
  displayDesc:   string;
};

type RadiusOption = 5 | 10 | 25 | 50;

// ── Mapare categorie text → key ────────────────────────────────────────────────

const CATEGORIE_TO_KEY: Record<string, CategoryKey> = {
  'Sanitare':    'sanitare',
  'Electric':    'electric',
  'Construcții': 'constructii',
  'Grădină':     'gradina',
  'Mobilă':      'mobila',
  'Altele':      'constructii',
};

const RADIUS_OPTIONS: RadiusOption[] = [5, 10, 25, 50];

// ── Badge config ───────────────────────────────────────────────────────────────

const BADGE_ORDER: Record<string, number> = { top: 0, verificat: 1, nou: 2 };

const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  top:      { label: '🏆 Top Meșter', color: '#B8860B', bg: 'rgba(184,134,11,0.10)' },
  verificat:{ label: '✅ Verificat',  color: '#2E7D32', bg: 'rgba(46,125,50,0.10)'  },
  nou:      { label: '🆕 Nou',        color: '#1565C0', bg: 'rgba(21,101,192,0.10)' },
};

function sortByBadgeRatingDistance(a: MesterDisplay, b: MesterDisplay): number {
  const ba = BADGE_ORDER[a.badge ?? 'nou'] ?? 2;
  const bb = BADGE_ORDER[b.badge ?? 'nou'] ?? 2;
  if (ba !== bb) return ba - bb;
  const ra = a.rating ?? 0;
  const rb = b.rating ?? 0;
  if (ra !== rb) return rb - ra;
  if (a.computedKm !== null && b.computedKm !== null) return a.computedKm - b.computedKm;
  if (a.computedKm !== null) return -1;
  if (b.computedKm !== null) return 1;
  return a.displayLoc.localeCompare(b.displayLoc);
}

const REPORT_REASONS = [
  'Informații false sau înșelătoare',
  'Comportament neprofesionist',
  'Nu răspunde la mesaje',
  'Prețuri neafișate / înșelătorie',
  'Alt motiv',
];

// ── StarRating ─────────────────────────────────────────────────────────────────

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
  row:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  label: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: '#F9A825', marginLeft: 2 },
});

// ── MesterCard ─────────────────────────────────────────────────────────────────

interface MesterCardProps {
  mester:         MesterDisplay;
  locationActive: boolean;
  isPro:          boolean;
  hasContacted:   boolean;
  onWhatsApp:     (m: MesterDisplay) => void;
  onReport:       (m: MesterDisplay) => void;
  onRate:         (m: MesterDisplay) => void;
  colors:         any;
}

function MesterCard({ mester, locationActive, isPro, hasContacted, onWhatsApp, onReport, onRate, colors }: MesterCardProps) {
  const catColors = categories[mester.categoryKey];
  const initial   = mester.displayName.charAt(0).toUpperCase();
  const hasWarning = (mester.feedbackNegativ ?? 0) >= 1;

  const distanceText = (() => {
    if (mester.computedKm !== null) {
      return `📍 ~${mester.computedKm} km${locationActive ? ' 📡' : ''}`;
    }
    return `📍 ${mester.displayLoc}`;
  })();

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Badge meșter */}
      {!!mester.badge && (
        <View style={[cardStyles.badgePill, { backgroundColor: BADGE_CONFIG[mester.badge]?.bg }]}>
          <Text style={[cardStyles.badgeText, { color: BADGE_CONFIG[mester.badge]?.color }]}>
            {BADGE_CONFIG[mester.badge]?.label}
          </Text>
        </View>
      )}

      {/* Warning badge */}
      {hasWarning && (
        <View style={cardStyles.warningBanner}>
          <Ionicons name="warning" size={13} color="#FF9500" />
          <Text style={cardStyles.warningText}>
            Profil cu {mester.feedbackNegativ} feedback negativ{(mester.feedbackNegativ ?? 0) > 1 ? 'e' : ''}
          </Text>
        </View>
      )}

      <View style={cardStyles.top}>
        <View style={[cardStyles.avatar, { backgroundColor: catColors.light }]}>
          <Text style={[cardStyles.avatarText, { color: catColors.primary }]}>{initial}</Text>
        </View>
        <View style={cardStyles.info}>
          <Text style={[cardStyles.name, { color: colors.textPrimary }]}>{mester.displayName}</Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.categoryBadge, { backgroundColor: catColors.light }]}>
              <Text style={[cardStyles.categoryText, { color: catColors.primary }]}>
                {mester.categoryLabel}
              </Text>
            </View>
            <Text style={[cardStyles.distance, { color: colors.textSecondary }]}>
              {distanceText}
            </Text>
          </View>
          {(mester.rating ?? 0) > 0 ? (
            <View style={cardStyles.ratingRow}>
              <StarRating rating={mester.rating!} />
              <Text style={[cardStyles.reviewCount, { color: colors.textSecondary }]}>
                ({mester.reviewCount ?? 0})
              </Text>
            </View>
          ) : (
            <Text style={[cardStyles.noRating, { color: colors.textSecondary }]}>
              Fără recenzii încă
            </Text>
          )}
          {!!mester.displayDesc && (
            <Text style={[cardStyles.descriere, { color: colors.textSecondary }]} numberOfLines={2}>
              {mester.displayDesc}
            </Text>
          )}
        </View>
      </View>

      <View style={cardStyles.actions}>
        <TouchableOpacity
          style={[cardStyles.waBtn, isPro ? cardStyles.waBtnActive : cardStyles.waBtnLocked, { flex: 1 }]}
          onPress={() => onWhatsApp(mester)}
          activeOpacity={0.8}
        >
          {isPro ? (
            <>
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={cardStyles.waBtnText}>Contactează</Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={14} color={brand.orange} />
              <Text style={[cardStyles.waBtnText, { color: brand.orange }]}>PRO 💎</Text>
            </>
          )}
        </TouchableOpacity>

        {isPro && hasContacted && (
          <TouchableOpacity
            style={[cardStyles.rateBtn, { borderColor: '#F9A825' }]}
            onPress={() => onRate(mester)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons name="star-outline" size={15} color="#F9A825" />
          </TouchableOpacity>
        )}

        {isPro && (
          <TouchableOpacity
            style={[cardStyles.reportBtn, { borderColor: colors.border }]}
            onPress={() => onReport(mester)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,149,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  warningText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#FF9500',
  },
  top:          { flexDirection: 'row', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText:    { fontFamily: 'Syne_700Bold', fontSize: 20 },
  info:          { flex: 1, gap: 4 },
  name:          { fontFamily: 'Syne_700Bold', fontSize: 15 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText:  { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  distance:      { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewCount:   { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  noRating:      { fontFamily: 'DMSans_400Regular', fontSize: 11, fontStyle: 'italic' },
  descriere:     { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  waBtnActive: { backgroundColor: '#25D366' },
  waBtnLocked: {
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  waBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  reportBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
});

// ── ReportModal ────────────────────────────────────────────────────────────────

interface ReportModalProps {
  mester:   MesterDisplay | null;
  visible:  boolean;
  onClose:  () => void;
  userId:   string;
  colors:   any;
}

function ReportModal({ mester, visible, onClose, userId, colors }: ReportModalProps) {
  const [selected, setSelected]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!mester || !selected) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'rapoarte_mesteri'), {
        mesterId:    mester.id,
        mesterUserId: mester.userId,
        reporterUserId: userId,
        reason:      selected,
        createdAt:   serverTimestamp(),
      });
      Alert.alert('Raport trimis', 'Mulțumim! Echipa noastră va verifica profilul.');
      setSelected(null);
      onClose();
    } catch {
      Alert.alert('Eroare', 'Nu am putut trimite raportul. Încearcă din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={modalStyles.handle} />
          <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
            Raportează meșter
          </Text>
          {mester && (
            <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
              {mester.displayName}
            </Text>
          )}

          <View style={modalStyles.reasons}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  modalStyles.reasonRow,
                  { borderColor: colors.border },
                  selected === r && { borderColor: brand.orange, backgroundColor: 'rgba(255,107,0,0.06)' },
                ]}
                onPress={() => setSelected(r)}
                activeOpacity={0.7}
              >
                <View style={[
                  modalStyles.radio,
                  { borderColor: selected === r ? brand.orange : colors.textSecondary },
                ]}>
                  {selected === r && <View style={modalStyles.radioDot} />}
                </View>
                <Text style={[modalStyles.reasonText, { color: colors.textPrimary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[modalStyles.submitBtn, { opacity: selected && !submitting ? 1 : 0.4 }]}
            onPress={handleSubmit}
            disabled={!selected || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={modalStyles.submitText}>Trimite raport</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={modalStyles.cancelBtn}>
            <Text style={[modalStyles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title:    { fontFamily: 'Syne_700Bold',       fontSize: 18, marginBottom: 2 },
  subtitle: { fontFamily: 'DMSans_400Regular',  fontSize: 13, marginBottom: 12 },
  reasons:  { gap: 8, marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.orange,
  },
  reasonText:  { fontFamily: 'DMSans_400Regular', fontSize: 14, flex: 1 },
  submitBtn: {
    backgroundColor: brand.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText:  { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#fff' },
  cancelBtn:   { alignItems: 'center', paddingTop: 12 },
  cancelText:  { fontFamily: 'DMSans_400Regular', fontSize: 14 },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function MesteriScreen() {
  const { colors }    = useTheme();
  const { isPro }     = usePro();
  const { user }      = useAuth();
  const insets        = useSafeAreaInsets();
  const navigation    = useNavigation<StackNavigationProp<RootStackParamList>>();

  // ── Stare ─────────────────────────────────────────────────────────────────

  const [mesteri, setMesteri]         = useState<Mester[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedRadius, setSelectedRadius]   = useState<RadiusOption>(10);
  const [userCoords, setUserCoords]           = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationActive = userCoords !== null;

  const [reportTarget, setReportTarget]       = useState<MesterDisplay | null>(null);
  const [ratingTarget, setRatingTarget]       = useState<MesterDisplay | null>(null);
  const [contactedMesters, setContactedMesters] = useState<Set<string>>(new Set());

  // ── Firestore: onSnapshot — status in ['active', 'approved'] ─────────────

  useEffect(() => {
    const q = query(
      collection(db, 'mesteri_aplicatii'),
      where('status', 'in', ['active', 'approved'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mester));
        setMesteri(data);
        setLoadingData(false);
      },
      () => setLoadingData(false)
    );

    return unsub;
  }, []);

  // ── Încarcă meșterii contactați de user ──────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;
    getUserContactedMesters(user.uid).then(setContactedMesters).catch(() => {});
  }, [user?.uid]);

  // ── Calcul distanțe + normalizare câmpuri ────────────────────────────────

  const mesteriDisplay: MesterDisplay[] = mesteri.map((m) => {
    const cat          = getMesterCategory(m);
    const categoryKey  = CATEGORIE_TO_KEY[cat] ?? 'constructii';
    const categoryLabel = cat;
    const displayName  = getMesterName(m);
    const displayLoc   = getMesterLocation(m);
    const displayDesc  = getMesterDesc(m);

    let computedKm: number | null = null;
    if (userCoords && m.lat != null && m.lng != null) {
      const meters = getDistance(
        { latitude: userCoords.latitude, longitude: userCoords.longitude },
        { latitude: m.lat,              longitude: m.lng }
      );
      computedKm = Math.round(meters / 100) / 10;
    }

    return { ...m, categoryKey, categoryLabel, computedKm, displayName, displayLoc, displayDesc };
  });

  const withDistance    = mesteriDisplay
    .filter((m) => m.computedKm !== null && m.computedKm <= selectedRadius)
    .sort(sortByBadgeRatingDistance);

  const withoutDistance = mesteriDisplay
    .filter((m) => m.computedKm === null)
    .sort(sortByBadgeRatingDistance);

  const filtered = locationActive
    ? [...withDistance, ...withoutDistance]
    : mesteriDisplay.slice().sort(sortByBadgeRatingDistance);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLocationPress = async () => {
    if (locationActive) {
      setUserCoords(null);
      return;
    }
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Locație dezactivată', 'Activează locația pentru a vedea distanțele reale.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      Alert.alert('Eroare', 'Nu am putut obține locația. Încearcă din nou.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleWhatsApp = (mester: MesterDisplay) => {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    const phone = mester.whatsapp.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${phone}&text=Bună ziua! Te-am găsit pe Mester AI și aș avea nevoie de ajutorul tău.`;
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp', 'Nu s-a putut deschide WhatsApp. Verifică dacă e instalat.')
    );
    // Înregistrează contactarea pentru rating reminder
    if (user?.uid) {
      saveContactEvent(user.uid, mester.id, mester.userId).then(() => {
        setContactedMesters((prev) => new Set([...prev, mester.id]));
      }).catch(() => {});
    }
  };

  const handleRadiusPress = (r: RadiusOption) => {
    if (!isPro) { navigation.navigate('Paywall'); return; }
    setSelectedRadius(r);
  };

  const totalCount = filtered.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: colors.bgApp,
        borderBottomColor: colors.border,
        paddingTop: insets.top + 8,
      }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meșteri din zonă</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('FiiMester')}
            style={[styles.fiiMesterBtn, { backgroundColor: brand.orange }]}
            activeOpacity={0.8}
          >
            <Text style={styles.fiiMesterText}>Fii Meșter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLocationPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={brand.orange} />
            ) : (
              <Ionicons
                name={locationActive ? 'location' : 'location-outline'}
                size={22}
                color={locationActive ? brand.orange : colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loadingData ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={brand.orange} />
        </View>
      ) : (
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
              {RADIUS_OPTIONS.map((r) => {
                const active = selectedRadius === r && isPro;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusBtn,
                      {
                        borderColor:     active ? brand.orange : colors.border,
                        backgroundColor: active ? brand.orange : colors.bgCard,
                      },
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

          {/* Sumar */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginHorizontal: 16 }]}>
            {locationActive
              ? `${withDistance.length} în raza de ${selectedRadius} km · ${withoutDistance.length} fără locație`
              : `${totalCount} meșteri activi`}
            {locationActive ? ' · locație reală 📡' : ''}
          </Text>

          {/* Lista */}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>🔧</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {locationActive
                  ? 'Niciun meșter cu locație în raza selectată'
                  : 'Niciun meșter activ momentan'}
              </Text>
              {locationActive && withoutDistance.length > 0 && (
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                  {withoutDistance.length} meșteri disponibili fără locație exactă ↓
                </Text>
              )}
            </View>
          ) : (
            filtered.map((mester) => (
              <MesterCard
                key={mester.id}
                mester={mester}
                locationActive={locationActive}
                isPro={isPro}
                hasContacted={contactedMesters.has(mester.id)}
                onWhatsApp={handleWhatsApp}
                onReport={setReportTarget}
                onRate={setRatingTarget}
                colors={colors}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Report Modal */}
      <ReportModal
        mester={reportTarget}
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        userId={user?.uid ?? ''}
        colors={colors}
      />

      {/* Rating Modal */}
      {ratingTarget && (
        <RatingModal
          visible={ratingTarget !== null}
          mesterId={ratingTarget.id}
          mesterUserId={ratingTarget.userId}
          mesterName={ratingTarget.displayName}
          userId={user?.uid ?? ''}
          onClose={() => setRatingTarget(null)}
          onSuccess={() => {
            setRatingTarget(null);
            Alert.alert('Mulțumim!', 'Ratingul tău a fost înregistrat și ajută comunitatea.');
          }}
        />
      )}
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
  headerTitle:   { fontFamily: 'Syne_700Bold', fontSize: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fiiMesterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fiiMesterText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#fff' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 16 },

  sectionLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  radiusSection: { paddingHorizontal: 16, marginBottom: 20 },
  radiusRow:     { flexDirection: 'row', gap: 8 },
  radiusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  radiusBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText:    { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  emptySubText: { fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
