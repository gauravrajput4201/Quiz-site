import { STORAGE_SCHEMA_VERSION } from '../config/quiz.constants';
import { makeQuestionId } from '../data/parseQuestionBank';

/** Maps a stored test id to the set (bank) its numeric v1 question ids belong to. */
export type LegacyBankResolver = (testId: string) => string | undefined;

/** Placeholder bank for v1 history whose test no longer exists (review shows "unavailable"). */
const UNKNOWN_BANK_PREFIX = 'legacy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toId(bankId: string, value: unknown): string | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? makeQuestionId(bankId, number) : null;
}

/**
 * v1 session -> v2. Returns null when the test no longer exists, because an
 * unfinished test can't be resumed without its questions.
 */
export function migrateSessionV1(value: unknown, resolveBankId: LegacyBankResolver): unknown {
  if (!isRecord(value) || typeof value.testId !== 'string' || value.version !== 1) return null;
  const bankId = resolveBankId(value.testId);
  if (!bankId) return null;

  const questionIds = Array.isArray(value.questionIds) ? value.questionIds.map((id) => toId(bankId, id)) : [];
  const answers: Record<string, unknown> = {};
  if (isRecord(value.answers)) {
    for (const [key, answer] of Object.entries(value.answers)) {
      const id = toId(bankId, key);
      if (id) answers[id] = answer;
    }
  }
  const marked = Array.isArray(value.markedForReview) ? value.markedForReview.map((id) => toId(bankId, id)) : [];

  return {
    ...value,
    version: STORAGE_SCHEMA_VERSION,
    questionIds,
    answers,
    markedForReview: marked.filter((id) => id !== null),
  };
}

/** v1 result -> v2. History is always kept, even if its test was removed. */
export function migrateResultV1(value: unknown, resolveBankId: LegacyBankResolver): unknown {
  if (!isRecord(value) || typeof value.testId !== 'string' || value.version !== 1) return value;
  const bankId = resolveBankId(value.testId) ?? `${UNKNOWN_BANK_PREFIX}-${value.testId}`;
  const questions = Array.isArray(value.questions)
    ? value.questions.map((question) =>
        isRecord(question) ? { ...question, questionId: toId(bankId, question.questionId) } : question,
      )
    : value.questions;
  return { ...value, version: STORAGE_SCHEMA_VERSION, questions };
}
