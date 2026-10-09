import { describe, expect, it } from 'vitest';
import { LEGACY_STORAGE_KEYS_V1, STORAGE_KEYS } from '../config/quiz.constants';
import { createQuizStorage } from '../services/quizStorage';
import { MemoryBackend } from './memoryStorage';

const now = '2026-10-09T10:00:00.000Z';
const resolve = (testId: string) => (testId === 'stet-cs-sets1' ? 'sets1' : undefined);

function v1Session(testId: string) {
  return {
    version: 1,
    sessionId: 's1',
    testId,
    testName: 'Paper 2 - Mock Test 1',
    mode: 'practice',
    questionIds: [12, 45, 3],
    currentQuestionIndex: 1,
    answers: { 12: 'b', 45: 'a' },
    markedForReview: [45],
    startedAt: now,
    lastSavedAt: now,
    durationSeconds: 3600,
    endsAt: '2099-01-01T00:00:00.000Z',
    activeSeconds: 10,
    status: 'in_progress',
  };
}

function v1Result(testId: string, resultId: string) {
  return {
    version: 1,
    resultId,
    sessionId: `session-${resultId}`,
    testId,
    testName: 'Old test',
    mode: 'practice',
    startedAt: now,
    completedAt: now,
    autoSubmitted: false,
    totalQuestions: 1,
    attempted: 1,
    correct: 1,
    incorrect: 0,
    unanswered: 0,
    ungraded: 0,
    score: 1,
    maxScore: 1,
    percentage: 100,
    accuracy: 100,
    timeTakenSeconds: 60,
    questions: [{ questionId: 7, selectedOptionKey: 'a', correctOptionKey: 'a', outcome: 'correct', marks: 1 }],
    topicStats: [],
  };
}

describe('v1 -> v2 storage migration', () => {
  it('converts an unfinished session and history to set-qualified ids', () => {
    const backend = new MemoryBackend();
    backend.setItem(LEGACY_STORAGE_KEYS_V1.activeSession, JSON.stringify(v1Session('stet-cs-sets1')));
    backend.setItem(
      LEGACY_STORAGE_KEYS_V1.results,
      JSON.stringify([v1Result('stet-cs-sets1', 'r1'), v1Result('removed-test', 'r2')]),
    );

    const storage = createQuizStorage(backend, { resolveLegacyBankId: resolve });
    const session = storage.getTestSession()!;
    expect(session.version).toBe(2);
    expect(session.questionIds).toEqual(['sets1#12', 'sets1#45', 'sets1#3']);
    expect(session.answers).toEqual({ 'sets1#12': 'b', 'sets1#45': 'a' });
    expect(session.markedForReview).toEqual(['sets1#45']);
    expect(session.currentQuestionIndex).toBe(1);

    const results = storage.getTestResults();
    expect(results.map((r) => r.questions[0]!.questionId).sort()).toEqual(['legacy-removed-test#7', 'sets1#7']);
    expect(backend.getItem(LEGACY_STORAGE_KEYS_V1.activeSession)).toBeNull();
    expect(backend.getItem(LEGACY_STORAGE_KEYS_V1.results)).toBeNull();
  });

  it('drops an unfinished session whose test no longer exists', () => {
    const backend = new MemoryBackend();
    backend.setItem(LEGACY_STORAGE_KEYS_V1.activeSession, JSON.stringify(v1Session('removed-test')));
    expect(createQuizStorage(backend, { resolveLegacyBankId: resolve }).getTestSession()).toBeNull();
  });

  it('never overwrites existing v2 data', () => {
    const backend = new MemoryBackend();
    backend.setItem(STORAGE_KEYS.results, JSON.stringify([]));
    backend.setItem(LEGACY_STORAGE_KEYS_V1.results, JSON.stringify([v1Result('stet-cs-sets1', 'r1')]));
    expect(createQuizStorage(backend, { resolveLegacyBankId: resolve }).getTestResults()).toEqual([]);
  });
});
