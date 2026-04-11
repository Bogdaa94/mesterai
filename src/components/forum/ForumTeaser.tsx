import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme } from '../../context/ThemeContext';
import { brand } from '../../theme/colors';
import { getForumPosts, Post } from '../../utils/forumHelpers';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { db } from '../../firebase/config';
import PostCard from './PostCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForumStats {
  members: number;
  posts: number;
  resolvedPercent: number;
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats, colors }: { stats: ForumStats | null; colors: any }) {
  const items = [
    { label: 'Membri', value: stats?.members ?? '—' },
    { label: 'Posturi', value: stats?.posts ?? '—' },
    { label: 'Rezolvate', value: stats ? `${stats.resolvedPercent}%` : '—' },
  ];
  return (
    <View style={[statsStyles.bar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[statsStyles.divider, { backgroundColor: colors.border }]} />}
          <View style={statsStyles.item}>
            <Text style={[statsStyles.value, { color: colors.textPrimary }]}>{String(item.value)}</Text>
            <Text style={[statsStyles.label, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const statsStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  value: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  label: { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  divider: { width: 1 },
});

// ─── Benefits list ────────────────────────────────────────────────────────────

const BENEFITS = [
  'Toate posturile + filtre avansate',
  'Comentează și primești răspunsuri',
  'Câștigă puncte → reduceri Pro',
  'Soluțiile tale intră în AI',
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ForumTeaser() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [previewPosts, setPreviewPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);

  useEffect(() => {
    getForumPosts('top', 3).then(setPreviewPosts).catch(() => {});
    getDoc(doc(db, 'forum_stats', 'global'))
      .then((snap) => { if (snap.exists()) setStats(snap.data() as ForumStats); })
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>💬 Forum Comunitate</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Întreabă, răspunde, câștigă puncte
      </Text>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <StatsBar stats={stats} colors={colors} />

      {/* ── Blurred preview ────────────────────────────────────────────────── */}
      <View style={styles.previewContainer}>
        {/* Posts preview with reduced opacity */}
        <View style={styles.postsBlurred} pointerEvents="none">
          {previewPosts.map((post) => (
            <PostCard key={post.id} post={post} onPress={() => {}} />
          ))}
          {previewPosts.length === 0 && (
            <View style={[styles.fakePosts, { backgroundColor: colors.bgCard, borderColor: colors.border }]} />
          )}
        </View>

        {/* Overlay */}
        <View style={[styles.overlay, { backgroundColor: colors.bgPage }]}>
          <View style={[styles.lockCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>
              Forum exclusiv Pro
            </Text>
            <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
              Accesează toate posturile, comentează și câștigă puncte pentru reduceri
            </Text>

            {/* Benefits */}
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={brand.orange} />
                  <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{b}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Paywall')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeBtnText}>Upgrade la Pro 💎</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  previewContainer: {
    position: 'relative',
  },
  postsBlurred: {
    opacity: 0.18,
  },
  fakePosts: {
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 20,
    opacity: 0.97,
  },
  lockCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  lockTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 19,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  benefits: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    flex: 1,
  },
  upgradeBtn: {
    backgroundColor: brand.orange,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
