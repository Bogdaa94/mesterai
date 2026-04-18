import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';
import {
  AppNotification,
  fetchRecentNotifications,
  markAllRead,
} from '../services/notificationsService';

// ── Screen icon map ────────────────────────────────────────────────────────────

const SCREEN_ICONS: Record<string, string> = {
  PostDetail: '💬',
  Forum:      '🗣️',
  Mesteri:    '🔧',
  Paywall:    '💎',
  Home:       '🏠',
  default:    '🔔',
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors }    = useTheme();
  const { user }      = useAuth();
  const insets        = useSafeAreaInsets();
  const navigation    = useNavigation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRecentNotifications(user.uid)
      .then((notifs) => {
        setNotifications(notifs);
        markAllRead(user.uid, notifs).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.bgNav,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notificări</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={brand.orange} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nicio notificare momentan
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <NotificationItem item={item} colors={colors} />
          )}
        />
      )}
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NotificationItem({
  item,
  colors,
}: {
  item: AppNotification;
  colors: any;
}) {
  const icon = SCREEN_ICONS[item.screen] ?? SCREEN_ICONS.default;

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: item.read ? colors.bgCard : colors.bgPage,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Unread dot */}
      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: brand.orange }]} />
      )}

      {/* Icon */}
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: item.read ? colors.bgPage : 'rgba(255,107,0,0.1)' },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Text */}
      <View style={styles.body}>
        <Text
          style={[
            styles.itemTitle,
            {
              color: colors.textPrimary,
              fontFamily: item.read ? fonts.body : fonts.bodyMedium,
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.itemBody, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        {item.createdAt && (
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {timeAgo(item.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
  },
  placeholder: { width: 36 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 20 },
  body: { flex: 1, gap: 2 },
  itemTitle: {
    fontSize: fontSizes.body,
    lineHeight: 20,
  },
  itemBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.micro + 1,
    lineHeight: 18,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: fontSizes.micro,
    marginTop: 2,
  },
});
