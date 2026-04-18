import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inițializare Admin SDK (o singură dată per cold start)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ── Helper: trimite notificare push ──────────────────────────────────────────

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken as string | undefined;
  if (!fcmToken) return;

  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
    android: {
      notification: { sound: 'default' },
    },
  });

  // Salvează notificarea în subcollecție și incrementează contorul necitite
  const notifRef = db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .doc();

  const batch = db.batch();

  batch.set(notifRef, {
    title,
    body,
    screen: data.screen ?? 'Home',
    ...(data.postId ? { postId: data.postId } : {}),
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(db.collection('users').doc(userId), {
    unreadNotifications: admin.firestore.FieldValue.increment(1),
  });

  await batch.commit();
}

// ── FORUM — răspuns la postarea ta ───────────────────────────────────────────

export const onForumComment = functions.firestore
  .document('forum_posts/{postId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const postSnap = await db
      .collection('forum_posts')
      .doc(context.params.postId)
      .get();
    const post = postSnap.data();

    if (!post) return;
    // Nu notifica autorul propriului comentariu
    if (post.userId === comment.userId) return;

    await sendPushNotification(
      post.userId as string,
      '💬 Răspuns nou',
      `${comment.authorName as string} a răspuns la postarea ta`,
      { screen: 'PostDetail', postId: context.params.postId }
    );
  });

// ── FORUM — vot pozitiv primit ────────────────────────────────────────────────

export const onForumVote = functions.firestore
  .document('forum_posts/{postId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    if ((after.votes as number) > (before.votes as number)) {
      await sendPushNotification(
        after.userId as string,
        '👍 Vot pozitiv',
        'Postarea ta a primit un vot pozitiv! +1 punct',
        { screen: 'Forum' }
      );
    }
  });

// ── FORUM — soluție validată ──────────────────────────────────────────────────

export const onSolutionValidated = functions.firestore
  .document('forum_posts/{postId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (!before.resolved && after.resolved) {
      await sendPushNotification(
        after.userId as string,
        '✅ Soluție validată!',
        'Comunitatea a validat soluția ta! +10 puncte câștigate',
        { screen: 'Forum' }
      );
    }
  });

// ── MEȘTERI — confirmare înregistrare ─────────────────────────────────────────

export const onMesterRegistered = functions.firestore
  .document('mesteri_aplicatii/{mesterId}')
  .onCreate(async (snap) => {
    const mester = snap.data();
    await sendPushNotification(
      mester.userId as string,
      '🎉 Profil activ!',
      'Ești acum înregistrat ca meșter în Mester AI',
      { screen: 'Mesteri' }
    );
  });

// ── MEȘTERI — feedback negativ ────────────────────────────────────────────────

export const onNegativeFeedback = functions.firestore
  .document('rapoarte_mesteri/{reportId}')
  .onCreate(async (snap) => {
    const report = snap.data();

    const mesterSnap = await db
      .collection('mesteri_aplicatii')
      .where('userId', '==', report.mesterUserId)
      .limit(1)
      .get();

    const feedbackCount =
      (mesterSnap.docs[0]?.data()?.feedbackNegativ as number) ?? 0;

    await sendPushNotification(
      report.mesterUserId as string,
      '⚠️ Feedback negativ',
      feedbackCount >= 2
        ? 'Atenție! Încă un feedback negativ duce la suspendarea profilului'
        : 'Ai primit un feedback negativ pe profilul tău',
      { screen: 'Mesteri' }
    );
  });

// ── SISTEM — abonament expiră în 3 zile ──────────────────────────────────────

export const checkExpiringSubscriptions = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Europe/Bucharest')
  .onRun(async () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const usersSnap = await db
      .collection('users')
      .where('isPro', '==', true)
      .where('proExpiresAt', '<=', admin.firestore.Timestamp.fromDate(in3Days))
      .get();

    const sends = usersSnap.docs.map((userDoc) =>
      sendPushNotification(
        userDoc.id,
        '⏰ Abonament Pro',
        'Abonamentul tău Pro expiră în 3 zile. Reînnoiește din aplicație.',
        { screen: 'Paywall' }
      )
    );

    await Promise.all(sends);
  });

// ── SISTEM — Pro activat ──────────────────────────────────────────────────────

export const onProActivated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (!before.isPro && after.isPro) {
      await sendPushNotification(
        context.params.userId,
        '💎 Pro activat!',
        'Bine ai venit în Mester AI Pro! Toate funcțiile sunt deblocate.',
        { screen: 'Home' }
      );
    }
  });
