import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkDailyLimit, incrementDailyLimit } from '../firebase/firestore';
import {
  initRevenueCat,
  isRcInitialized,
  rcLogin,
  rcLogout,
  isProActive,
  getCustomerInfo,
  addCustomerInfoListener,
  purchasePackage as rcPurchase,
  restorePurchases as rcRestore,
} from '../services/revenuecat';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifică statusul Pro din AMBELE surse:
 *  1. RevenueCat (entitlement activ)
 *  2. Firestore /users/{userId}.isPro  ← fallback pentru conturi demo
 */
async function checkProStatus(userId: string): Promise<boolean> {
  try {
    const info = await getCustomerInfo();
    if (info && isProActive(info)) return true;
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() && snap.data()?.isPro === true;
  } catch {
    // RevenueCat indisponibil → verifică doar Firestore
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() && snap.data()?.isPro === true;
    } catch {
      return false;
    }
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT  = 100;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProContextValue {
  isPro: boolean;
  proLoading: boolean;          // true cât timp verificăm statusul RevenueCat
  purchaseLoading: boolean;     // true în timpul unui purchase / restore
  dailyCount: number;
  freeLimit: number;
  hasReachedLimit: boolean;
  loadingLimits: boolean;
  increment: () => Promise<void>;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProContext = createContext<ProContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [isPro,           setIsPro]           = useState(false);
  const [proLoading,      setProLoading]      = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [dailyCount,      setDailyCount]      = useState(0);
  const [loadingLimits,   setLoadingLimits]   = useState(true);

  // Ref folosit în listener-ul RevenueCat (closure cu deps=[])
  const userIdRef = useRef<string | null>(null);

  // ── 1. Inițializare RevenueCat SDK (o singură dată) ───────────────────────

  useEffect(() => {
    initRevenueCat();
  }, []);

  // ── 2. Login / logout RevenueCat când se schimbă userul ──────────────────

  useEffect(() => {
    if (!user) {
      userIdRef.current = null;
      if (isRcInitialized()) rcLogout();
      setIsPro(false);
      setProLoading(false);
      return;
    }

    userIdRef.current = user.uid;
    setProLoading(true);

    if (!isRcInitialized()) {
      // Expo Go sau RC keys lipsă → verifică direct Firestore
      checkProStatus(user.uid)
        .then(setIsPro)
        .finally(() => setProLoading(false));
      return;
    }

    rcLogin(user.uid)
      .catch(() => null)                          // rcLogin failure → continuăm cu checkProStatus
      .then(() => checkProStatus(user.uid))
      .then(setIsPro)
      .finally(() => setProLoading(false));
  }, [user]);

  // ── 3. Listener real-time pentru schimbări de abonament ──────────────────

  useEffect(() => {
    const unsub = addCustomerInfoListener(async (info) => {
      if (isProActive(info)) {
        setIsPro(true);
      } else {
        // RevenueCat zice non-Pro → verificăm și Firestore (cont demo)
        const uid = userIdRef.current;
        setIsPro(uid ? await checkProStatus(uid) : false);
      }
    });
    return unsub;
  }, []);

  // ── 4. Limite zilnice (numai pentru userii free) ──────────────────────────

  const refresh = useCallback(async () => {
    if (!user) { setLoadingLimits(false); return; }
    try {
      const { count } = await checkDailyLimit(user.uid);
      setDailyCount(count);
    } catch {
      // Ignorăm silențios — nu blocăm userul dacă Firestore e offline
    } finally {
      setLoadingLimits(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const increment = useCallback(async () => {
    if (!user || isPro) return;
    try {
      await incrementDailyLimit(user.uid);
      setDailyCount(prev => prev + 1);
    } catch { /* ignore */ }
  }, [user, isPro]);

  // ── 5. Purchase ───────────────────────────────────────────────────────────

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setPurchaseLoading(true);
    try {
      const result = await rcPurchase(pkg);
      if (result.success && result.customerInfo) {
        setIsPro(true);
      } else if (result.error) {
        Alert.alert('Eroare plată', result.error);
      }
      // userCancelled → nu afișăm alertă
      return result.success;
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  // ── 6. Restore ────────────────────────────────────────────────────────────

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setPurchaseLoading(true);
    try {
      const result = await rcRestore();
      if (result.success) {
        setIsPro(true);
        Alert.alert('Achiziție restaurată ✅', 'Abonamentul tău Pro a fost activat.');
      } else if (result.error) {
        Alert.alert('Eroare', result.error);
      } else {
        Alert.alert('Nicio achiziție găsită', 'Nu am găsit un abonament activ asociat acestui cont.');
      }
      return result.success;
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  const activeLimit     = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const hasReachedLimit = dailyCount >= activeLimit;

  return (
    <ProContext.Provider value={{
      isPro,
      proLoading,
      purchaseLoading,
      dailyCount,
      freeLimit: activeLimit,
      hasReachedLimit,
      loadingLimits,
      increment,
      refresh,
      purchasePackage,
      restorePurchases,
    }}>
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
