import { useEffect, useRef, useState } from 'react';
import { MS_PER_SECOND, TIMER_TICK_MS } from '../config/quiz.constants';

function secondsUntil(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / MS_PER_SECOND));
}

/**
 * Countdown derived from an absolute deadline. The interval only triggers a
 * re-render; the value is always recomputed from the clock, so throttled
 * background tabs and reloads never drift.
 */
export function useQuizTimer(endsAt: string, onExpire: () => void): number {
  const deadlineMs = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() => secondsUntil(deadlineMs));
  const onExpireRef = useRef(onExpire);
  const expired = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const tick = () => {
      const next = secondsUntil(deadlineMs);
      setRemaining(next);
      if (next === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TIMER_TICK_MS);
    // Catch up immediately when returning to a throttled tab.
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [deadlineMs]);

  return remaining;
}
