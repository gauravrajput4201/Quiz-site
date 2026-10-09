import { useCallback, useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS, MS_PER_SECOND, TIMER_PERSIST_INTERVAL_SECONDS } from '../config/quiz.constants';
import { registerPendingWrite } from '../services/pendingWrites';
import type { QuizSession } from '../types/quiz.types';

interface UseQuizPersistenceOptions {
  session: QuizSession;
  /** Adds derived values (active time, remaining time) right before writing. */
  prepare: (session: QuizSession) => QuizSession;
  /** Writes the session; returns false when the session is no longer the active one. */
  save: (session: QuizSession) => boolean;
  /** Called when a save is rejected (e.g. the test was submitted in another tab). */
  onSaveRejected: () => void;
}

/**
 * Auto-saves the session:
 * - debounced after every state change (answer, navigation, mark, clear),
 * - periodically so timer/active-time snapshots stay fresh,
 * - immediately when the page is hidden or closed, on unmount, and before
 *   any route loader reads storage (see `pendingWrites`).
 *
 * Call `stop()` before finalizing so a pending write cannot resurrect a
 * submitted session.
 */
export function useQuizPersistence({ session, prepare, save, onSaveRejected }: UseQuizPersistenceOptions) {
  const latest = useRef({ session, prepare, save, onSaveRejected });
  const stopped = useRef(false);
  const dirty = useRef(false);
  const timeoutId = useRef<number | undefined>(undefined);

  useEffect(() => {
    latest.current = { session, prepare, save, onSaveRejected };
  });

  const flush = useCallback(() => {
    window.clearTimeout(timeoutId.current);
    if (stopped.current) return;
    const { session: current, prepare: prep, save: write, onSaveRejected: reject } = latest.current;
    dirty.current = false;
    if (!write(prep(current))) {
      stopped.current = true;
      reject();
    }
  }, []);

  const stop = useCallback(() => {
    window.clearTimeout(timeoutId.current);
    stopped.current = true;
  }, []);

  // Debounced save on every session change.
  useEffect(() => {
    if (stopped.current) return;
    dirty.current = true;
    window.clearTimeout(timeoutId.current);
    timeoutId.current = window.setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  }, [session, flush]);

  // Periodic snapshot + save on hide/close/unmount.
  useEffect(() => {
    const intervalId = window.setInterval(flush, TIMER_PERSIST_INTERVAL_SECONDS * MS_PER_SECOND);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    const unregister = registerPendingWrite(flush);
    return () => {
      unregister();
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
      flush();
    };
  }, [flush]);

  return { flush, stop };
}
