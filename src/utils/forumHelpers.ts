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
