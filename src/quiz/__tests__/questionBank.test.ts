import { describe, expect, it } from 'vitest';
import { defaultDurationSeconds, SET_TEST_DEFINITIONS, TEST_DEFINITIONS } from '../config/tests.config';
import { getAllQuestionBanks } from '../data/questionBank';
import { parseOptionMap, parseOptions, parseQuestionBank, parseSetMetadata } from '../data/parseQuestionBank';

const setFiles = import.meta.glob<unknown>('../../../mock/*.json', { eager: true, import: 'default' });
const banks = getAllQuestionBanks();

/**
 * Data-quality gate for every set in /mock. Runs automatically for new files,
 * so `npm test` tells you if a newly added set has a problem.
 */
describe.each(Object.entries(setFiles))('set file %s', (path, document) => {
  const fileName = path.split('/').pop()!.replace(/\.json$/i, '');
  const bank = banks.find((candidate) => candidate.fileName === fileName);
  const rawQuestions = (document as { questions?: Record<string, unknown>[] }).questions ?? [];

  it('is discovered and keeps every question record', () => {
    expect(bank, `${fileName} was not loaded`).toBeDefined();
    expect(bank!.invalidRecords).toBe(0);
    expect(bank!.questions).toHaveLength(rawQuestions.length);
  });

  it('resolves every declared correct_option to an existing option', () => {
    const unresolved = rawQuestions
      .filter((raw) => typeof raw.correct_option === 'string' && raw.correct_option.trim() !== '')
      .filter((raw) => !bank!.questions.find((q) => q.questionNumber === raw.question_number)?.correctOptionKey)
      .map((raw) => raw.question_number);
    expect(unresolved, `questions whose correct_option matches no option: ${unresolved.join(', ')}`).toEqual([]);
  });

  it('only leaves questions ungraded when the source has no answer key', () => {
    for (const question of bank!.questions) {
      if (question.correctOptionKey === null) {
        expect(question.raw.correct_option ?? null).toBeNull();
      }
    }
  });

  it('becomes exactly one test set', () => {
    expect(SET_TEST_DEFINITIONS.filter((test) => test.questionBankId === bank!.id)).toHaveLength(1);
  });
});

describe('set discovery', () => {
  it('turns every mock file into a test set, plus one Random Mix', () => {
    expect(SET_TEST_DEFINITIONS).toHaveLength(Object.keys(setFiles).length);
    expect(TEST_DEFINITIONS.filter((test) => test.kind === 'mix')).toHaveLength(1);
    expect(new Set(TEST_DEFINITIONS.map((test) => test.id)).size).toBe(TEST_DEFINITIONS.length);
  });

  it('derives defaults for every set file without settings', () => {
    for (const bank of banks) {
      const test = SET_TEST_DEFINITIONS.find((candidate) => candidate.questionBankId === bank.id)!;
      if (!bank.meta.testId) expect(test.id).toBe(`stet-cs-${bank.id}`);
      if (!bank.meta.name && /\d/.test(bank.fileName)) expect(test.name).toMatch(/^Paper 2 - Mock Test \d+$/);
      if (!bank.meta.durationMinutes) expect(test.durationSeconds).toBe(defaultDurationSeconds(bank.questions.length));
    }
  });

  it('orders sets naturally by file name (sets2 before sets10)', () => {
    const names = SET_TEST_DEFINITIONS.map((test) => banks.find((bank) => bank.id === test.questionBankId)!)
      .filter((bank) => bank.meta.order === undefined)
      .map((bank) => bank.fileName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  });
});

/*
 * Format edge cases use small built-in samples (not your real files), so
 * editing or fixing questions in /mock never breaks these tests.
 */
describe('list-form options with source flags (sets1 style)', () => {
  const bank = parseQuestionBank('sample', {
    questions: [
      { question_number: 1, question: 'Cropped', options: ['(a) Only one visible'], correct_option: null, needs_source_recheck: true, recheck_note: 'Cropped page' },
      { question_number: 2, question: 'Unreadable', options: [], correct_option: null },
      { question_number: 3, question: 'Three options', options: ['(a) A', '(b) B', '(c) C'], correct_option: 'a' },
      {
        question_number: 4,
        question: 'Corrected',
        options: ['(a) A', '(b) B', '(c) C', '(d) D', '(e) Added'],
        correct_option: 'e',
        corrected: true,
        correction_note: 'Added (e)',
        source_question_original: 'Original wording',
        source_options_original: ['(a) A', '(b) B', '(c) C', '(d) D'],
      },
    ],
  });
  const byNumber = (n: number) => bank.questions.find((q) => q.questionNumber === n)!;

  it('never invents answers when the source has none', () => {
    expect(bank.questions.filter((q) => q.correctOptionKey === null).map((q) => q.questionNumber)).toEqual([1, 2]);
    expect(byNumber(2).options).toHaveLength(0);
    expect(byNumber(1).integrity).toMatchObject({ needsSourceRecheck: true, recheckNote: 'Cropped page' });
  });

  it('keeps 3- and 5-option questions and correction metadata', () => {
    expect(byNumber(3).options.map((o) => o.key)).toEqual(['a', 'b', 'c']);
    expect(byNumber(4).correctOptionKey).toBe('e');
    expect(byNumber(4).integrity).toMatchObject({ corrected: true, correctionNote: 'Added (e)', sourceQuestionOriginal: 'Original wording' });
    expect(byNumber(4).integrity.sourceOptionsOriginal).toHaveLength(4);
  });
});

describe('uppercase keys and legacy explanation key (sets2 style)', () => {
  const question = parseQuestionBank('sample', {
    questions: [
      {
        question_number: 1,
        question: 'Q',
        options: ['(A) A + B + C', '(B) AB', '(C) AC', '(D) BC', '(E) AB + AC'],
        correct_option: 'E',
        explanation: { correct_answer: ['Point'], options: { A: 'Too broad' } },
      },
    ],
  }).questions[0]!;

  it('normalises uppercase option prefixes and answer keys', () => {
    expect(question.options.map((o) => o.key)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(question.options[0]!.text).toBe('A + B + C');
    expect(question.correctOptionKey).toBe('e');
  });

  it('reads explanation.correct_answer and uppercase option explanations', () => {
    expect(question.explanation?.correctAnswerPoints).toEqual(['Point']);
    expect(question.explanation?.options.a).toBe('Too broad');
  });
});

describe('object-form options (sets3 style)', () => {
  it('reads { "a": "…" } options in order, case-insensitively, stripping redundant prefixes', () => {
    expect(parseOptionMap({ a: 'O(1)', B: '(b) O(n)', c: 'O(log n)', notes: 'x', d: 5 })).toEqual([
      { key: 'a', label: 'A', text: 'O(1)' },
      { key: 'b', label: 'B', text: 'O(n)' },
      { key: 'c', label: 'C', text: 'O(log n)' },
    ]);
  });

  it('grades object-form questions', () => {
    const parsed = parseQuestionBank('obj', {
      questions: [{ question_number: 1, question: 'Q', options: { a: 'X', b: 'Y' }, correct_option: 'B' }],
    });
    expect(parsed.questions[0]?.options.map((o) => o.key)).toEqual(['a', 'b']);
    expect(parsed.questions[0]?.correctOptionKey).toBe('b');
  });
});

describe('optional set settings', () => {
  it('parses metadata and normalises penalties to negative', () => {
    expect(
      parseSetMetadata({
        test_id: 'my-set',
        test_name: 'DBMS Drill',
        subject: 'Databases',
        duration_minutes: 45,
        order: 3,
        marks_per_question: 2,
        negative_marks: 0.5,
      }),
    ).toEqual({
      testId: 'my-set',
      name: 'DBMS Drill',
      subject: 'Databases',
      description: undefined,
      durationMinutes: 45,
      order: 3,
      marksPerQuestion: 2,
      negativeMarks: -0.5,
    });
  });

  it('ignores invalid metadata values', () => {
    expect(parseSetMetadata({ duration_minutes: -5, marks_per_question: 'two', order: 'x' })).toMatchObject({
      durationMinutes: undefined,
      marksPerQuestion: undefined,
      order: undefined,
    });
  });
});

describe('defensive parsing', () => {
  it('handles malformed input', () => {
    const parsed = parseQuestionBank('x', {
      questions: [
        null,
        { question_number: 'one' },
        { question_number: 1, question: 'Q', options: ['(a) A', 5, '(b) B'], correct_option: 'z' },
        { question_number: 1, question: 'dup', options: [] },
        { question_number: 2, question: 'Q2', options: ['A', 'B'], correct_option: 'B', explanation: 'bad' },
      ],
    });
    expect(parsed.invalidRecords).toBe(3);
    expect(parsed.questions[0]?.correctOptionKey).toBeNull();
    expect(parsed.questions[1]?.correctOptionKey).toBe('b');
    expect(parsed.questions[1]?.explanation).toBeNull();
    expect(parseQuestionBank('y', 'garbage').questions).toEqual([]);
  });

  it('assigns positional keys when prefixes are missing or duplicated', () => {
    expect(parseOptions(['(a) X', '(a) Y', 'Z']).map((o) => o.key)).toEqual(['a', 'b', 'c']);
  });
});
