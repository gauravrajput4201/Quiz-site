import { getAllQuestionBanks, slugify } from '../data/questionBank';
import type {
  MixTestDefinition,
  QuestionBank,
  ScoringConfig,
  SetTestDefinition,
  TestDefinition,
} from '../types/quiz.types';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_MINUTES_PER_QUESTION,
  DEFAULT_SCORING,
  DEFAULT_SUBJECT,
  DEFAULT_TEST_NAME_PREFIX,
  MIX_DEFAULT_QUESTION_COUNT,
  MIX_DESCRIPTION,
  MIX_MIN_SETS,
  MIX_TEST_ID,
  MIX_TEST_NAME,
  SECONDS_PER_MINUTE,
  TEST_ID_PREFIX,
} from './quiz.constants';

const FIRST_NUMBER = /\d+/;

/** "sets2" -> "Paper 2 - Mock Test 2"; "dbms-practice" -> "Dbms Practice". */
function defaultName(fileName: string): string {
  const number = FIRST_NUMBER.exec(fileName)?.[0];
  if (number) return `${DEFAULT_TEST_NAME_PREFIX} ${Number(number)}`;
  return fileName
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildScoring(bank: QuestionBank): ScoringConfig {
  return {
    ...DEFAULT_SCORING,
    correct: bank.meta.marksPerQuestion ?? DEFAULT_SCORING.correct,
    incorrect: bank.meta.negativeMarks ?? DEFAULT_SCORING.incorrect,
  };
}

/** Default timer: DEFAULT_MINUTES_PER_QUESTION × questions, rounded up to whole minutes. */
export function defaultDurationSeconds(questionCount: number): number {
  return Math.ceil(questionCount * DEFAULT_MINUTES_PER_QUESTION) * SECONDS_PER_MINUTE;
}

function buildTestDefinition(bank: QuestionBank): SetTestDefinition {
  const { meta } = bank;
  return {
    kind: 'set',
    id: meta.testId ? slugify(meta.testId) : `${TEST_ID_PREFIX}${bank.id}`,
    name: meta.name ?? defaultName(bank.fileName),
    subject: meta.subject ?? DEFAULT_SUBJECT,
    description: meta.description ?? DEFAULT_DESCRIPTION,
    questionBankId: bank.id,
    durationSeconds:
      meta.durationMinutes !== undefined
        ? Math.round(meta.durationMinutes * SECONDS_PER_MINUTE)
        : defaultDurationSeconds(bank.questions.length),
    scoring: buildScoring(bank),
  };
}

/** Explicit `order` first, then natural file-name order (sets2 before sets10). */
function compareBanks(left: QuestionBank, right: QuestionBank): number {
  const leftOrder = left.meta.order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.meta.order ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.fileName.localeCompare(right.fileName, undefined, { numeric: true, sensitivity: 'base' });
}

/** Mixed questions use uniform default marking, since sets may differ. */
const MIX_TEST: MixTestDefinition = {
  kind: 'mix',
  id: MIX_TEST_ID,
  name: MIX_TEST_NAME,
  subject: DEFAULT_SUBJECT,
  description: MIX_DESCRIPTION,
  durationSeconds: defaultDurationSeconds(MIX_DEFAULT_QUESTION_COUNT),
  scoring: DEFAULT_SCORING,
};

function buildTestDefinitions(): TestDefinition[] {
  const definitions: TestDefinition[] = [];
  const seenIds = new Set<string>();
  for (const bank of getAllQuestionBanks().sort(compareBanks)) {
    const definition = buildTestDefinition(bank);
    if (seenIds.has(definition.id)) {
      console.warn(`[tests.config] Duplicate test_id "${definition.id}" in "${bank.fileName}"; set skipped.`);
      continue;
    }
    seenIds.add(definition.id);
    definitions.push(definition);
  }
  return definitions.length >= MIX_MIN_SETS && !seenIds.has(MIX_TEST.id) ? [MIX_TEST, ...definitions] : definitions;
}

/**
 * Available test sets, generated from the files in `/mock`. Nothing here
 * needs editing when a set is added — see README "Adding a question set".
 */
export const TEST_DEFINITIONS: readonly TestDefinition[] = buildTestDefinitions();

export function getTestDefinition(testId: string): TestDefinition | undefined {
  return TEST_DEFINITIONS.find((test) => test.id === testId);
}

export const SET_TEST_DEFINITIONS: readonly SetTestDefinition[] = TEST_DEFINITIONS.filter(
  (test): test is SetTestDefinition => test.kind === 'set',
);

/** Display name of the set a question came from, e.g. "Paper 2 - Mock Test 2". */
export function getSetName(bankId: string): string {
  return SET_TEST_DEFINITIONS.find((test) => test.questionBankId === bankId)?.name ?? bankId;
}
