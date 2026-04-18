import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';
import { HomeStackParamList, RootStackParamList } from '../navigation/AppNavigator';
import { db } from '../firebase/config';
import { ProblemData } from '../firebase/firestore';
import { timeAgo } from '../utils/timeAgo';
import { listenUnreadCount } from '../services/notificationsService';
import { useTranslation } from 'react-i18next';

// ── Types ─────────────────────────────────────────────────────────────────────

type HomeNav = StackNavigationProp<HomeStackParamList, 'Home'>;

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORY_META = [
  { id: 'sanitare',    icon: '🔧', color: '#1565C0', light: 'rgba(21,101,192,0.14)'  },
  { id: 'electric',    icon: '⚡', color: '#F9A825', light: 'rgba(249,168,37,0.14)'  },
  { id: 'constructii', icon: '🏗️', color: '#546E7A', light: 'rgba(84,110,122,0.14)'  },
  { id: 'gradina',     icon: '🪴', color: '#2E7D32', light: 'rgba(46,125,50,0.14)'   },
  { id: 'mobila',      icon: '🪵', color: '#5D4037', light: 'rgba(93,64,55,0.14)'    },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SearchBar() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNav>();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={() => navigation.navigate('Search')}
    >
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
      <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
        {t('home.search')}
      </Text>
    </TouchableOpacity>
  );
}

function Header({
  unreadCount,
  onBellPress,
}: {
  unreadCount: number;
  onBellPress: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: colors.bgNav, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.bgCard }]}
        activeOpacity={0.7}
        onPress={onBellPress}
      >
        <Ionicons
          name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
          size={20}
          color={unreadCount > 0 ? brand.orange : colors.textSecondary}
        />
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

type CategoryMeta = { id: string; icon: string; color: string; light: string };

function CategoryCard({ item, fullWidth }: { item: CategoryMeta; fullWidth?: boolean }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNav>();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('Diagnostic', { categoryId: item.id })}
      style={[
        styles.categoryCard,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          width: fullWidth ? '100%' : '48%',
        },
      ]}
    >
      <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
      <View style={[styles.iconCircle, { backgroundColor: item.light }]}>
        <Text style={styles.iconEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryLabel, { color: item.color, fontFamily: fonts.subheading }]}>
        {t(`categories.${item.id}`)}
      </Text>
      <Text style={[styles.categorySub, { color: colors.textSecondary, fontFamily: fonts.body }]}>
        {t(`categories.${item.id}Sub`)}
      </Text>
    </TouchableOpacity>
  );
}

function ActivityCard({ problem }: { problem: ProblemData & { id: string } }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const meta = CATEGORY_META.find(c => c.id === problem.category);
  const dotColor = meta?.color ?? brand.orange;
  const status = problem.resolved ? t('home.solved') : t('home.inProgress');
  return (
    <View style={[styles.activityCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
      <View style={styles.activityBody}>
        <Text style={[styles.activityTitle, { color: colors.textPrimary, fontFamily: fonts.bodyMedium }]} numberOfLines={1}>
          {problem.description}
        </Text>
        <Text style={[styles.activityMeta, { color: colors.textSecondary, fontFamily: fonts.body }]}>
          {t(`categories.${problem.category}`, { defaultValue: problem.category })} · {problem.createdAt ? timeAgo(problem.createdAt) : '—'}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{status}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [lastProblem, setLastProblem] = useState<(ProblemData & { id: string }) | null>(null);
  const [unreadCount, setUnreadCount]  = useState(0);

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'problems');
    getDocs(query(ref, orderBy('createdAt', 'desc'), limit(1)))
      .then((snap) => {
        if (!snap.empty) {
          setLastProblem({ id: snap.docs[0].id, ...(snap.docs[0].data() as ProblemData) });
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenUnreadCount(user.uid, setUnreadCount);
  }, [user]);

  const pairRows = CATEGORY_META.slice(0, 4);
  const lastCategory = CATEGORY_META[4];

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <Header
        unreadCount={unreadCount}
        onBellPress={() => rootNavigation.navigate('Notifications')}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingSub, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('home.greeting')}
          </Text>
          <Text style={[styles.greetingMain, { color: colors.textPrimary, fontFamily: fonts.heading }]}>
            {t('home.title')}
          </Text>
        </View>

        {/* Search */}
        <SearchBar />

        {/* Categories */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: fonts.bodyMedium }]}>
          {t('home.categories')}
        </Text>

        <View style={styles.grid}>
          {pairRows.map(item => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </View>

        <CategoryCard item={lastCategory} fullWidth />

        {/* Last Activity */}
        {lastProblem && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: fonts.bodyMedium, marginTop: spacing.xl }]}>
              {t('home.lastActivity')}
            </Text>
            <ActivityCard problem={lastProblem} />
          </>
        )}

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Diagnostic', { categoryId: 'sanitare' })}
          style={styles.cta}
        >
          <Text style={[styles.ctaText, { fontFamily: fonts.subheading }]}>
            {t('home.newProblem')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: fonts.heading,
    lineHeight: 12,
  },

  // Scroll
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

  // Greeting
  greeting: { marginBottom: spacing.xl },
  greetingSub: { fontSize: fontSizes.body, marginBottom: spacing.xs },
  greetingMain: { fontSize: fontSizes.h1 + 4 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  searchPlaceholder: { fontSize: fontSizes.body },

  // Section label
  sectionLabel: {
    fontSize: fontSizes.label,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  // Category grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 120,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  arrow: { position: 'absolute', top: spacing.md, right: spacing.lg, fontSize: 20 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconEmoji: { fontSize: 22 },
  categoryLabel: { fontSize: fontSizes.h2, marginBottom: 2 },
  categorySub: { fontSize: fontSizes.micro, lineHeight: 15 },

  // Activity
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: fontSizes.body, marginBottom: 2 },
  activityMeta: { fontSize: fontSizes.micro, lineHeight: 16 },
  badge: {
    backgroundColor: brand.orangeShadow,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { color: brand.orange, fontSize: fontSizes.micro, fontFamily: fonts.bodyMedium },

  // CTA
  cta: {
    marginTop: spacing.xl,
    backgroundColor: brand.orange,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: { color: '#FFFFFF', fontSize: fontSizes.h2 },
});
