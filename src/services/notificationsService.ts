/**
 * notificationsService.ts
 *
 * Gestionează permisiunile, înregistrarea token-ului FCM și handlerii
 * pentru notificări push (expo-notifications).
 *
 * NOTĂ TOKEN:
 *  • getDevicePushTokenAsync() → token nativ FCM (Android) / APNs (iOS)
 *    compatibil cu admin.messaging().send() din Cloud Functions.
 *  • Pe iOS în producție ai nevoie de APNs certificates configurate în
 *    Firebase Console → Project Settings → Cloud Messaging.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  doc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Notification handler (foreground) ────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // badge gestionat manual din Firestore
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  screen: string;
  postId?: string;
  read: boolean;
  createdAt: any;
}

export type NotificationNavigate = (
  screen: string,
  params?: Record<string, string>
) => void;

// ── Înregistrare token ────────────────────────────────────────────────────────

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulatoarele / Expo Go nu suportă push-uri reale
    return null;
  }

  // Canal Android (obligatoriu Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mester AI',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
      sound: 'default',
    });
  }

  // Permisiune
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Token nativ FCM (Android) / APNs (iOS) — compatibil cu admin.messaging()
  let fcmToken: string | null = null;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    fcmToken = tokenData.data as string;
  } catch {
    return null;
  }

  // Salvează în Firestore
  try {
    await updateDoc(doc(db, 'users', userId), { fcmToken });
  } catch {
    // Ignorăm dacă documentul nu există încă
  }

  return fcmToken;
}

// ── Navigare din notificare ───────────────────────────────────────────────────

function handleNotificationNavigation(
  data: any,
  navigate: NotificationNavigate
): void {
  if (!data?.screen) return;
  switch (data.screen) {
    case 'PostDetail':
      navigate('PostDetail', { postId: data.postId ?? '' });
      break;
    case 'Forum':
      navigate('Forum');
      break;
    case 'Mesteri':
      navigate('Mesteri');
      break;
    case 'Paywall':
      navigate('Paywall');
      break;
    case 'Home':
      navigate('Home');
      break;
    case 'Notifications':
      navigate('Notifications');
      break;
  }
}

// ── Setup handleri ────────────────────────────────────────────────────────────

export function setupNotificationHandlers(
  navigate: NotificationNavigate
): () => void {
  // Notificare primită cu app-ul în foreground
  const foregroundSub = Notifications.addNotificationReceivedListener(
    (_notification) => {
      // Afișată automat datorită setNotificationHandler de mai sus
    }
  );

  // Tap pe notificare (background / killed state → foreground)
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as any;
      handleNotificationNavigation(data, navigate);
    }
  );

  // Verifică notificarea care a deschis app-ul din stare closed
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      const data = response.notification.request.content.data as any;
      handleNotificationNavigation(data, navigate);
    }
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}

// ── Firestore — citire notificări ─────────────────────────────────────────────

export function listenUnreadCount(
  userId: string,
  onChange: (count: number) => void
): () => void {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    const count: number = snap.data()?.unreadNotifications ?? 0;
    onChange(count);
  });
}

export async function fetchRecentNotifications(
  userId: string
): Promise<AppNotification[]> {
  const ref = collection(db, 'users', userId, 'notifications');
  const snap = await getDocs(
    query(ref, orderBy('createdAt', 'desc'), limit(10))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AppNotification, 'id'>),
  }));
}

export async function markAllRead(
  userId: string,
  notifications: AppNotification[]
): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (!unread.length) return;

  const batch = writeBatch(db);
  for (const n of unread) {
    batch.update(doc(db, 'users', userId, 'notifications', n.id), {
      read: true,
    });
  }
  batch.update(doc(db, 'users', userId), { unreadNotifications: 0 });
  await batch.commit();
}
