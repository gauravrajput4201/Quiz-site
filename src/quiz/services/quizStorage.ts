import {
  LEGACY_STORAGE_KEYS_V1,
  MAX_STORED_RESULTS,
  STORAGE_KEYS,
  STORAGE_SCHEMA_VERSION,
} from '../config/quiz.constants';
import { getTestDefinition } from '../config/tests.config';
import type { MixConfig, QuestionResult, QuizSession, TestResult } from '../types/quiz.types';
import { findBestResult } from './quizStatistics';
import { migrateResultV1, migrateSessionV1, type LegacyBankResolver } from './storageMigrations';

/**
 * The only module that touches persistent storage. Swap the backend (or the
 * whole module) for an API client later without touching UI code.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/* ------------------------------------------------------------------ */
/* Runtime validation — never trust what comes back from storage.      */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isValidDate = (value: unknown): value is string =>
  isString(value) && !Number.isNaN(new Date(value).getTime());
const isMode = (value: unknown) => value === 'learn' || value === 'practice';

function isAnswerMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(isString);
}

function isMixConfig(value: unknown): value is MixConfig {
  return (
    isRecord(value) &&
    isFiniteNumber(value.questionCount) &&
    value.questionCount > 0 &&
    isStringArray(value.bankIds) &&
    value.bankIds.length > 0
  );
}

export function isQuizSession(value: unknown): value is QuizSession {
  if (!isRecord(value)) return false;
  const questionIds = value.questionIds;
  const index = value.currentQuestionIndex;
  return (
    value.version === STORAGE_SCHEMA_VERSION &&
    isString(value.sessionId) &&
    isString(value.testId) &&
    isString(value.testName) &&
    isMode(value.mode) &&
    isStringArray(questionIds) &&
    questionIds.length > 0 &&
    new Set(questionIds).size === questionIds.length &&
    isFiniteNumber(index) &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < questionIds.length &&
    isAnswerMap(value.answers) &&
    isStringArray(value.markedForReview) &&
    (value.mix === undefined || isMixConfig(value.mix)) &&
    isValidDate(value.startedAt) &&
    isValidDate(value.lastSavedAt) &&
    isFiniteNumber(value.activeSeconds) &&
    (value.status === 'in_progress' || value.status === 'completed') &&
    (value.mode === 'learn' || (isFiniteNumber(value.durationSeconds) && isValidDate(value.endsAt)))
  );
}

function isQuestionResult(value: unknown): value is QuestionResult {
  return (
    isRecord(value) &&
    isString(value.questionId) &&
    (value.selectedOptionKey === null || isString(value.selectedOptionKey)) &&
    (value.correctOptionKey === null || isString(value.correctOptionKey)) &&
    ['correct', 'incorrect', 'unanswered', 'ungraded'].includes(value.outcome as string) &&
    isFiniteNumber(value.marks)
  );
}

export function isTestResult(value: unknown): value is TestResult {
  if (!isRecord(value)) return false;
  const numericFields = [
    'totalQuestions',
    'attempted',
    'correct',
    'incorrect',
    'unanswered',
    'ungraded',
    'score',
    'maxScore',
    'percentage',
    'accuracy',
    'timeTakenSeconds',
  ] as const;
  return (
    value.version === STORAGE_SCHEMA_VERSION &&
    isString(value.resultId) &&
    isString(value.sessionId) &&
    isString(value.testId) &&
    isString(value.testName) &&
    isMode(value.mode) &&
    isValidDate(value.startedAt) &&
    isValidDate(value.completedAt) &&
    numericFields.every((field) => isFiniteNumber(value[field])) &&
    Array.isArray(value.questions) &&
    value.questions.every(isQuestionResult) &&
    Array.isArray(value.topicStats) &&
    (value.mix === undefined || isMixConfig(value.mix))
  );
}

/* ------------------------------------------------------------------ */
/* Storage service                                                     */
/* ------------------------------------------------------------------ */

export interface QuizStorage {
  saveTestSession(session: QuizSession): boolean;
  getTestSession(): QuizSession | null;
  updateTestSession(updater: (session: QuizSession) => QuizSession): QuizSession | null;
  deleteTestSession(): void;
  saveTestResult(result: TestResult): boolean;
  getTestResults(): TestResult[];
  getTestResult(resultId: string): TestResult | null;
  getLastTest(): TestResult | null;
  getBestResult(testId?: string): TestResult | null;
}

function warn(message: string, error?: unknown) {
  console.warn(`[quizStorage] ${message}`, error ?? '');
}

export interface QuizStorageOptions {
  /** Needed to upgrade v1 data (numeric question ids) to v2. */
  resolveLegacyBankId?: LegacyBankResolver;
}

export function createQuizStorage(backend: StorageBackend, options: QuizStorageOptions = {}): QuizStorage {
  function readJson(key: string): unknown {
    let raw: string | null;
    try {
      raw = backend.getItem(key);
    } catch (error) {
      warn(`Unable to read "${key}".`, error);
      return null;
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch (error) {
      warn(`Corrupted JSON in "${key}"; clearing it.`, error);
      safeRemove(key);
      return null;
    }
  }

  function writeJson(key: string, value: unknown): boolean {
    try {
      backend.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      warn(`Unable to write "${key}" (storage full or unavailable).`, error);
      return false;
    }
  }

  function safeRemove(key: string) {
    try {
      backend.removeItem(key);
    } catch (error) {
      warn(`Unable to remove "${key}".`, error);
    }
  }

  function getTestSession(): QuizSession | null {
    const data = readJson(STORAGE_KEYS.activeSession);
    if (data === null) return null;
    if (!isQuizSession(data)) {
      warn('Stored session is invalid; discarding it.');
      safeRemove(STORAGE_KEYS.activeSession);
      return null;
    }
    // Completed sessions are never resumable.
    if (data.status === 'completed') {
      safeRemove(STORAGE_KEYS.activeSession);
      return null;
    }
    return data;
  }

  function saveTestSession(session: QuizSession): boolean {
    return writeJson(STORAGE_KEYS.activeSession, {
      ...session,
      lastSavedAt: new Date().toISOString(),
    });
  }

  function getTestResults(): TestResult[] {
    const data = readJson(STORAGE_KEYS.results);
    if (data === null) return [];
    if (!Array.isArray(data)) {
      warn('Stored results are not a list; clearing them.');
      safeRemove(STORAGE_KEYS.results);
      return [];
    }
    // Keep valid entries even if some are corrupted.
    const valid = data.filter(isTestResult);
    if (valid.length !== data.length) {
      warn(`Dropped ${data.length - valid.length} invalid stored result(s).`);
      writeJson(STORAGE_KEYS.results, valid);
    }
    return valid.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  /**
   * One-time upgrade of v1 data. v2 keys win if both exist; v1 keys are
   * removed afterwards so this never runs twice.
   */
  function migrateLegacyData() {
    const resolve = options.resolveLegacyBankId;
    const legacySession = readJson(LEGACY_STORAGE_KEYS_V1.activeSession);
    const legacyResults = readJson(LEGACY_STORAGE_KEYS_V1.results);
    if (legacySession === null && legacyResults === null) return;

    if (resolve && legacySession !== null && readJson(STORAGE_KEYS.activeSession) === null) {
      const migrated = migrateSessionV1(legacySession, resolve);
      if (isQuizSession(migrated)) writeJson(STORAGE_KEYS.activeSession, migrated);
    }
    if (resolve && Array.isArray(legacyResults) && readJson(STORAGE_KEYS.results) === null) {
      const migrated = legacyResults.map((result) => migrateResultV1(result, resolve)).filter(isTestResult);
      writeJson(STORAGE_KEYS.results, migrated.slice(0, MAX_STORED_RESULTS));
    }
    safeRemove(LEGACY_STORAGE_KEYS_V1.activeSession);
    safeRemove(LEGACY_STORAGE_KEYS_V1.results);
  }

  migrateLegacyData();

  return {
    saveTestSession,
    getTestSession,

    updateTestSession(updater) {
      const current = getTestSession();
      if (!current) return null;
      const next = updater(current);
      saveTestSession(next);
      return next;
    },

    deleteTestSession() {
      safeRemove(STORAGE_KEYS.activeSession);
    },

    saveTestResult(result) {
      // Idempotent per session: a double submit never creates two results.
      const others = getTestResults().filter((existing) => existing.sessionId !== result.sessionId);
      const next = [result, ...others].slice(0, MAX_STORED_RESULTS);
      return writeJson(STORAGE_KEYS.results, next);
    },

    getTestResults,

    getTestResult(resultId) {
      return getTestResults().find((result) => result.resultId === resultId) ?? null;
    },

    getLastTest() {
      return getTestResults()[0] ?? null;
    },

    getBestResult(testId) {
      const results = getTestResults();
      return findBestResult(testId ? results.filter((result) => result.testId === testId) : results);
    },
  };
}

function createMemoryBackend(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
}

function resolveBackend(): StorageBackend {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probeKey = '__stet_quiz_probe__';
      window.localStorage.setItem(probeKey, probeKey);
      window.localStorage.removeItem(probeKey);
      return window.localStorage;
    }
  } catch (error) {
    warn('localStorage unavailable; progress will not survive a reload.', error);
  }
  return createMemoryBackend();
}

function resolveLegacyBankId(testId: string): string | undefined {
  const test = getTestDefinition(testId);
  return test?.kind === 'set' ? test.questionBankId : undefined;
}

export const quizStorage: QuizStorage = createQuizStorage(resolveBackend(), { resolveLegacyBankId });
