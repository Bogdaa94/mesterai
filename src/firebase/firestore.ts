import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
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
  createdAt: Timestamp | null;
  provider: 'google' | 'apple' | 'email';
}

export interface UserPreferences {
  darkMode: boolean;
  notifications: boolean;
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
}

export interface DailyLimit {
  count: number;
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

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function createUserProfile(
  userId: string,
  name: string,
  email: string,
  provider: UserProfile['provider']
): Promise<void> {
  const profileRef = doc(db, 'users', userId, 'profile', 'data');
  await setDoc(profileRef, {
    name,
    email,
    createdAt: serverTimestamp(),
    provider,
  });

  const prefsRef = doc(db, 'users', userId, 'preferences', 'data');
  await setDoc(prefsRef, {
    darkMode: false,
    notifications: true,
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const profileRef = doc(db, 'users', userId, 'profile', 'data');
  const snap = await getDoc(profileRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const prefsRef = doc(db, 'users', userId, 'preferences', 'data');
  await updateDoc(prefsRef, preferences);
}

// ─── Consent ──────────────────────────────────────────────────────────────────

export async function saveConsent(
  userId: string,
  consentData: Omit<ConsentData, 'consentedAt'>
): Promise<void> {
  const consentRef = doc(db, 'users', userId, 'compliance', 'consent');
  await setDoc(consentRef, {
    ...consentData,
    consentedAt: serverTimestamp(),
  });
}

// ─── Problems ─────────────────────────────────────────────────────────────────

export async function saveProblem(
  userId: string,
  problemData: Omit<ProblemData, 'createdAt'>
): Promise<string> {
  const problemsRef = collection(db, 'users', userId, 'problems');
  const docRef = await addDoc(problemsRef, {
    ...problemData,
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

const DAILY_LIMIT = 5;

export async function checkDailyLimit(
  userId: string
): Promise<{ count: number; hasReachedLimit: boolean }> {
  const limitRef = doc(db, 'daily_limits', userId, todayKey(), 'data');
  const snap = await getDoc(limitRef);

  if (!snap.exists()) {
    return { count: 0, hasReachedLimit: false };
  }

  const { count } = snap.data() as DailyLimit;
  return { count, hasReachedLimit: count >= DAILY_LIMIT };
}

export async function incrementDailyLimit(userId: string): Promise<void> {
  const limitRef = doc(db, 'daily_limits', userId, todayKey(), 'data');
  const snap = await getDoc(limitRef);

  if (!snap.exists()) {
    await setDoc(limitRef, {
      count: 1,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(limitRef, {
      count: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
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

export async function getValidatedConversations(
  categorie: string
): Promise<ValidatedConversation[]> {
  const ref = collection(db, 'rag_knowledge', categorie, 'conversatii_validate');
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.data() as ValidatedConversation);
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
