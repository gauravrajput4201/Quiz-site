import { describe, expect, it } from 'vitest';
import { MIX_TEST_ID, STORAGE_KEYS } from '../config/quiz.constants';
import { defaultDurationSeconds } from '../config/tests.config';
import { getGlobalQuestionIndex } from '../data/questionBank';
import { parseQuestionBank } from '../data/parseQuestionBank';
import {
  createSession,
  finalizeSession,
  getMixPool,
  getSetBanks,
  getTestContext,
  resolveActiveSession,
  resolveMixConfig,
  selectAnswer,
} from '../services/quizEngine';
import { buildMixPool, duplicateKey, selectMixQuestions } from '../services/quizMix';
import { createQuizStorage } from '../services/quizStorage';
import { MemoryBackend } from './memoryStorage';

function seeded(seed: number) {
  let state = seed;
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
}

function syntheticBank(id: string, count: number, extra: object[] = []) {
  const questions = Array.from({ length: count }, (_, index) => ({
    question_number: index + 1,
    question: `${id} question ${index + 1}`,
    options: ['(a) one', '(b) two', '(c) three', '(d) four'],
    correct_option: 'a',
  }));
  return parseQuestionBank(id, { questions: [...questions, ...extra] });
}

const countBy = (ids: string[]) =>
  ids.reduce<Record<string, number>>((acc, id) => {
    const bank = id.split('#')[0]!;
    acc[bank] = (acc[bank] ?? 0) + 1;
    return acc;
  }, {});

describe('mix pool', () => {
  it('uses only scorable, unique questions from the real sets', () => {
    const questions = [...getMixPool().byBank.values()].flat();
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(questions.every((q) => q.correctOptionKey !== null && q.options.length >= 2)).toBe(true);
  });

  it('removes exact duplicates across sets, ignoring case/punctuation/option order', () => {
    const a = syntheticBank('a', 2, [
      { question_number: 50, question: 'What is ARP?', options: ['(a) X', '(b) Y'], correct_option: 'a' },
    ]);
    const b = syntheticBank('b', 2, [
      { question_number: 7, question: 'what is  ARP', options: ['(a) y', '(b) x'], correct_option: 'b' },
      { question_number: 8, question: 'What is ARP?', options: ['(a) Z', '(b) Y'], correct_option: 'a' },
    ]);
    const pool = buildMixPool([a, b]);
    expect(pool.duplicatesRemoved).toBe(1);
    expect(pool.byBank.get('a')!.map((q) => q.id)).toContain('a#50');
    expect(pool.byBank.get('b')!.map((q) => q.id)).toEqual(['b#1', 'b#2', 'b#8']);
    expect(duplicateKey(a.questions[2]!)).toBe(duplicateKey(b.questions[2]!));
  });

  it('excludes questions without an answer key or with fewer than 2 options', () => {
    const bank = syntheticBank('c', 1, [
      { question_number: 9, question: 'No key', options: ['(a) A', '(b) B'], correct_option: null },
      { question_number: 10, question: 'One option', options: ['(a) A'], correct_option: 'a' },
    ]);
    expect(buildMixPool([bank]).total).toBe(1);
  });
});

describe('selectMixQuestions', () => {
  const pool = buildMixPool([syntheticBank('a', 40), syntheticBank('b', 40), syntheticBank('c', 40)]);

  it('spreads questions evenly across sets', () => {
    const ids = selectMixQuestions(pool, { questionCount: 30, bankIds: ['a', 'b', 'c'] });
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(countBy(ids)).toEqual({ a: 10, b: 10, c: 10 });
  });

  it('differs by at most one per set when the count does not divide evenly', () => {
    const counts = Object.values(countBy(selectMixQuestions(pool, { questionCount: 31, bankIds: ['a', 'b', 'c'] })));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('lets bigger sets fill in when a set runs out', () => {
    const uneven = buildMixPool([syntheticBank('small', 5), syntheticBank('big', 100)]);
    const ids = selectMixQuestions(uneven, { questionCount: 50, bankIds: ['small', 'big'] });
    expect(countBy(ids)).toEqual({ small: 5, big: 45 });
  });

  it('uses every question when fewer are available than requested', () => {
    expect(selectMixQuestions(pool, { questionCount: 500, bankIds: ['a', 'b'] })).toHaveLength(80);
  });

  it('only draws from the chosen sets', () => {
    expect(Object.keys(countBy(selectMixQuestions(pool, { questionCount: 20, bankIds: ['b'] })))).toEqual(['b']);
  });

  it('is shuffled (not grouped by set) and reproducible with a seed', () => {
    const first = selectMixQuestions(pool, { questionCount: 30, bankIds: ['a', 'b', 'c'] }, seeded(7));
    const again = selectMixQuestions(pool, { questionCount: 30, bankIds: ['a', 'b', 'c'] }, seeded(7));
    expect(again).toEqual(first);
    const firstTen = Object.keys(countBy(first.slice(0, 10)));
    expect(firstTen.length).toBeGreaterThan(1);
  });
});

describe('resolveMixConfig', () => {
  it('defaults to all sets and 100 questions, and drops unknown sets', () => {
    const allIds = getSetBanks().map((bank) => bank.id);
    expect(resolveMixConfig()).toEqual({ questionCount: 100, bankIds: allIds });
    expect(resolveMixConfig({ bankIds: ['nope', allIds[0]!], questionCount: 50 })).toEqual({ questionCount: 50, bankIds: [allIds[0]] });
    expect(resolveMixConfig({ bankIds: ['nope'], questionCount: -3 })).toEqual({ questionCount: 100, bankIds: allIds });
  });
});

describe('Random Mix sessions', () => {
  const context = getTestContext(MIX_TEST_ID)!;
  const [first, second] = getSetBanks().map((bank) => bank.id) as [string, string];

  it('draws a new balanced selection with a matching timer', () => {
    const session = createSession(context, 'practice', { mix: { questionCount: 50, bankIds: [first, second] } });
    expect(session.questionIds).toHaveLength(50);
    expect(countBy(session.questionIds)).toEqual({ [first]: 25, [second]: 25 });
    expect(session.durationSeconds).toBe(defaultDurationSeconds(50));
    expect(session.mix).toEqual({ questionCount: 50, bankIds: [first, second] });
    const other = createSession(context, 'practice', { mix: session.mix });
    expect(other.questionIds.join()).not.toBe(session.questionIds.join());
  });

  it('defaults to 100 questions with the default timer, and has no timer in learn mode', () => {
    expect(createSession(context, 'practice').durationSeconds).toBe(defaultDurationSeconds(100));
    expect(createSession(context, 'learn').endsAt).toBeUndefined();
  });

  it('resumes with the same questions and scores every question out of 1 mark', () => {
    const backend = new MemoryBackend();
    const storage = createQuizStorage(backend);
    let session = createSession(context, 'practice', { mix: { questionCount: 25, bankIds: [first, second] } });
    const index = getGlobalQuestionIndex();
    for (const id of session.questionIds) session = selectAnswer(session, id, index.get(id)!.correctOptionKey!);
    storage.saveTestSession(session);

    const resolved = resolveActiveSession(new Date(), storage);
    expect(resolved.kind).toBe('active');
    if (resolved.kind !== 'active') return;
    expect(resolved.session.questionIds).toEqual(session.questionIds);

    const result = finalizeSession(resolved.session, { storage })!;
    expect(result).toMatchObject({ correct: 25, maxScore: 25, percentage: 100, ungraded: 0 });
    expect(result.mix).toEqual(session.mix);
    expect(JSON.parse(backend.getItem(STORAGE_KEYS.results)!)[0].mix).toEqual(session.mix);
  });
});
