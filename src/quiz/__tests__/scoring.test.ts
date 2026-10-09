import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORING } from '../config/quiz.constants';
import { SET_TEST_DEFINITIONS } from '../config/tests.config';
import { createSession, getTestContext } from '../services/quizEngine';
import { calculateTestResult } from '../services/quizScoring';
import type { QuizSession } from '../types/quiz.types';

const context = getTestContext(SET_TEST_DEFINITIONS[0]!.id)!;
const gradable = context.questions.filter((q) => q.correctOptionKey);
const now = new Date('2026-10-09T10:00:00Z');

function sessionWith(answers: (q: (typeof context.questions)[number]) => string | undefined): QuizSession {
  const session = createSession(context, 'practice', { now: now });
  const map: Record<string, string> = {};
  for (const q of context.questions) {
    const answer = answers(q);
    if (answer) map[q.id] = answer;
  }
  return { ...session, answers: map };
}

const score = (session: QuizSession, scoring = DEFAULT_SCORING, completedAt = new Date(now.getTime() + 600_000)) =>
  calculateTestResult({ session, questionsById: context.questionsById, scoring, completedAt });

describe('calculateTestResult', () => {
  it('all unanswered', () => {
    const result = score(sessionWith(() => undefined));
    expect(result).toMatchObject({ attempted: 0, correct: 0, score: 0, accuracy: 0, percentage: 0 });
    expect(result.unanswered).toBe(gradable.length);
    expect(result.ungraded).toBe(context.questions.length - gradable.length);
    expect(result.maxScore).toBe(gradable.length);
  });

  it('all correct gives 100% and ignores answers on ungraded questions', () => {
    const result = score(sessionWith((q) => q.correctOptionKey ?? q.options[0]?.key));
    expect(result.correct).toBe(gradable.length);
    expect(result.percentage).toBe(100);
    expect(result.accuracy).toBe(100);
    expect(result.questions.filter((q) => q.outcome === 'ungraded')).toHaveLength(context.questions.length - gradable.length);
  });

  it('all incorrect', () => {
    const result = score(sessionWith((q) => q.options.find((o) => o.key !== q.correctOptionKey)?.key));
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(gradable.length);
    expect(result.accuracy).toBe(0);
  });

  it('supports negative marking via config', () => {
    const result = score(
      sessionWith((q) => q.options.find((o) => o.key !== q.correctOptionKey)?.key),
      { correct: 1, incorrect: -0.25, unanswered: 0 },
    );
    expect(result.score).toBe(-0.25 * gradable.length);
  });

  it('computes practice timing from timestamps', () => {
    const result = score(sessionWith(() => undefined));
    expect(result.timeTakenSeconds).toBe(600);
    expect(result.timeRemainingSeconds).toBe(context.test.durationSeconds - 600);
  });

  it('produces no topic stats when the source has no topics', () => {
    expect(score(sessionWith((q) => q.correctOptionKey ?? undefined)).topicStats).toEqual([]);
  });
});
