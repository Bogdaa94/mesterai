import { useRef, useCallback } from 'react';
import { updateLastActive } from '../firebase/firestore';

const THROTTLE_MS = 5 * 60 * 1000; // 5 minute

/**
 * Returns a `ping()` function that updates lastActiveAt in Firestore,
 * throttled to at most once every 5 minutes per session.
 */
export function useActivityTracker(userId: string | undefined) {
  const lastUpdate = useRef<number>(0);

  const ping = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastUpdate.current < THROTTLE_MS) return;
    lastUpdate.current = now;
    updateLastActive(userId); // fire-and-forget, errors suppressed in updateLastActive
  }, [userId]);

  return ping;
}
