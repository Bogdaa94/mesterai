import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { checkDailyLimit, incrementDailyLimit } from '../firebase/firestore';
import { useAuth } from './AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProContextValue {
  isPro: boolean;
  dailyCount: number;
  freeLimit: number;
  hasReachedLimit: boolean;
  loadingLimits: boolean;
  increment: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProContext = createContext<ProContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // TODO: conectează la RevenueCat pentru verificare reală
  const isPro = false;

  const [dailyCount, setDailyCount] = useState(0);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || isPro) {
      setLoadingLimits(false);
      return;
    }
    try {
      const { count } = await checkDailyLimit(user.uid);
      setDailyCount(count);
    } catch {
      // silently ignore — nu blocăm userul dacă Firestore e offline
    } finally {
      setLoadingLimits(false);
    }
  }, [user, isPro]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const increment = useCallback(async () => {
    if (!user || isPro) return;
    try {
      await incrementDailyLimit(user.uid);
      setDailyCount(prev => prev + 1);
    } catch {
      // silently ignore
    }
  }, [user, isPro]);

  const hasReachedLimit = !isPro && dailyCount >= FREE_DAILY_LIMIT;

  return (
    <ProContext.Provider value={{ isPro, dailyCount, freeLimit: FREE_DAILY_LIMIT, hasReachedLimit, loadingLimits, increment, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}
