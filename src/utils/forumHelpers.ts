import {
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostCategory = 'sanitare' | 'electric' | 'constructii' | 'gradina' | 'mobila';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  authorName: string;
  authorInitials: string;
  userId: string;
  votes: number;
  votedBy: string[];      // deduplicare voturi
  commentsCount: number;
  createdAt: Timestamp;
  resolved: boolean;
  addedToRAG: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  authorName: string;
  authorInitials: string;
  content: string;
  createdAt: Timestamp;
}

export type ForumFilter = 'top' | 'recent' | PostCategory;

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getForumPosts(
  filter: ForumFilter,
  limitCount = 20
): Promise<Post[]> {
  const ref = collection(db, 'forum_posts');

  let q;
  if (filter === 'top') {
    q = query(ref, orderBy('votes', 'desc'), limit(limitCount));
  } else if (filter === 'recent') {
    q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
  } else {
    q = query(
      ref,
      where('category', '==', filter),
      orderBy('votes', 'desc'),
      limit(limitCount)
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ votedBy: [], ...d.data(), id: d.id } as unknown as Post));
}

export function subscribeToPost(
  postId: string,
  onUpdate: (post: Post | null) => void
): () => void {
  const ref = doc(db, 'forum_posts', postId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { onUpdate(null); return; }
    onUpdate({ votedBy: [], ...snap.data(), id: snap.id } as unknown as Post);
  });
}

export async function createPost(
  post: Omit<Post, 'id' | 'votes' | 'votedBy' | 'commentsCount' | 'createdAt' | 'resolved' | 'addedToRAG'>
): Promise<string> {
  const ref = collection(db, 'forum_posts');
  const docRef = await addDoc(ref, {
    ...post,
    votes: 0,
    votedBy: [],
    commentsCount: 0,
    createdAt: serverTimestamp(),
    resolved: false,
    addedToRAG: false,
  });
  // Actualizează contorul global
  await updateForumStats({ posts: 1 });
  return docRef.id;
}

/**
 * Votează un post — atomic via Firestore transaction.
 * Previne dublu-vot: dacă userId e deja în votedBy, returnează false fără scriere.
 * Returnează true dacă votul a fost înregistrat, false dacă era deja votat.
 */
export async function votePost(postId: string, userId: string): Promise<boolean> {
  const ref = doc(db, 'forum_posts', postId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return false;

    const votedBy: string[] = snap.data().votedBy ?? [];
    if (votedBy.includes(userId)) return false; // deja votat — nu scriem nimic

    tx.update(ref, {
      votes:   increment(1),
      votedBy: arrayUnion(userId),
    });
    return true;
  });
}

export async function markResolved(postId: string): Promise<void> {
  const ref = doc(db, 'forum_posts', postId);
  await updateDoc(ref, { resolved: true });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export function subscribeToComments(
  postId: string,
  onUpdate: (comments: Comment[]) => void
): () => void {
  const ref = collection(db, 'forum_posts', postId, 'comments');
  const q   = query(ref, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment)));
  });
}

export async function addComment(
  postId: string,
  comment: Omit<Comment, 'id' | 'createdAt'>
): Promise<void> {
  const commentsRef = collection(db, 'forum_posts', postId, 'comments');
  await addDoc(commentsRef, { ...comment, createdAt: serverTimestamp() });
  // Increment commentsCount pe post
  await updateDoc(doc(db, 'forum_posts', postId), { commentsCount: increment(1) });
}

// ─── Forum stats ──────────────────────────────────────────────────────────────

/**
 * Actualizează contoarele globale ale forumului.
 *
 * ⚠️  Firestore Security Rules blochează scrierile pe forum_stats din client.
 * Această funcție va eșua silențios — nu afectează funcționarea forumului.
 * Mutați logica într-un Cloud Function declanșat de onCreate pe forum_posts.
 */
export async function updateForumStats(delta: { posts?: number; members?: number }): Promise<void> {
  const ref = doc(db, 'forum_stats', 'global');
  const updates: Record<string, unknown> = {};
  if (delta.posts)   updates.posts   = increment(delta.posts);
  if (delta.members) updates.members = increment(delta.members);
  await setDoc(ref, updates, { merge: true }).catch(() => {});
}

// ─── Points ───────────────────────────────────────────────────────────────────

const POINTS_MAP: Record<'vote' | 'solution', number> = {
  vote:     1,
  solution: 10,
};

const MAX_HISTORY = 50;

/**
 * Acordă puncte unui utilizator.
 *
 * ⚠️  Firestore Security Rules blochează scrierile pe `points` și
 * `pointsHistory` din client (by design — previn fraud).
 * Această funcție va eșua silențios până când logica e mutată
 * într-un Cloud Function cu Admin SDK.
 *
 * Apelată întotdeauna fire-and-forget (.catch(() => {})) din UI,
 * astfel încât eșecul ei nu afectează acțiunea principală (vot / rezolvat).
 */
export async function awardPoints(
  userId: string,
  action: 'vote' | 'solution',
  description: string
): Promise<void> {
  const points  = POINTS_MAP[action];
  const userRef = doc(db, 'users', userId);

  const entry = {
    action,
    points,
    description,
    createdAt: Timestamp.now(),
  };

  await setDoc(userRef, {
    points:        increment(points),
    pointsHistory: arrayUnion(entry),
  }, { merge: true });
}

export function pointsToRON(points: number): number {
  return Math.floor(points / 10);
}

export function pointsUntilMax(points: number): number {
  return Math.max(0, 400 - points);
}

// ─── URL detection ────────────────────────────────────────────────────────────

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+|(?:[a-zA-Z0-9-]+\.)+(?:com|ro|net|org|io|app|eu|co)\b/i;

export function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}
