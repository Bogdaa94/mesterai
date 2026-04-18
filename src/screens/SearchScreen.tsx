import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';
import { getForumPosts, Post } from '../utils/forumHelpers';
import { HomeStackParamList } from '../navigation/AppNavigator';

// ── Types ─────────────────────────────────────────────────────────────────────

type HomeNav = StackNavigationProp<HomeStackParamList, 'Search'>;

interface CategoryHit {
  type: 'category';
  id: string;
  label: string;
  icon: string;
  color: string;
  light: string;
}

interface PostHit {
  type: 'post';
  post: Post;
}

type SearchHit = CategoryHit | PostHit;

// ── Static categories ─────────────────────────────────────────────────────────

const CATEGORIES: Omit<CategoryHit, 'type'>[] = [
  { id: 'sanitare',    label: 'Sanitare',    icon: '🔧', color: '#1565C0', light: 'rgba(21,101,192,0.14)'  },
  { id: 'electric',    label: 'Electric',    icon: '⚡', color: '#F9A825', light: 'rgba(249,168,37,0.14)'  },
  { id: 'constructii', label: 'Construcții', icon: '🏗️', color: '#546E7A', light: 'rgba(84,110,122,0.14)'  },
  { id: 'gradina',     label: 'Grădină',     icon: '🪴', color: '#2E7D32', light: 'rgba(46,125,50,0.14)'   },
  { id: 'mobila',      label: 'Mobilă',      icon: '🪵', color: '#5D4037', light: 'rgba(93,64,55,0.14)'    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesQuery(text: string, query: string): boolean {
  return normalize(text).includes(normalize(query));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryResult({
  item,
  onPress,
}: {
  item: Omit<CategoryHit, 'type'>;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.resultRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: item.light }]}>
        <Text style={styles.iconEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.resultBody}>
        <Text style={[styles.resultTitle, { color: colors.textPrimary, fontFamily: fonts.bodyMedium }]}>
          {item.label}
        </Text>
        <Text style={[styles.resultMeta, { color: colors.textSecondary, fontFamily: fonts.body }]}>
          Categorie · Deschide diagnostic
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function PostResult({
  post,
  onPress,
}: {
  post: Post;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const cat = CATEGORIES.find((c) => c.id === post.category);
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.resultRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: cat?.light ?? 'rgba(100,100,100,0.1)' }]}>
        <Text style={styles.iconEmoji}>{cat?.icon ?? '📄'}</Text>
      </View>
      <View style={styles.resultBody}>
        <Text
          style={[styles.resultTitle, { color: colors.textPrimary, fontFamily: fonts.bodyMedium }]}
          numberOfLines={1}
        >
          {post.title}
        </Text>
        <Text style={[styles.resultMeta, { color: colors.textSecondary, fontFamily: fonts.body }]}>
          Forum · {post.authorName} · {post.votes} voturi
        </Text>
      </View>
      {post.resolved && (
        <View style={styles.resolvedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontFamily: fonts.bodyMedium }]}>
      {label}
    </Text>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();

  const [query,   setQuery]   = useState('');
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Fetch all posts once (client-side search, suitable for small dataset)
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getForumPosts('recent', 100),
      getForumPosts('top', 100),
    ])
      .then(([recent, top]) => {
        // Merge and deduplicate by id
        const map = new Map<string, Post>();
        [...recent, ...top].forEach((p) => map.set(p.id, p));
        setPosts(Array.from(map.values()));
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setFetched(true); });
  }, []);

  // ── Build results ─────────────────────────────────────────────────────────

  const trimmed = query.trim();

  const categoryHits: CategoryHit[] = trimmed.length < 2
    ? []
    : CATEGORIES
        .filter((c) => matchesQuery(c.label, trimmed))
        .map((c) => ({ type: 'category', ...c }));

  const postHits: PostHit[] = trimmed.length < 2
    ? []
    : posts
        .filter(
          (p) =>
            matchesQuery(p.title, trimmed) ||
            matchesQuery(p.content, trimmed) ||
            matchesQuery(p.authorName, trimmed)
        )
        .slice(0, 30)
        .map((p) => ({ type: 'post', post: p }));

  // Build flat list with section headers as items
  type ListItem =
    | { key: string; kind: 'header'; label: string }
    | { key: string; kind: 'category'; item: Omit<CategoryHit, 'type'> }
    | { key: string; kind: 'post'; post: Post }
    | { key: string; kind: 'empty' };

  const listData: ListItem[] = [];

  if (trimmed.length >= 2) {
    if (categoryHits.length > 0) {
      listData.push({ key: 'h-cat', kind: 'header', label: 'CATEGORII' });
      categoryHits.forEach((c) =>
        listData.push({ key: `cat-${c.id}`, kind: 'category', item: c })
      );
    }
    if (postHits.length > 0) {
      listData.push({ key: 'h-post', kind: 'header', label: 'FORUM' });
      postHits.forEach((p) =>
        listData.push({ key: `post-${p.post.id}`, kind: 'post', post: p.post })
      );
    }
    if (categoryHits.length === 0 && postHits.length === 0 && fetched) {
      listData.push({ key: 'empty', kind: 'empty' });
    }
  }

  const navigateToDiagnostic = (categoryId: string) => {
    Keyboard.dismiss();
    navigation.navigate('Diagnostic', { categoryId });
  };

  const navigateToPost = (postId: string) => {
    Keyboard.dismiss();
    // PostDetail is in ForumStack — navigate via parent tab
    (navigation as any).navigate('Forum', {
      screen: 'PostDetail',
      params: { postId },
    });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      return <SectionHeader label={item.label} />;
    }
    if (item.kind === 'category') {
      return (
        <CategoryResult
          item={item.item}
          onPress={() => navigateToDiagnostic(item.item.id)}
        />
      );
    }
    if (item.kind === 'post') {
      return (
        <PostResult
          post={item.post}
          onPress={() => navigateToPost(item.post.id)}
        />
      );
    }
    // empty
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.body }]}>
          Niciun rezultat pentru „{trimmed}"
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Search header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgNav,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === 'android' ? spacing.md : spacing.sm),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Caută categorii, întrebări forum..."
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              backgroundColor: colors.bgCard,
              borderColor: colors.border,
              fontFamily: fonts.body,
            },
          ]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {loading && (
          <ActivityIndicator size="small" color={brand.orange} style={{ marginLeft: spacing.sm }} />
        )}
      </View>

      {/* Results */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        ListEmptyComponent={
          trimmed.length < 2 ? (
            <View style={styles.hintWrap}>
              <Ionicons name="search" size={40} color={colors.border} style={{ marginBottom: spacing.lg }} />
              <Text style={[styles.hintText, { color: colors.textSecondary, fontFamily: fonts.body }]}>
                Scrie cel puțin 2 caractere pentru a căuta
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  input: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.body,
  },

  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  sectionHeader: {
    fontSize: fontSizes.label,
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 18 },
  resultBody: { flex: 1 },
  resultTitle: { fontSize: fontSizes.body, marginBottom: 2 },
  resultMeta: { fontSize: fontSizes.micro, lineHeight: 15 },
  resolvedBadge: { marginRight: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: fontSizes.body, textAlign: 'center' },

  hintWrap: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  hintText: { fontSize: fontSizes.body, textAlign: 'center' },
});
