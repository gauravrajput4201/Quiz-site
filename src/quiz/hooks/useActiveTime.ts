import { useCallback, useEffect, useRef } from 'react';
import { MS_PER_SECOND } from '../config/quiz.constants';

/**
 * Tracks time the page is visible, without re-rendering every second.
 * `getActiveSeconds()` returns `baseSeconds` + visible time since mount.
 */
export function useActiveTime(baseSeconds: number) {
  const state = useRef<{ base: number; accumulatedMs: number; visibleSince: number | null }>({
    base: baseSeconds,
    accumulatedMs: 0,
    visibleSince: null,
  });

  useEffect(() => {
    const tracker = state.current;
    if (document.visibilityState === 'visible') tracker.visibleSince ??= Date.now();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tracker.visibleSince ??= Date.now();
      } else if (tracker.visibleSince !== null) {
        tracker.accumulatedMs += Date.now() - tracker.visibleSince;
        tracker.visibleSince = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // Bank the running interval so a remount (StrictMode) doesn't lose or double-count it.
      if (tracker.visibleSince !== null) {
        tracker.accumulatedMs += Date.now() - tracker.visibleSince;
        tracker.visibleSince = null;
      }
    };
  }, []);

  return useCallback(() => {
    const { base, accumulatedMs, visibleSince } = state.current;
    const runningMs = visibleSince === null ? 0 : Date.now() - visibleSince;
    return base + Math.floor((accumulatedMs + runningMs) / MS_PER_SECOND);
  }, []);
}
