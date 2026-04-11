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
  commentsCount: number;
  createdAt: Timestamp;
  resolved: boolean;
  addedToRAG: boolean;
}

export type ForumFilter = 'top' | 'recent' | PostCategory;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
}

export async function votePost(postId: string, _userId: string): Promise<void> {
  const ref = doc(db, 'forum_posts', postId);
  await updateDoc(ref, { votes: increment(1) });
}

export async function createPost(
  post: Omit<Post, 'id' | 'votes' | 'commentsCount' | 'createdAt' | 'resolved' | 'addedToRAG'>
): Promise<string> {
  const ref = collection(db, 'forum_posts');
  const docRef = await addDoc(ref, {
    ...post,
    votes: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    resolved: false,
    addedToRAG: false,
  });
  return docRef.id;
}

export async function markResolved(postId: string): Promise<void> {
  const ref = doc(db, 'forum_posts', postId);
  await updateDoc(ref, { resolved: true });
}

// ─── Points ───────────────────────────────────────────────────────────────────

const POINTS_MAP: Record<'vote' | 'solution', number> = {
  vote:     1,
  solution: 10,
};

const MAX_HISTORY = 50;

export async function awardPoints(
  userId: string,
  action: 'vote' | 'solution',
  description: string
): Promise<void> {
  const points = POINTS_MAP[action];
  const userRef = doc(db, 'users', userId);

  const transaction = {
    action,
    points,
    description,
    createdAt: Timestamp.now(),
  };

  // arrayUnion keeps the array append-only; trimming to MAX_HISTORY is done
  // server-side via Cloud Functions. Client just appends.
  await updateDoc(userRef, {
    points: increment(points),
    pointsHistory: arrayUnion(transaction),
  });
}

export function pointsToRON(points: number): number {
  return Math.floor(points / 10);
}

export function pointsUntilMax(points: number): number {
  return Math.max(0, 400 - points);
}
