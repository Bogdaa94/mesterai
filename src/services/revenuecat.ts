/**
 * RevenueCat service layer.
 *
 * Izolează tot SDK-ul react-native-purchases într-un singur fișier.
 * ProContext importă doar funcțiile de aici — nu atinge SDK-ul direct.
 *
 * SETUP NECESAR (RevenueCat Dashboard):
 *  1. Creează un Entitlement cu identifier: "pro"
 *  2. Atașează produsele (App Store / Google Play) la entitlement
 *  3. Creează un Offering "default" cu două pachete:
 *       - pachet MONTHLY  → produsul lunar  (34,99 RON)
 *       - pachet ANNUAL   → produsul anual  (299,99 RON)
 *  4. Pune cheile API în .env → REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY
 *
 * IMPORTANT: react-native-purchases este un modul nativ.
 * Nu funcționează în Expo Go — necesită EAS Build sau expo prebuild.
 */

import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import Constants from 'expo-constants';

// ── Constante ─────────────────────────────────────────────────────────────────

export const ENTITLEMENT_ID = 'pro';

let initialized = false;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initRevenueCat(): void {
  if (initialized) return;

  const extra = Constants.expoConfig?.extra ?? {};
  const apiKey = (
    Platform.OS === 'ios'
      ? extra.revenueCatIosKey
      : extra.revenueCatAndroidKey
  ) as string | undefined;

  if (!apiKey) {
    console.warn('[RevenueCat] API key not set — purchases disabled.');
    return;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  initialized = true;
}

export function isRcInitialized(): boolean {
  return initialized;
}

// ── Auth sync ─────────────────────────────────────────────────────────────────

export async function rcLogin(userId: string): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch {
    return null;
  }
}

export async function rcLogout(): Promise<void> {
  if (!initialized) return;
  try { await Purchases.logOut(); } catch { /* ignore */ }
}

// ── Customer info ─────────────────────────────────────────────────────────────

export function isProActive(info: CustomerInfo): boolean {
  return !!info.entitlements.active[ENTITLEMENT_ID];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try { return await Purchases.getCustomerInfo(); } catch { return null; }
}

// ── Offerings ─────────────────────────────────────────────────────────────────

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!initialized) return null;
  try { return await Purchases.getOfferings(); } catch { return null; }
}

/**
 * Din offering-ul curent extrage pachetele lunar și anual.
 * Fallback la primul pachet disponibil dacă tipul exact nu e găsit.
 */
export function extractPlans(offerings: PurchasesOfferings): {
  monthly: PurchasesPackage | null;
  annual:  PurchasesPackage | null;
} {
  const pkgs = offerings.current?.availablePackages ?? [];
  return {
    monthly: pkgs.find(p => p.packageType === 'MONTHLY') ?? null,
    annual:  pkgs.find(p => p.packageType === 'ANNUAL')  ?? null,
  };
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  userCancelled: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (!initialized) {
    return { success: false, userCancelled: false, customerInfo: null, error: 'SDK neinițializat' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: isProActive(customerInfo), userCancelled: false, customerInfo };
  } catch (e: any) {
    return {
      success:       false,
      userCancelled: !!e.userCancelled,
      customerInfo:  null,
      error:         e.userCancelled ? undefined : (e.message ?? 'Eroare necunoscută'),
    };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!initialized) {
    return { success: false, userCancelled: false, customerInfo: null, error: 'SDK neinițializat' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: isProActive(customerInfo), userCancelled: false, customerInfo };
  } catch (e: any) {
    return { success: false, userCancelled: false, customerInfo: null, error: e.message };
  }
}

// ── One-time purchase: înregistrare meșter ────────────────────────────────────

export const MESTER_PRODUCT_ID = 'com.mesterai.mester.registration';

export async function purchaseMesterRegistration(): Promise<PurchaseResult> {
  if (!initialized) {
    return { success: false, userCancelled: false, customerInfo: null, error: 'SDK neinițializat. Folosiți un EAS Build pentru achiziții.' };
  }
  try {
    const products: PurchasesStoreProduct[] = await Purchases.getProducts([MESTER_PRODUCT_ID]);
    if (!products.length) {
      return { success: false, userCancelled: false, customerInfo: null, error: 'Produsul nu a fost găsit în App Store / Google Play. Verificați configurarea RevenueCat.' };
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
    return { success: true, userCancelled: false, customerInfo };
  } catch (e: any) {
    return {
      success:       false,
      userCancelled: !!e.userCancelled,
      customerInfo:  null,
      error:         e.userCancelled ? undefined : (e.message ?? 'Eroare necunoscută la achiziție'),
    };
  }
}

// ── Listener ──────────────────────────────────────────────────────────────────

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void
): () => void {
  if (!initialized) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
