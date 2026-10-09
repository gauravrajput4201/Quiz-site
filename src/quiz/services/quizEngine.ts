import { MIX_DEFAULT_QUESTION_COUNT, MS_PER_SECOND, STORAGE_SCHEMA_VERSION } from '../config/quiz.constants';
import { defaultDurationSeconds, getTestDefinition, SET_TEST_DEFINITIONS } from '../config/tests.config';
import { getGlobalQuestionIndex, getQuestionBank } from '../data/questionBank';
import type {
  MixConfig,
  QuestionBank,
  QuestionId,
  QuizMode,
  QuizQuestion,
  QuizSession,
  TestDefinition,
  TestResult,
} from '../types/quiz.types';
import { createId } from '../utils/id';
import { shuffleQuestionIds, type RandomSource } from '../utils/shuffleQuestions';
import { buildMixPool, normalizeMixConfig, selectMixQuestions, type MixPool } from './quizMix';
import { calculateTestResult } from './quizScoring';
import { quizStorage, type QuizStorage } from './quizStorage';

/* ------------------------------------------------------------------ */
/* Question access                                                     */
/* ------------------------------------------------------------------ */

/** Set banks in dashboard order. */
export function getSetBanks(): QuestionBank[] {
  return SET_TEST_DEFINITIONS.map((test) => getQuestionBank(test.questionBankId)).filter(
    (bank): bank is QuestionBank => bank !== undefined,
  );
}

let mixPoolCache: MixPool | null = null;

export function getMixPool(): MixPool {
  mixPoolCache ??= buildMixPool(getSetBanks());
  return mixPoolCache;
}

export interface TestContext {
  test: TestDefinition;
  /** Questions a new session draws from: the set's questions, or the whole mix pool. */
  questions: QuizQuestion[];
  /** Resolves any question id a session or result may reference (all sets). */
  questionsById: Map<QuestionId, QuizQuestion>;
}

export function getTestQuestions(test: TestDefinition): QuizQuestion[] {
  if (test.kind === 'mix') return [...getMixPool().byBank.values()].flat();
  return getQuestionBank(test.questionBankId)?.questions ?? [];
}

export function getTestContext(testId: string): TestContext | null {
  const test = getTestDefinition(testId);
  if (!test) return null;
  const questions = getTestQuestions(test);
  if (questions.length === 0) return null;
  return { test, questions, questionsById: getGlobalQuestionIndex() };
}

/** Fills in defaults and drops unknown sets from user-supplied mix options. */
export function resolveMixConfig(config?: Partial<MixConfig>): MixConfig {
  return normalizeMixConfig(
    config,
    getSetBanks().map((bank) => bank.id),
    MIX_DEFAULT_QUESTION_COUNT,
  );
}

/* ------------------------------------------------------------------ */
/* Session creation                                                    */
/* ------------------------------------------------------------------ */

export interface CreateSessionOptions {
  now?: Date;
  random?: RandomSource;
  /** Random Mix only. Missing values fall back to defaults. */
  mix?: Partial<MixConfig>;
}

/**
 * New session with a freshly shuffled order. A set test shuffles all its
 * questions; a Random Mix draws a new balanced selection from the chosen sets.
 */
export function createSession(context: TestContext, mode: QuizMode, options: CreateSessionOptions = {}): QuizSession {
  const { test } = context;
  const now = options.now ?? new Date();
  let questionIds: QuestionId[];
  let durationSeconds = test.durationSeconds;
  let mix: MixConfig | undefined;

  if (test.kind === 'mix') {
    mix = resolveMixConfig(options.mix);
    questionIds = selectMixQuestions(getMixPool(), mix, options.random);
    durationSeconds = defaultDurationSeconds(questionIds.length);
  } else {
    questionIds = shuffleQuestionIds(
      context.questions.map((question) => question.id),
      options.random,
    );
  }

  const startedAt = now.toISOString();
  const isPractice = mode === 'practice';
  return {
    version: STORAGE_SCHEMA_VERSION,
    sessionId: createId('session'),
    testId: test.id,
    testName: test.name,
    mode,
    questionIds,
    mix,
    currentQuestionIndex: 0,
    answers: {},
    markedForReview: [],
    startedAt,
    lastSavedAt: startedAt,
    durationSeconds: isPractice ? durationSeconds : undefined,
    endsAt: isPractice ? new Date(now.getTime() + durationSeconds * MS_PER_SECOND).toISOString() : undefined,
    remainingSeconds: isPractice ? durationSeconds : undefined,
    activeSeconds: 0,
    status: 'in_progress',
  };
}

/* ------------------------------------------------------------------ */
/* Timing (timestamp-based — never relies on interval counting)        */
/* ------------------------------------------------------------------ */

export function getRemainingSeconds(session: QuizSession, now: Date = new Date()): number | null {
  if (session.mode !== 'practice' || !session.endsAt) return null;
  const remainingMs = new Date(session.endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / MS_PER_SECOND));
}

export function isSessionExpired(session: QuizSession, now: Date = new Date()): boolean {
  return getRemainingSeconds(session, now) === 0;
}

/* ------------------------------------------------------------------ */
/* Pure session transitions                                            */
/* ------------------------------------------------------------------ */

function clampIndex(session: QuizSession, index: number): number {
  return Math.min(Math.max(0, index), session.questionIds.length - 1);
}

export function getCurrentQuestionId(session: QuizSession): QuestionId {
  return session.questionIds[session.currentQuestionIndex] ?? (session.questionIds[0] as QuestionId);
}

export function goToQuestion(session: QuizSession, index: number): QuizSession {
  const nextIndex = clampIndex(session, index);
  return nextIndex === session.currentQuestionIndex
    ? session
    : { ...session, currentQuestionIndex: nextIndex };
}

/** Learn mode answers lock on first selection; practice answers can change. */
export function selectAnswer(session: QuizSession, questionId: QuestionId, optionKey: string): QuizSession {
  const existing = session.answers[questionId];
  if (existing === optionKey) return session;
  if (session.mode === 'learn' && existing !== undefined) return session;
  return { ...session, answers: { ...session.answers, [questionId]: optionKey } };
}

export function clearAnswer(session: QuizSession, questionId: QuestionId): QuizSession {
  if (session.mode === 'learn' || session.answers[questionId] === undefined) return session;
  const answers = { ...session.answers };
  delete answers[questionId];
  return { ...session, answers };
}

export function toggleMarkForReview(session: QuizSession, questionId: QuestionId): QuizSession {
  const marked = session.markedForReview.includes(questionId);
  return {
    ...session,
    markedForReview: marked
      ? session.markedForReview.filter((id) => id !== questionId)
      : [...session.markedForReview, questionId],
  };
}

export function addActiveSeconds(session: QuizSession, seconds: number): QuizSession {
  return { ...session, activeSeconds: session.activeSeconds + seconds };
}

export interface SessionProgress {
  total: number;
  answered: number;
  unanswered: number;
  marked: number;
  /** 1-based position of the current question. */
  position: number;
  /** Share of questions answered (0–100). */
  answeredPercent: number;
  /** Share of the test reached (0–100) — drives "Question 27 of 100 — 27%". */
  positionPercent: number;
}

export function getSessionProgress(session: QuizSession): SessionProgress {
  const total = session.questionIds.length;
  const answered = session.questionIds.filter((id) => session.answers[id] !== undefined).length;
  const position = session.currentQuestionIndex + 1;
  return {
    total,
    answered,
    unanswered: total - answered,
    marked: session.markedForReview.filter((id) => session.questionIds.includes(id)).length,
    position,
    answeredPercent: total === 0 ? 0 : Math.round((answered / total) * 100),
    positionPercent: total === 0 ? 0 : Math.round((position / total) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Session lifecycle (storage-backed)                                  */
/* ------------------------------------------------------------------ */

export function startTest(
  testId: string,
  mode: QuizMode,
  options: { mix?: Partial<MixConfig>; storage?: QuizStorage } = {},
): QuizSession | null {
  const { storage = quizStorage } = options;
  const context = getTestContext(testId);
  if (!context) return null;
  const session = createSession(context, mode, { mix: options.mix });
  if (session.questionIds.length === 0) return null;
  storage.saveTestSession(session);
  return session;
}

/**
 * Scores the session, stores the result, and removes the active session so
 * it can never be resumed. Safe to call twice for the same session.
 */
export function finalizeSession(
  session: QuizSession,
  options: { autoSubmitted?: boolean; now?: Date; storage?: QuizStorage } = {},
): TestResult | null {
  const { autoSubmitted = false, storage = quizStorage } = options;
  const context = getTestContext(session.testId);
  if (!context) {
    storage.deleteTestSession();
    return null;
  }
  // If the deadline already passed, the submission time is the deadline.
  const now = options.now ?? new Date();
  const deadline = session.endsAt ? new Date(session.endsAt) : null;
  const completedAt = deadline && deadline < now ? deadline : now;

  const result = calculateTestResult({
    session: { ...session, status: 'completed' },
    questionsById: context.questionsById,
    scoring: context.test.scoring,
    completedAt,
    autoSubmitted,
  });
  storage.saveTestResult(result);
  storage.deleteTestSession();
  return result;
}

export type ResolvedSession =
  | { kind: 'none' }
  | { kind: 'active'; session: QuizSession; context: TestContext }
  | { kind: 'expired'; result: TestResult };

/**
 * Loads the stored session and reconciles it with the current question data:
 * - discards sessions whose test/questions no longer exist,
 * - auto-submits practice sessions whose timer ran out while the page was closed.
 */
export function resolveActiveSession(
  now: Date = new Date(),
  storage: QuizStorage = quizStorage,
): ResolvedSession {
  const session = storage.getTestSession();
  if (!session) return { kind: 'none' };

  const context = getTestContext(session.testId);
  const questionsExist =
    context && session.questionIds.every((questionId) => context.questionsById.has(questionId));
  if (!context || !questionsExist) {
    console.warn('[quizEngine] Stored session no longer matches the question data; discarding it.');
    storage.deleteTestSession();
    return { kind: 'none' };
  }

  if (isSessionExpired(session, now)) {
    const result = finalizeSession(session, { autoSubmitted: true, now, storage });
    return result ? { kind: 'expired', result } : { kind: 'none' };
  }
  return { kind: 'active', session, context };
}

/**
 * Saves the session only if it is still the active one in storage. Prevents a
 * stale tab from resurrecting a session that was submitted or replaced elsewhere.
 */
export function persistActiveSession(session: QuizSession, storage: QuizStorage = quizStorage): boolean {
  const stored = storage.getTestSession();
  if (!stored || stored.sessionId !== session.sessionId) return false;
  return storage.saveTestSession(session);
}

/** Read-only peek at the unfinished session (no expiry handling). */
export function getActiveSession(storage: QuizStorage = quizStorage): QuizSession | null {
  return storage.getTestSession();
}

export function discardActiveSession(storage: QuizStorage = quizStorage): void {
  storage.deleteTestSession();
}

export function getCompletedResults(storage: QuizStorage = quizStorage): TestResult[] {
  return storage.getTestResults();
}

export function getCompletedResult(resultId: string, storage: QuizStorage = quizStorage): TestResult | null {
  return storage.getTestResult(resultId);
}
