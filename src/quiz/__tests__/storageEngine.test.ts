import { describe, expect, it } from 'vitest';
import { MAX_STORED_RESULTS, STORAGE_KEYS } from '../config/quiz.constants';
import { SET_TEST_DEFINITIONS } from '../config/tests.config';
import {
  clearAnswer,
  createSession,
  finalizeSession,
  getTestContext,
  resolveActiveSession,
  selectAnswer,
  toggleMarkForReview,
} from '../services/quizEngine';
import { createQuizStorage } from '../services/quizStorage';
import { MemoryBackend } from './memoryStorage';

const firstSet = SET_TEST_DEFINITIONS[0]!;
const testId = firstSet.id;
const context = getTestContext(testId)!;

function setup() {
  const backend = new MemoryBackend();
  return { backend, storage: createQuizStorage(backend) };
}

describe('quiz storage', () => {
  it('round-trips a session and restores the exact order and progress', () => {
    const { storage } = setup();
    let session = createSession(context, 'practice');
    const q = session.questionIds[36]!;
    session = selectAnswer({ ...session, currentQuestionIndex: 36 }, q, 'a');
    session = toggleMarkForReview(session, q);
    storage.saveTestSession(session);

    const restored = storage.getTestSession()!;
    expect(restored.questionIds).toEqual(session.questionIds);
    expect(restored.currentQuestionIndex).toBe(36);
    expect(restored.answers[q]).toBe('a');
    expect(restored.markedForReview).toEqual([q]);
    expect(restored.endsAt).toBe(session.endsAt);
  });

  it('creates a new shuffled order for every new session', () => {
    const orders = new Set(
      Array.from({ length: 5 }, () => createSession(context, 'practice').questionIds.join(',')),
    );
    expect(orders.size).toBe(5);
  });

  it('discards corrupted session and results data', () => {
    const { backend, storage } = setup();
    backend.setItem(STORAGE_KEYS.activeSession, '{not json');
    backend.setItem(STORAGE_KEYS.results, JSON.stringify({ nope: true }));
    expect(storage.getTestSession()).toBeNull();
    expect(storage.getTestResults()).toEqual([]);
    expect(backend.getItem(STORAGE_KEYS.activeSession)).toBeNull();

    backend.setItem(STORAGE_KEYS.activeSession, JSON.stringify({ sessionId: 'x' }));
    expect(storage.getTestSession()).toBeNull();
  });

  it('keeps only the latest 10 results, newest first', () => {
    const { storage } = setup();
    const ids: string[] = [];
    for (let i = 0; i < MAX_STORED_RESULTS + 1; i += 1) {
      const start = new Date(Date.UTC(2026, 9, 1 + i, 10));
      const session = createSession(context, 'practice', { now: start });
      const result = finalizeSession(session, { storage, now: new Date(start.getTime() + 60_000) })!;
      ids.push(result.resultId);
    }
    const stored = storage.getTestResults();
    expect(stored).toHaveLength(MAX_STORED_RESULTS);
    expect(stored[0]!.resultId).toBe(ids.at(-1));
    expect(stored.map((r) => r.resultId)).not.toContain(ids[0]);
  });

  it('drops individual invalid results but keeps valid ones', () => {
    const { backend, storage } = setup();
    const session = createSession(context, 'learn');
    finalizeSession(session, { storage });
    const valid = JSON.parse(backend.getItem(STORAGE_KEYS.results)!);
    backend.setItem(STORAGE_KEYS.results, JSON.stringify([...valid, { broken: 1 }]));
    expect(storage.getTestResults()).toHaveLength(1);
  });
});

describe('quiz engine', () => {
  it('locks answers in learn mode and allows changes/clear in practice mode', () => {
    const learn = createSession(context, 'learn');
    const q = learn.questionIds[0]!;
    const answered = selectAnswer(learn, q, 'a');
    expect(selectAnswer(answered, q, 'b').answers[q]).toBe('a');
    expect(clearAnswer(answered, q).answers[q]).toBe('a');

    const practice = selectAnswer(createSession(context, 'practice'), q, 'a');
    expect(selectAnswer(practice, q, 'b').answers[q]).toBe('b');
    expect(clearAnswer(practice, q).answers[q]).toBeUndefined();
  });

  it('auto-submits a practice session whose timer expired while closed', () => {
    const { storage } = setup();
    const start = new Date('2026-10-09T08:00:00Z');
    const session = createSession(context, 'practice', { now: start });
    storage.saveTestSession(selectAnswer(session, session.questionIds[0]!, 'a'));

    const later = new Date(start.getTime() + (context.test.durationSeconds + 3600) * 1000);
    const resolved = resolveActiveSession(later, storage);
    expect(resolved.kind).toBe('expired');
    if (resolved.kind !== 'expired') return;
    expect(resolved.result.autoSubmitted).toBe(true);
    expect(resolved.result.timeTakenSeconds).toBe(context.test.durationSeconds);
    expect(resolved.result.timeRemainingSeconds).toBe(0);
    expect(resolved.result.completedAt).toBe(session.endsAt);
    expect(storage.getTestSession()).toBeNull();
    expect(storage.getTestResults()).toHaveLength(1);
  });

  it('resumes an unexpired session unchanged', () => {
    const { storage } = setup();
    const session = createSession(context, 'practice');
    storage.saveTestSession(session);
    const resolved = resolveActiveSession(new Date(), storage);
    expect(resolved.kind).toBe('active');
    if (resolved.kind === 'active') expect(resolved.session.questionIds).toEqual(session.questionIds);
  });

  it('finalizing twice does not duplicate the result', () => {
    const { storage } = setup();
    const session = createSession(context, 'practice');
    finalizeSession(session, { storage });
    finalizeSession(session, { storage });
    expect(storage.getTestResults()).toHaveLength(1);
  });

  it('discards a session whose questions no longer exist in the bank', () => {
    const { storage } = setup();
    const session = createSession(context, 'practice');
    storage.saveTestSession({ ...session, questionIds: [...session.questionIds.slice(1), `${firstSet.questionBankId}#99999`] });
    expect(resolveActiveSession(new Date(), storage).kind).toBe('none');
  });
});
