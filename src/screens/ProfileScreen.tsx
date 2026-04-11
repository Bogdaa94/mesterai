import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { getUserProfile, getUserProblems, UserProfile } from '../firebase/firestore';

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

const isPro = false; // TODO: conectează la subscription real

export default function ProfileScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [problemCount, setProblemCount] = useState<number | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Încarcă date Firestore ─────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [prof, problems] = await Promise.all([
        getUserProfile(user.uid),
        getUserProblems(user.uid),
      ]);
      setProfile(prof);
      setProblemCount(problems.length);
    } catch {
      // silently ignore
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Avatar ────────────────────────────────────────────────────────────────

  const displayName = profile?.name ?? user?.displayName ?? user?.email ?? 'U';
  const email = profile?.email ?? user?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    Alert.alert('Deconectare', 'Ești sigur că vrei să te deconectezi?', [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Deconectează', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Șterge contul',
      'Această acțiune este ireversibilă. Toate datele tale vor fi șterse.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge definitiv',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (e) {
              Alert.alert('Eroare', 'Nu am putut șterge contul. Re-autentifică-te și încearcă din nou.');
            }
          },
        },
      ]
    );
  };

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
      label: `Probleme diagnosticate: ${problemCount !== null ? problemCount : '—'}`,
      hideChevron: true,
    },
    ...(!isPro ? [{
      icon: 'diamond-outline' as IoniconsName,
      label: 'Upgrade la Pro',
      onPress: () => navigation.navigate('Paywall'),
    }] : []),
    {
      icon: mode === 'dark' ? 'moon' : 'sunny-outline',
      label: 'Dark Mode',
      rightSwitch: true,
      switchValue: mode === 'dark',
      onSwitchChange: () => toggleTheme(),
      hideChevron: true,
    },
  ];

  const mesteriRows: RowItem[] = [
    {
      icon: 'construct-outline',
      label: 'Fii Meșter',
      onPress: () => navigation.navigate('FiiMester'),
    },
  ];

  const setariRows: RowItem[] = [
    {
      icon: 'notifications-outline',
      label: 'Notificări',
      rightSwitch: true,
      switchValue: notificationsOn,
      onSwitchChange: setNotificationsOn,
      hideChevron: true,
    },
    {
      icon: 'lock-closed-outline',
      label: 'Confidențialitate',
      onPress: () => openLink('https://mesterai.ro/privacy'),
    },
    {
      icon: 'document-text-outline',
      label: 'Termeni și condiții',
      onPress: () => openLink('https://mesterai.ro/terms'),
    },
    {
      icon: 'star-outline',
      label: 'Evaluează aplicația',
      onPress: openStore,
    },
    {
      icon: 'mail-outline',
      label: 'Contact suport',
      onPress: openEmail,
    },
  ];

  const pericolosRows: RowItem[] = [
    {
      icon: 'log-out-outline',
      label: 'Deconectează-te',
      onPress: handleSignOut,
      destructive: true,
    },
    {
      icon: 'trash-outline',
      label: 'Șterge contul',
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
          </>
        )}

        <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
          <Text style={styles.badgeText}>{isPro ? 'PRO 💎' : 'FREE'}</Text>
        </View>
      </View>

      {/* ── Secțiunea Cont ─────────────────────────────────────────────── */}
      <SectionTitle title="Cont" colors={colors} />
      <Card items={contRows} colors={colors} />

      {/* ── Secțiunea Meșteri ──────────────────────────────────────────── */}
      <SectionTitle title="Meșteri" colors={colors} />
      <Card items={mesteriRows} colors={colors} />

      {/* ── Secțiunea Setări ───────────────────────────────────────────── */}
      <SectionTitle title="Setări" colors={colors} />
      <Card items={setariRows} colors={colors} />

      {/* ── Secțiunea Cont periculos ───────────────────────────────────── */}
      <SectionTitle title="Cont" colors={colors} />
      <Card items={pericolosRows} colors={colors} />
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
    marginBottom: 10,
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
