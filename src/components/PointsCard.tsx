import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { PointsTransaction } from '../firebase/firestore';
import { pointsToRON, pointsUntilMax } from '../utils/forumHelpers';
import { timeAgo } from '../utils/timeAgo';
import { RootStackParamList } from '../navigation/AppNavigator';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POINTS = 400;

const HOW_TO_EARN = [
  { action: '✍️', label: 'Postare nouă în forum',            points: '+5 pts' },
  { action: '💬', label: 'Comentariu primit pe postarea ta', points: '+2 pts' },
  { action: '👍', label: 'Vot pozitiv primit',               points: '+1 pt'  },
  { action: '✅', label: 'Soluție validată de comunitate',   points: '+10 pts' },
];

const ACTION_ICONS: Record<string, string> = {
  post:     '✍️',
  comment:  '💬',
  vote:     '👍',
  solution: '✅',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  points: number;
  pointsHistory: PointsTransaction[];
  isPro: boolean;
}

export default function PointsCard({ points, pointsHistory, isPro }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [showHowTo, setShowHowTo] = useState(false);

  const ron       = pointsToRON(points);
  const remaining = pointsUntilMax(points);
  const progress  = Math.min(points / MAX_POINTS, 1);
  const recentHistory = [...pointsHistory].reverse().slice(0, 5);
  const hasPoints = points > 0;

  return (
    <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.headerRow}>
        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Punctele mele</Text>
        {isPro && (
          <View style={s.proBadge}>
            <Text style={s.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      {/* ── Points display ─────────────────────────────────────────────────── */}
      <View style={s.pointsRow}>
        <Text style={s.pointsNumber}>{points}</Text>
        <Text style={[s.pointsLabel, { color: colors.textSecondary }]}>puncte</Text>
        <View style={s.ronBadge}>
          <Text style={s.ronText}>≈ {ron} RON reducere</Text>
        </View>
      </View>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <View style={[s.progressTrack, { backgroundColor: colors.bgCard2 }]}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
        {remaining > 0
          ? `${remaining} puncte până la reducerea maximă de 40 RON`
          : '🎉 Ai atins reducerea maximă de 40 RON!'}
      </Text>

      {/* ── Cum câștig puncte (collapsible) ───────────────────────────────── */}
      <TouchableOpacity
        style={[s.howToHeader, { borderTopColor: colors.border }]}
        onPress={() => setShowHowTo(!showHowTo)}
        activeOpacity={0.7}
      >
        <Text style={[s.howToTitle, { color: colors.textPrimary }]}>Cum câștig puncte</Text>
        <Ionicons
          name={showHowTo ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {showHowTo && (
        <View style={s.howToList}>
          {HOW_TO_EARN.map((item) => (
            <View key={item.label} style={s.howToRow}>
              <Text style={s.howToEmoji}>{item.action}</Text>
              <Text style={[s.howToLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={s.howToPoints}>{item.points}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Istoric recent ─────────────────────────────────────────────────── */}
      {recentHistory.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { color: colors.textSecondary, borderTopColor: colors.border }]}>
            Istoric recent
          </Text>
          {recentHistory.map((tx, i) => (
            <View key={i} style={s.historyRow}>
              <Text style={s.historyEmoji}>{ACTION_ICONS[tx.action] ?? '⭐'}</Text>
              <Text style={[s.historyDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                {tx.description}
              </Text>
              <View style={s.historyRight}>
                <Text style={s.historyPoints}>+{tx.points}</Text>
                <Text style={[s.historyTime, { color: colors.textSecondary }]}>
                  {timeAgo(tx.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          s.ctaBtn,
          !hasPoints && { opacity: 0.45 },
        ]}
        onPress={() => { if (hasPoints) navigation.navigate('Paywall'); }}
        disabled={!hasPoints}
        activeOpacity={0.8}
      >
        <Ionicons name="diamond-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.ctaText}>
          {hasPoints
            ? isPro ? 'Aplică la reînnoire Pro' : 'Folosește la upgrade Pro'
            : 'Câștigă puncte postând în forum'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
  },
  proBadge: {
    backgroundColor: brand.orange,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },

  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pointsNumber: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 38,
    color: brand.orange,
    lineHeight: 44,
  },
  pointsLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  ronBadge: {
    backgroundColor: 'rgba(255,107,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  ronText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: brand.orange,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: brand.orange,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: 4,
  },

  howToHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  howToTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  howToList: { marginBottom: 4 },
  howToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 8,
  },
  howToEmoji: { fontSize: 15, width: 22 },
  howToLabel: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  howToPoints: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: brand.orange,
  },

  sectionLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyEmoji: { fontSize: 15, width: 22 },
  historyDesc:  { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  historyRight: { alignItems: 'flex-end' },
  historyPoints: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: brand.orange,
  },
  historyTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    marginTop: 1,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.orange,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 16,
  },
  ctaText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
