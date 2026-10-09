import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { SET_TEST_DEFINITIONS, TEST_DEFINITIONS } from '../config/tests.config';
import type { MixSetOption } from '../components/MixOptionsDialog';
import {
  getCompletedResult,
  getCompletedResults,
  getMixPool,
  getTestContext,
  resolveActiveSession,
  type TestContext,
} from '../services/quizEngine';
import { flushPendingWrites } from '../services/pendingWrites';
import type { QuizSession, TestResult } from '../types/quiz.types';

/**
 * Route loaders run once per navigation, outside React's render cycle — the
 * right place for storage reads with side effects (e.g. auto-submitting an
 * expired session), and the seam where API calls will go later.
 */

export const AUTO_SUBMITTED_PARAM = 'autoSubmitted';

function expiredRedirect(result: TestResult) {
  return redirect(`/results/${result.resultId}?${AUTO_SUBMITTED_PARAM}=1`);
}

export interface DashboardData {
  active: { session: QuizSession; context: TestContext } | null;
  results: TestResult[];
  tests: TestContext[];
  /** Per-set availability for the Random Mix options. */
  mixSets: MixSetOption[];
}

function getMixSetOptions(): MixSetOption[] {
  const pool = getMixPool();
  return SET_TEST_DEFINITIONS.map((test) => ({
    bankId: test.questionBankId,
    name: test.name,
    available: pool.byBank.get(test.questionBankId)?.length ?? 0,
  })).filter((set) => set.available > 0);
}

export function dashboardLoader(): DashboardData | Response {
  flushPendingWrites();
  const resolved = resolveActiveSession();
  if (resolved.kind === 'expired') return expiredRedirect(resolved.result);
  return {
    active: resolved.kind === 'active' ? { session: resolved.session, context: resolved.context } : null,
    results: getCompletedResults(),
    tests: TEST_DEFINITIONS.map((test) => getTestContext(test.id)).filter(
      (context): context is TestContext => context !== null,
    ),
    mixSets: getMixSetOptions(),
  };
}

export interface SessionData {
  session: QuizSession;
  context: TestContext;
}

export function sessionLoader(): SessionData | Response {
  flushPendingWrites();
  const resolved = resolveActiveSession();
  if (resolved.kind === 'expired') return expiredRedirect(resolved.result);
  if (resolved.kind === 'none') return redirect('/');
  return { session: resolved.session, context: resolved.context };
}

export interface ResultData {
  result: TestResult;
  context: TestContext | null;
}

export function resultLoader({ params }: LoaderFunctionArgs): ResultData {
  flushPendingWrites();
  const result = params.resultId ? getCompletedResult(params.resultId) : null;
  if (!result) {
    throw new Response('Result not found', { status: 404, statusText: 'Result not found' });
  }
  return { result, context: getTestContext(result.testId) };
}

export function statisticsLoader(): { results: TestResult[] } {
  flushPendingWrites();
  return { results: getCompletedResults() };
}
