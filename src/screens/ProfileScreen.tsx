import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getUserProblems, UserProfile } from '../firebase/firestore';
import { timeAgo } from '../utils/timeAgo';
import { usePro } from '../context/ProContext';
import PointsCard from '../components/PointsCard';
import {
  LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  type LanguageCode,
} from '../i18n';

// ── Types ──────────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface RowItem {
  icon: IoniconsName;
  label: string;
  onPress?: () => void;
  rightSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  destructive?: boolean;
  hideChevron?: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[sectionStyles.title, { color: colors.textSecondary }]}>{title}</Text>
  );
}

function Row({ item, colors, isLast }: { item: RowItem; colors: any; isLast: boolean }) {
  const content = (
    <View style={[sectionStyles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[sectionStyles.iconWrap, { backgroundColor: item.destructive ? 'rgba(255,59,48,0.12)' : 'rgba(255,107,0,0.10)' }]}>
        <Ionicons
          name={item.icon}
          size={17}
          color={item.destructive ? '#FF3B30' : brand.orange}
        />
      </View>
      <Text style={[sectionStyles.label, { color: item.destructive ? '#FF3B30' : colors.textPrimary }]}>
        {item.label}
      </Text>
      <View style={sectionStyles.right}>
        {item.rightSwitch ? (
          <Switch
            value={item.switchValue}
            onValueChange={item.onSwitchChange}
            trackColor={{ false: colors.bgCard2, true: brand.orange }}
            thumbColor="#fff"
          />
        ) : !item.hideChevron ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        ) : null}
      </View>
    </View>
  );

  if (item.rightSwitch) return <View>{content}</View>;

  return (
    <TouchableOpacity onPress={item.onPress} activeOpacity={0.6}>
      {content}
    </TouchableOpacity>
  );
}

function Card({ items, colors }: { items: RowItem[]; colors: any }) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {items.map((item, i) => (
        <Row key={item.label} item={item} colors={colors} isLast={i === items.length - 1} />
      ))}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  title: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  right: {
    flexShrink: 0,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const { isPro } = usePro();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [problemCount, setProblemCount] = useState<number | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(
    getCurrentLanguage()
  );

  // ── Profil — onSnapshot (timp real) ───────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      setLoadingProfile(false);
    }, () => setLoadingProfile(false));
    return unsub;
  }, [user]);

  // ── Număr probleme ────────────────────────────────────────────────────────

  const loadProblems = useCallback(async () => {
    if (!user) return;
    try {
      const problems = await getUserProblems(user.uid);
      setProblemCount(problems.length);
    } catch {
      // silently ignore
    }
  }, [user]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  // ── Avatar ────────────────────────────────────────────────────────────────

  const displayName = profile?.name ?? user?.displayName ?? user?.email ?? 'U';
  const email = profile?.email ?? user?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    Alert.alert(t('profile.logout'), t('profile.confirmLogout'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteConfirmBtn'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              Alert.alert(t('common.error'), 'Nu am putut șterge contul. Re-autentifică-te și încearcă din nou.');
            }
          },
        },
      ]
    );
  };

  const handleSelectLanguage = async (code: LanguageCode) => {
    await changeLanguage(code, user?.uid);
    setCurrentLang(code);
    setLangModalVisible(false);
  };

  const currentLangInfo = LANGUAGES.find(l => l.code === currentLang) ?? LANGUAGES[0];

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});
  const openEmail = () => Linking.openURL('mailto:contact@mesterai.ro').catch(() => {});
  const openStore = () => {
    const url = 'https://apps.apple.com'; // TODO: link real App Store / Play Store
    openLink(url);
  };

  // ── Row definitions ───────────────────────────────────────────────────────

  const contRows: RowItem[] = [
    {
      icon: 'bar-chart-outline',
      label: `${t('profile.problems')}: ${problemCount !== null ? problemCount : '—'}`,
      hideChevron: true,
    },
    ...(!isPro ? [{
      icon: 'diamond-outline' as IoniconsName,
      label: t('profile.upgradeToPro'),
      onPress: () => navigation.navigate('Paywall'),
    }] : []),
    {
      icon: mode === 'dark' ? 'moon' : 'sunny-outline',
      label: t('profile.darkMode'),
      rightSwitch: true,
      switchValue: mode === 'dark',
      onSwitchChange: () => toggleTheme(),
      hideChevron: true,
    },
  ];

  const mesteriRows: RowItem[] = [
    {
      icon: 'construct-outline',
      label: t('profile.beACraftsman'),
      onPress: () => navigation.navigate('FiiMester'),
    },
  ];

  const setariRows: RowItem[] = [
    {
      icon: 'notifications-outline',
      label: t('profile.notifications'),
      rightSwitch: true,
      switchValue: notificationsOn,
      onSwitchChange: setNotificationsOn,
      hideChevron: true,
    },
    {
      icon: 'language-outline',
      label: `${t('profile.language')}: ${currentLangInfo.flag} ${currentLangInfo.name}`,
      onPress: () => setLangModalVisible(true),
    },
    {
      icon: 'lock-closed-outline',
      label: t('profile.privacy'),
      onPress: () => navigation.navigate('Privacy'),
    },
    {
      icon: 'document-text-outline',
      label: t('profile.terms'),
      onPress: () => navigation.navigate('Terms'),
    },
    {
      icon: 'star-outline',
      label: t('profile.rateApp'),
      onPress: openStore,
    },
    {
      icon: 'mail-outline',
      label: t('profile.support'),
      onPress: openEmail,
    },
  ];

  const pericolosRows: RowItem[] = [
    {
      icon: 'log-out-outline',
      label: t('profile.logout'),
      onPress: handleSignOut,
      destructive: true,
    },
    {
      icon: 'trash-outline',
      label: t('profile.deleteAccount'),
      onPress: handleDeleteAccount,
      destructive: true,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bgPage }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header profil ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {loadingProfile ? (
          <ActivityIndicator size="small" color={brand.orange} style={{ marginTop: 8 }} />
        ) : (
          <>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
            {profile?.lastActiveAt && (
              <Text style={[styles.lastActive, { color: colors.textSecondary }]}>
                Activ {timeAgo(profile.lastActiveAt)}
              </Text>
            )}
          </>
        )}

        <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
          <Text style={styles.badgeText}>{isPro ? 'PRO 💎' : 'FREE'}</Text>
        </View>
      </View>

      {/* ── Secțiunea Cont ─────────────────────────────────────────────── */}
      <SectionTitle title={t('profile.account')} colors={colors} />
      <Card items={contRows} colors={colors} />

      {/* ── Secțiunea Puncte ───────────────────────────────────────────── */}
      <SectionTitle title={t('profile.points')} colors={colors} />
      <PointsCard
        points={profile?.points ?? 0}
        pointsHistory={profile?.pointsHistory ?? []}
        isPro={isPro}
      />

      {/* ── Secțiunea Meșteri ──────────────────────────────────────────── */}
      <SectionTitle title={t('profile.craftsmen')} colors={colors} />
      <Card items={mesteriRows} colors={colors} />

      {/* ── Secțiunea Setări ───────────────────────────────────────────── */}
      <SectionTitle title={t('profile.settings')} colors={colors} />
      <Card items={setariRows} colors={colors} />

      {/* ── Secțiunea Cont periculos ───────────────────────────────────── */}
      <SectionTitle title={t('profile.dangerZone')} colors={colors} />
      <Card items={pericolosRows} colors={colors} />

      {/* ── Modal selectare limbă ──────────────────────────────────────── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={langStyles.overlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View
            style={[
              langStyles.sheet,
              { backgroundColor: colors.bgCard, borderTopColor: colors.border },
            ]}
          >
            <View style={[langStyles.handle, { backgroundColor: colors.border }]} />
            <Text style={[langStyles.sheetTitle, { color: colors.textPrimary }]}>
              {t('profile.chooseLanguage')}
            </Text>

            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    langStyles.langRow,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: 'rgba(255,107,0,0.07)' },
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  activeOpacity={0.6}
                >
                  <Text style={langStyles.flag}>{lang.flag}</Text>
                  <Text style={[langStyles.langName, { color: colors.textPrimary }]}>
                    {lang.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={brand.orange} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16 },

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Syne_700Bold',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Syne_700Bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  lastActive: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 10,
    opacity: 0.7,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeFree: {
    backgroundColor: 'rgba(255,107,0,0.12)',
  },
  badgePro: {
    backgroundColor: 'rgba(100,210,255,0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: brand.orange,
    letterSpacing: 0.5,
  },
});

const langStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 32,
    paddingHorizontal: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 1,
    gap: 14,
  },
  flag: { fontSize: 24 },
  langName: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
  },
});
