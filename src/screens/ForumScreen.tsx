import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { brand } from '../theme/colors';
import { getForumPosts, Post, ForumFilter } from '../utils/forumHelpers';
import { ForumStackParamList, RootStackParamList } from '../navigation/AppNavigator';
import { db } from '../firebase/config';
import PostCard from '../components/forum/PostCard';
import ForumTeaser from '../components/forum/ForumTeaser';

// ─── Types ────────────────────────────────────────────────────────────────────

type ForumNavProp = CompositeNavigationProp<
  StackNavigationProp<ForumStackParamList, 'ForumMain'>,
  StackNavigationProp<RootStackParamList>
>;

interface ForumStats {
  members: number;
  posts: number;
  resolvedPercent: number;
}

interface FilterOption {
  key: ForumFilter;
  label: string;
}

const FILTERS: FilterOption[] = [
  { key: 'top',         label: '🔥 Top voturi'  },
  { key: 'recent',      label: '🆕 Recente'     },
  { key: 'sanitare',    label: '🔧 Sanitare'    },
  { key: 'electric',    label: '⚡ Electric'    },
  { key: 'constructii', label: '🏗️ Construcții' },
  { key: 'gradina',     label: '🪴 Grădină'     },
  { key: 'mobila',      label: '🪵 Mobilă'      },
];

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats, colors }: { stats: ForumStats | null; colors: any }) {
  const items = [
    { label: 'Membri',    value: stats?.members ?? '—'               },
    { label: 'Posturi',   value: stats?.posts ?? '—'                 },
    { label: 'Rezolvate', value: stats ? `${stats.resolvedPercent}%` : '—' },
  ];
  return (
    <View style={[sbStyles.bar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[sbStyles.divider, { backgroundColor: colors.border }]} />}
          <View style={sbStyles.item}>
            <Text style={[sbStyles.value, { color: colors.textPrimary }]}>{String(item.value)}</Text>
            <Text style={[sbStyles.label, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const sbStyles = StyleSheet.create({
  bar:     { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  item:    { flex: 1, alignItems: 'center', paddingVertical: 12 },
  value:   { fontFamily: 'Syne_700Bold', fontSize: 18 },
  label:   { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  divider: { width: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ForumScreen() {
  const { colors } = useTheme();
  const { isPro } = usePro();
  const navigation = useNavigation<ForumNavProp>();
  const insets = useSafeAreaInsets();

  // All hooks must be declared before any conditional return
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<ForumFilter>('top');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const data = await getForumPosts(activeFilter);
      setPosts(data);
    } catch {
      Alert.alert('Eroare', 'Nu am putut încărca posturile. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, isPro]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    if (!isPro) return;
    getDoc(doc(db, 'forum_stats', 'global'))
      .then((snap) => { if (snap.exists()) setStats(snap.data() as ForumStats); })
      .catch(() => {});
  }, [isPro]);

  // ── Free users ───────────────────────────────────────────────────────────

  if (!isPro) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ForumTeaser />
      </View>
    );
  }

  // ── Filter posts locally by search ──────────────────────────────────────

  const filteredPosts = searchQuery.trim()
    ? posts.filter((p) => {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      })
    : posts;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const handleNewPost = () => {
    navigation.navigate('NewPost');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.bgPage }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>💬 Forum Comunitate</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Întreabă, răspunde, câștigă puncte
        </Text>

        <StatsBar stats={stats} colors={colors} />

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Caută în forum..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterTab,
                  active
                    ? { backgroundColor: brand.orange }
                    : { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 },
                ]}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Posts list ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={brand.orange} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} onPress={handlePostPress} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Niciun rezultat pentru căutare.' : 'Niciun post în această categorie.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FAB: Postează ────────────────────────────────────────────────── */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.fab} onPress={handleNewPost} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.fabText}>Postează o întrebare</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 22,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    marginBottom: 16,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    padding: 0,
  },

  filtersScroll:   { marginBottom: 4 },
  filtersContent:  { paddingRight: 16, gap: 8 },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },

  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  empty:       { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText:   { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center' },

  fabWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 15,
  },
  fabText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    color: '#fff',
  },
});
