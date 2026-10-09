import type { ScoringConfig } from '../types/quiz.types';

export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;

/**
 * Bump when the persisted session/result shape changes incompatibly, and add
 * a migration in `services/storageMigrations.ts`.
 * v2: question ids became "<set>#<number>" strings (multi-set / Random Mix).
 */
export const STORAGE_SCHEMA_VERSION = 2;

export const STORAGE_KEYS = {
  activeSession: `stet_quiz_test_session_v${STORAGE_SCHEMA_VERSION}`,
  results: `stet_quiz_results_v${STORAGE_SCHEMA_VERSION}`,
} as const;

export const LEGACY_STORAGE_KEYS_V1 = {
  activeSession: 'stet_quiz_test_session_v1',
  results: 'stet_quiz_results_v1',
} as const;

export const MAX_STORED_RESULTS = 10;

/** Debounce for persisting session changes. */
export const AUTOSAVE_DEBOUNCE_MS = 300;
/** How often the timer heartbeat flushes to storage. */
export const TIMER_PERSIST_INTERVAL_SECONDS = 5;
export const TIMER_TICK_MS = 1000;
/** Threshold for the "time running out" visual state. */
export const TIMER_WARNING_SECONDS = 5 * SECONDS_PER_MINUTE;
export const TIMER_CRITICAL_SECONDS = SECONDS_PER_MINUTE;

/* Defaults for set files that omit optional settings. */
export const DEFAULT_SUBJECT = 'Bihar STET Computer Science';
export const DEFAULT_TEST_NAME_PREFIX = 'Paper 2 - Mock Test';
export const DEFAULT_DESCRIPTION = 'Previous-year questions with detailed explanations.';
/**
 * Practice-mode timer for every test (sets and Random Mix), per question.
 * Change this one value to adjust all timers:
 *   0.6 -> 100 questions = 60 min, 50 = 30 min
 *   0.9 -> 100 questions = 90 min
 *   1.2 -> 100 questions = 120 min
 * A set file can still override its own time with "duration_minutes".
 */
export const DEFAULT_MINUTES_PER_QUESTION = 0.6;
export const TEST_ID_PREFIX = 'stet-cs-';

/* Random Mix */
export const MIX_TEST_ID = 'random-mix';
export const MIX_TEST_NAME = 'Random Mix';
export const MIX_DESCRIPTION = 'Fresh random questions drawn evenly from all sets every time you start.';
export const MIX_QUESTION_COUNT_OPTIONS = [25, 50, 100] as const;
export const MIX_DEFAULT_QUESTION_COUNT = 100;
/** The mix card only appears when there is something to mix. */
export const MIX_MIN_SETS = 2;

export const DEFAULT_SCORING: ScoringConfig = {
  correct: 1,
  incorrect: 0,
  unanswered: 0,
};

/** Topic accuracy below this is flagged as a weak area. */
export const WEAK_TOPIC_ACCURACY_THRESHOLD = 70;
export const MAX_WEAK_TOPICS_SHOWN = 5;

export const PERCENT = 100;
export const PERCENT_DECIMALS = 1;

export const EXPLANATION_UNAVAILABLE_TEXT = 'Explanation is not available for this question.';
export const ANSWER_UNAVAILABLE_TEXT = 'Answer unavailable';
