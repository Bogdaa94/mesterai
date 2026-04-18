import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { brand, categories as catColors } from '../../theme/colors';
import { timeAgo } from '../../utils/timeAgo';
import {
  Post,
  Comment,
  subscribeToPost,
  subscribeToComments,
  votePost,
  markResolved,
  addComment,
  containsUrl,
  awardPoints,
} from '../../utils/forumHelpers';
import { checkForumCommentLimit, incrementForumCommentCount } from '../../firebase/firestore';
import { ForumStackParamList } from '../../navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteP = RouteProp<ForumStackParamList, 'PostDetail'>;

const CATEGORY_LABELS: Record<Post['category'], string> = {
  sanitare:    'Sanitare',
  electric:    'Electric',
  constructii: 'Construcții',
  gradina:     'Grădină',
  mobila:      'Mobilă',
};

// ─── Comment bubble ───────────────────────────────────────────────────────────

function CommentBubble({ comment, colors }: { comment: Comment; colors: any }) {
  const initials = comment.authorInitials || comment.authorName.charAt(0).toUpperCase();
  return (
    <View style={cb.row}>
      <View style={[cb.avatar, { backgroundColor: brand.orangeShadow }]}>
        <Text style={cb.avatarText}>{initials}</Text>
      </View>
      <View style={[cb.bubble, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={cb.header}>
          <Text style={[cb.author, { color: colors.textPrimary }]}>{comment.authorName}</Text>
          <Text style={[cb.time, { color: colors.textSecondary }]}>
            {comment.createdAt ? timeAgo(comment.createdAt) : ''}
          </Text>
        </View>
        <Text style={[cb.content, { color: colors.textPrimary }]}>{comment.content}</Text>
      </View>
    </View>
  );
}

const cb = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 10, marginBottom: 12 },
  avatar:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: brand.orange },
  bubble:     { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  author:     { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  time:       { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  content:    { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<ForumStackParamList>>();
  const route = useRoute<RouteP>();
  const { postId } = route.params;

  const [post, setPost]         = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [voting, setVoting]     = useState(false);
  const [resolving, setResolving] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ── Listeners ────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = subscribeToPost(postId, (p) => {
      setPost(p);
      setLoadingPost(false);
    });
    return unsub;
  }, [postId]);

  useEffect(() => {
    const unsub = subscribeToComments(postId, setComments);
    return unsub;
  }, [postId]);

  // ── Vote ─────────────────────────────────────────────────────────────────

  const handleVote = async () => {
    if (!user || !post || voting) return;

    const alreadyVoted = (post.votedBy ?? []).includes(user.uid);
    if (alreadyVoted) {
      Alert.alert('Ai votat deja', 'Poți vota o singură dată per postare.');
      return;
    }
    if (post.userId === user.uid) {
      Alert.alert('Nu poți vota', 'Nu poți vota propria postare.');
      return;
    }

    setVoting(true);
    try {
      const registered = await votePost(postId, user.uid);
      if (registered) {
        // fire-and-forget — votul e deja înregistrat, punctele sunt un bonus
        awardPoints(user.uid, 'vote', `Vot pozitiv la "${post.title.slice(0, 40)}"`)
          .catch(() => {});
      }
    } catch {
      Alert.alert('Eroare', 'Nu am putut înregistra votul. Încearcă din nou.');
    } finally {
      setVoting(false);
    }
  };

  // ── Resolve ───────────────────────────────────────────────────────────────

  const handleResolve = () => {
    if (!user || !post || resolving) return;
    Alert.alert(
      'Marchează ca rezolvat',
      'Confirmi că această postare a primit o soluție?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Da, rezolvat',
          onPress: async () => {
            setResolving(true);
            try {
              await markResolved(postId);
              // fire-and-forget — postarea e deja marcată, punctele sunt un bonus
              awardPoints(post.userId, 'solution', `Soluție validată: "${post.title.slice(0, 40)}"`)
                .catch(() => {});
            } catch {
              Alert.alert('Eroare', 'Nu am putut marca postarea. Încearcă din nou.');
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  // ── Add comment ───────────────────────────────────────────────────────────

  const handleSendComment = async () => {
    if (!user || !post || !commentText.trim() || sendingComment) return;
    const text = commentText.trim();

    // URL detection
    if (containsUrl(text)) {
      Alert.alert('Link-uri interzise', 'Comentariile nu pot conține link-uri sau adrese web.');
      return;
    }

    // Rate limit check
    const { hasReachedLimit, count } = await checkForumCommentLimit(user.uid);
    if (hasReachedLimit) {
      Alert.alert(
        'Limită atinsă',
        `Poți adăuga maxim 10 comentarii pe zi. Ai adăugat deja ${count}. Revino mâine!`,
      );
      return;
    }

    setCommentText('');
    setSendingComment(true);
    try {
      const displayName = user.displayName ?? user.email ?? 'Utilizator';
      const initials = displayName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      await addComment(postId, {
        userId:         user.uid,
        authorName:     displayName,
        authorInitials: initials,
        content:        text,
      });
      await incrementForumCommentCount(user.uid);
      // Scroll la ultimul comentariu
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch {
      setCommentText(text); // restaurează textul dacă a eșuat
      Alert.alert('Eroare', 'Nu am putut trimite comentariul.');
    } finally {
      setSendingComment(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadingPost) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgPage, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgPage, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <Text style={[styles.missingText, { color: colors.textSecondary }]}>
          Postarea nu mai există.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: brand.orange, fontFamily: 'DMSans_500Medium' }}>← Înapoi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cat           = catColors[post.category] ?? { primary: brand.orange, light: brand.orangeShadow };
  const alreadyVoted  = (post.votedBy ?? []).includes(user?.uid ?? '');
  const isAuthor      = post.userId === user?.uid;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.bgApp, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {post.title}
        </Text>
        {post.resolved && (
          <View style={styles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Post card ──────────────────────────────────────────────────── */}
        <View style={[styles.postCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>

          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: cat.light }]}>
              <Text style={[styles.avatarText, { color: cat.primary }]}>
                {post.authorInitials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.textPrimary }]}>{post.authorName}</Text>
              <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                {post.createdAt ? timeAgo(post.createdAt) : ''}
              </Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: cat.light }]}>
              <Text style={[styles.categoryText, { color: cat.primary }]}>
                {CATEGORY_LABELS[post.category]}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.postTitle, { color: colors.textPrimary }]}>{post.title}</Text>

          {/* Content */}
          <Text style={[styles.postContent, { color: colors.textPrimary }]}>{post.content}</Text>

          {/* Resolved banner */}
          {post.resolved && (
            <View style={styles.resolvedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
              <Text style={styles.resolvedBannerText}>Problemă rezolvată</Text>
            </View>
          )}

          {/* Actions row */}
          <View style={styles.actionsRow}>
            {/* Vote button */}
            <TouchableOpacity
              style={[
                styles.voteBtn,
                alreadyVoted
                  ? { backgroundColor: brand.orange }
                  : { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={handleVote}
              disabled={voting || alreadyVoted || isAuthor}
              activeOpacity={0.75}
            >
              {voting ? (
                <ActivityIndicator size="small" color={alreadyVoted ? '#fff' : brand.orange} />
              ) : (
                <Ionicons
                  name={alreadyVoted ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={16}
                  color={alreadyVoted ? '#fff' : colors.textSecondary}
                />
              )}
              <Text style={[styles.voteBtnText, { color: alreadyVoted ? '#fff' : colors.textSecondary }]}>
                {post.votes} {post.votes === 1 ? 'vot' : 'voturi'}
              </Text>
            </TouchableOpacity>

            {/* Comments count */}
            <View style={styles.commentsCount}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.commentsCountText, { color: colors.textSecondary }]}>
                {comments.length} {comments.length === 1 ? 'comentariu' : 'comentarii'}
              </Text>
            </View>

            {/* Mark resolved — only post author, only if not yet resolved */}
            {isAuthor && !post.resolved && (
              <TouchableOpacity
                style={styles.resolveBtn}
                onPress={handleResolve}
                disabled={resolving}
                activeOpacity={0.75}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color="#2E7D32" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#2E7D32" />
                    <Text style={styles.resolveBtnText}>Rezolvat</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Comments section ───────────────────────────────────────────── */}
        <Text style={[styles.commentsLabel, { color: colors.textSecondary }]}>
          COMENTARII ({comments.length})
        </Text>

        {comments.length === 0 ? (
          <View style={styles.noComments}>
            <Ionicons name="chatbubble-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>
              Fii primul care comentează
            </Text>
          </View>
        ) : (
          comments.map((c) => (
            <CommentBubble key={c.id} comment={c} colors={colors} />
          ))
        )}
      </ScrollView>

      {/* ── Comment input ────────────────────────────────────────────────── */}
      <View style={[
        styles.inputBar,
        {
          backgroundColor: colors.bgApp,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 8,
        },
      ]}>
        <TextInput
          style={[styles.commentInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Adaugă un comentariu..."
          placeholderTextColor={colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={600}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!commentText.trim() || sendingComment) && { opacity: 0.4 }]}
          onPress={handleSendComment}
          disabled={!commentText.trim() || sendingComment}
          activeOpacity={0.75}
        >
          {sendingComment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  missingText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
  backBtn: { marginTop: 8, padding: 8 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
  },
  resolvedBadge: { flexShrink: 0 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Post card
  postCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText:    { fontFamily: 'Syne_700Bold', fontSize: 16 },
  authorName:    { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  postTime:      { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 1 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  categoryText:  { fontFamily: 'DMSans_500Medium', fontSize: 11 },
  postTitle:     { fontFamily: 'Syne_700Bold', fontSize: 17, lineHeight: 24 },
  postContent:   { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22 },

  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,125,50,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  resolvedBannerText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#2E7D32',
  },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  voteBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },

  commentsCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentsCountText: { fontFamily: 'DMSans_400Regular', fontSize: 13 },

  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.1)',
  },
  resolveBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#2E7D32',
  },

  // Comments
  commentsLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  noComments: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  noCommentsText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
