import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  provider: 'google' | 'apple' | 'email';
  isPro: boolean;
  createdAt: Timestamp | null;
  lastActiveAt: Timestamp | null;
}

export interface UserPreferences {
  darkMode: boolean;
  notifications: boolean;
  language: string;
}

export interface ConsentData {
  terms: boolean;
  privacy: boolean;
  ai_processing: boolean;
  age_confirmed: boolean;
  marketing: boolean;
  consentedAt: Timestamp | null;
  version: string;
}

export interface ProblemData {
  category: string;
  description: string;
  aiResponse: string;
  createdAt: Timestamp | null;
  resolved: boolean;
  helpful: boolean | null;
}

export interface DailyLimit {
  count: number;
  date: string;
  updatedAt: Timestamp | null;
}

export interface ReportData {
  responseId: string;
  category: string;
  reason: string;
  details: string;
  reportedBy: string;
  createdAt: Timestamp | null;
  status: 'pending' | 'reviewed' | 'resolved';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
// Structură: /users/{userId}  (document direct, nu subcollecție)

export async function createUserProfile(
  userId: string,
  name: string,
  email: string,
  provider: UserProfile['provider']
): Promise<void> {
  // Document principal /users/{userId}
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    name,
    email,
    provider,
    isPro: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  }, { merge: true });

  // Preferințe /users/{userId}/preferences/settings
  const prefsRef = doc(db, 'users', userId, 'preferences', 'settings');
  await setDoc(prefsRef, {
    darkMode: false,
    notifications: true,
    language: 'ro',
  }, { merge: true });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateLastActive(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { lastActiveAt: serverTimestamp() }).catch(() => {});
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const prefsRef = doc(db, 'users', userId, 'preferences', 'settings');
  await setDoc(prefsRef, preferences, { merge: true });
}

// ─── Consent ──────────────────────────────────────────────────────────────────
// Structură: /users/{userId}/compliance/consent

export async function saveConsent(
  userId: string,
  consentData: Omit<ConsentData, 'consentedAt'>
): Promise<void> {
  const consentRef = doc(db, 'users', userId, 'compliance', 'consent');
  await setDoc(consentRef, {
    ...consentData,
    consentedAt: serverTimestamp(),
    version: '1.0.0',
  });
}

export async function hasConsent(userId: string): Promise<boolean> {
  const consentRef = doc(db, 'users', userId, 'compliance', 'consent');
  const snap = await getDoc(consentRef);
  return snap.exists();
}

// ─── Problems / Istoric ───────────────────────────────────────────────────────
// Structură: /users/{userId}/problems/{problemId}

export async function saveProblem(
  userId: string,
  problemData: Omit<ProblemData, 'createdAt' | 'helpful'>
): Promise<string> {
  const problemsRef = collection(db, 'users', userId, 'problems');
  const docRef = await addDoc(problemsRef, {
    ...problemData,
    helpful: null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserProblems(userId: string): Promise<(ProblemData & { id: string })[]> {
  const problemsRef = collection(db, 'users', userId, 'problems');
  const snap = await getDocs(problemsRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProblemData) }));
}

// ─── Daily Limits ─────────────────────────────────────────────────────────────
// Structură: /daily_limits/{userId}/limits/{YYYY-MM-DD}

const FREE_DAILY_LIMIT = 3;

export async function checkDailyLimit(
  userId: string
): Promise<{ count: number; hasReachedLimit: boolean }> {
  const today = todayKey();
  const limitRef = doc(db, 'daily_limits', userId, 'limits', today);
  const snap = await getDoc(limitRef);

  if (!snap.exists()) {
    return { count: 0, hasReachedLimit: false };
  }

  const { count } = snap.data() as DailyLimit;
  return { count, hasReachedLimit: count >= FREE_DAILY_LIMIT };
}

export async function incrementDailyLimit(userId: string): Promise<void> {
  const today = todayKey();
  const limitRef = doc(db, 'daily_limits', userId, 'limits', today);
  await setDoc(limitRef, {
    count: increment(1),
    date: today,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── Delete Account ───────────────────────────────────────────────────────────

export async function deleteUserData(userId: string): Promise<void> {
  // Șterge subcollecțiile cunoscute
  const subcollections = [
    collection(db, 'users', userId, 'preferences'),
    collection(db, 'users', userId, 'compliance'),
    collection(db, 'users', userId, 'problems'),
  ];

  for (const colRef of subcollections) {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }

  // Șterge documentul principal
  await deleteDoc(doc(db, 'users', userId));
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function createReport(
  reportData: Omit<ReportData, 'createdAt' | 'status'>
): Promise<string> {
  const reportsRef = collection(db, 'reports');
  const docRef = await addDoc(reportsRef, {
    ...reportData,
    createdAt: serverTimestamp(),
    status: 'pending',
  });
  return docRef.id;
}

// ─── RAG — Conversații validate ───────────────────────────────────────────────

export interface ValidatedConversation {
  intrebare: string;
  raspuns: string;
  categorie: string;
  timestamp: Timestamp | null;
  votes: number;
}

export async function saveValidatedConversation(
  categorie: string,
  intrebare: string,
  raspuns: string
): Promise<void> {
  const ref = collection(db, 'rag_knowledge', categorie, 'conversatii_validate');
  await addDoc(ref, {
    intrebare,
    raspuns,
    categorie,
    timestamp: serverTimestamp(),
    votes: 1,
  });
}
