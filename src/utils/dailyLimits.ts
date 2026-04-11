/**
 * dailyLimits.ts — gestionarea limitei de 3 probleme/zi pentru userii Free.
 * Structură Firestore: /daily_limits/{userId}/limits/{YYYY-MM-DD}
 */

import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const FREE_DAILY_LIMIT = 3;

function todayKey(): string {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

// Câte probleme mai are userul azi
export async function getDailyProblemsLeft(userId: string): Promise<number> {
  const today = todayKey();
  const ref = doc(db, 'daily_limits', userId, 'limits', today);
  const snap = await getDoc(ref);
  if (!snap.exists()) return FREE_DAILY_LIMIT;
  return Math.max(0, FREE_DAILY_LIMIT - (snap.data().count ?? 0));
}

// Incrementează contorul după fiecare problemă
export async function incrementDailyCount(userId: string): Promise<void> {
  const today = todayKey();
  const ref = doc(db, 'daily_limits', userId, 'limits', today);
  await setDoc(ref, {
    count: increment(1),
    date: today,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Verifică dacă userul Free a atins limita
export async function hasReachedDailyLimit(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isPro) return false;
  const left = await getDailyProblemsLeft(userId);
  return left <= 0;
}
