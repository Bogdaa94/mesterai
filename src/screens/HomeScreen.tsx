import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';
import { HomeStackParamList } from '../navigation/AppNavigator';

// ── Types ─────────────────────────────────────────────────────────────────────

type HomeNav = StackNavigationProp<HomeStackParamList, 'Home'>;

interface Category {
  id: string;
  label: string;
  sub: string;
  icon: string;
  color: string;
  light: string;
}

interface Activity {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  time: string;
  status: 'Rezolvat' | 'În progres';
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'sanitare',    label: 'Sanitare',    sub: 'Robinete · Țevi · WC',      icon: '🔧', color: '#1565C0', light: 'rgba(21,101,192,0.14)'  },
  { id: 'electric',    label: 'Electric',    sub: 'Prize · Tablouri · LED',     icon: '⚡', color: '#F9A825', light: 'rgba(249,168,37,0.14)'  },
  { id: 'constructii', label: 'Construcții', sub: 'Zidărie · Izolații',         icon: '🏗️', color: '#546E7A', light: 'rgba(84,110,122,0.14)'  },
  { id: 'gradina',     label: 'Grădină',     sub: 'Irigații · Peisagistică',    icon: '🪴', color: '#2E7D32', light: 'rgba(46,125,50,0.14)'   },
  { id: 'mobila',      label: 'Mobilă',      sub: 'Montaj · Reparații',         icon: '🪵', color: '#5D4037', light: 'rgba(93,64,55,0.14)'    },
];

const MOCK_ACTIVITY: Activity = {
  id: '1',
  title: 'Robinet care picură la bucătărie',
  categoryId: 'sanitare',
  categoryLabel: 'Sanitare',
  time: 'Acum 2 ore',
  status: 'Rezolvat',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.bgNav, borderBottomColor: colors.border }]}>
      <View style={styles.logoRow}>
        <Text style={[styles.logoText, { color: colors.textPrimary }]}>
          Mester
        </Text>
        <View style={styles.logoDot} />
        <Text style={[styles.logoText, { color: colors.textPrimary }]}>
          AI
        </Text>
      </View>
      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.bgCard }]} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function SearchBar() {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeNav>();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={() => navigation.getParent()?.navigate('Caută')}
    >
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
      <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
        Descrie problema ta...
      </Text>
    </TouchableOpacity>
  );
}

function CategoryCard({ item, fullWidth }: { item: Category; fullWidth?: boolean }) {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeNav>();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('Category', { categoryId: item.id })}
      style={[
        styles.categoryCard,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          width: fullWidth ? '100%' : '48%',
        },
      ]}
    >
      {/* Arrow top-right */}
      <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>

      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: item.light }]}>
        <Text style={styles.iconEmoji}>{item.icon}</Text>
      </View>

      {/* Labels */}
      <Text style={[styles.categoryLabel, { color: item.color, fontFamily: fonts.subheading }]}>
        {item.label}
      </Text>
      <Text style={[styles.categorySub, { color: colors.textSecondary, fontFamily: fonts.body }]}>
        {item.sub}
      </Text>
    </TouchableOpacity>
  );
}

function ActivityCard({ item }: { item: Activity }) {
  const { colors } = useTheme();
  const dotColor = CATEGORIES.find(c => c.id === item.categoryId)?.color ?? brand.orange;
  return (
    <View style={[styles.activityCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
      <View style={styles.activityBody}>
        <Text style={[styles.activityTitle, { color: colors.textPrimary, fontFamily: fonts.bodyMedium }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.activityMeta, { color: colors.textSecondary, fontFamily: fonts.body }]}>
          {item.categoryLabel} · {item.time}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.status}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();

  // Split categories: first 4 in pairs, last one full-width
  const pairRows = CATEGORIES.slice(0, 4);
  const lastCategory = CATEGORIES[4];

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingSub, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            Bună ziua 👋
          </Text>
          <Text style={[styles.greetingMain, { color: colors.textPrimary, fontFamily: fonts.heading }]}>
            Cu ce te ajutăm azi?
          </Text>
        </View>

        {/* Search */}
        <SearchBar />

        {/* Categories */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: fonts.bodyMedium }]}>
          CATEGORII
        </Text>

        {/* 2-column grid for first 4 */}
        <View style={styles.grid}>
          {pairRows.map(item => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </View>

        {/* Last item full-width */}
        <CategoryCard item={lastCategory} fullWidth />

        {/* Last Activity */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: fonts.bodyMedium, marginTop: spacing.xl }]}>
          ULTIMA ACTIVITATE
        </Text>
        <ActivityCard item={MOCK_ACTIVITY} />

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Category', { categoryId: 'sanitare' })}
          style={styles.cta}
        >
          <Text style={[styles.ctaText, { fontFamily: fonts.subheading }]}>
            + Problemă nouă →
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
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  logoText: { fontSize: fontSizes.logo, fontFamily: fonts.heading },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.orange,
    marginHorizontal: 2,
    marginBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
