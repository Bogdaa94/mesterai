import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { categories } from '../../theme/colors';
import { Post } from '../../utils/forumHelpers';
import { timeAgo } from '../../utils/timeAgo';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Post['category'], string> = {
  sanitare:    'Sanitare',
  electric:    'Electric',
  constructii: 'Construcții',
  gradina:     'Grădină',
  mobila:      'Mobilă',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  post: Post;
  onPress: (post: Post) => void;
}

export default function PostCard({ post, onPress }: Props) {
  const { colors } = useTheme();
  const cat = categories[post.category];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={() => onPress(post)}
      activeOpacity={0.75}
    >
      {/* ── Author row ─────────────────────────────────────────────────────── */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: cat.light }]}>
          <Text style={[styles.avatarText, { color: cat.primary }]}>
            {post.authorInitials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.textPrimary }]} numberOfLines={1}>
            {post.authorName}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: cat.light }]}>
          <Text style={[styles.categoryText, { color: cat.primary }]}>
            {CATEGORY_LABELS[post.category]}
          </Text>
        </View>
      </View>

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {post.title}
      </Text>

      {/* ── Content preview ────────────────────────────────────────────────── */}
      <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
        {post.content}
      </Text>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="thumbs-up-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{post.votes}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{post.commentsCount}</Text>
        </View>
        {post.resolved && (
          <View style={styles.footerItem}>
            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
            <Text style={[styles.footerText, { color: '#2E7D32' }]}>Rezolvat</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
  },
  authorName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  time: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  categoryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    marginBottom: 5,
    lineHeight: 20,
  },
  content: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
});
