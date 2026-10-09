import type { MixConfig, QuestionBank, QuestionId, QuizQuestion } from '../types/quiz.types';
import { shuffle, type RandomSource } from '../utils/shuffleQuestions';
import { isGradable } from './quizScoring';

/** A mixed question needs a verified answer and at least two choices. */
const MIN_OPTIONS_FOR_MIX = 2;

/** Lowercase, strip punctuation/extra whitespace — catches copies with trivial formatting differences. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Key for exact-duplicate detection: same question wording AND same set of
 * option texts. (Generic stems like "Which is true?" with different options
 * are different questions and are kept.)
 */
export function duplicateKey(question: QuizQuestion): string {
  const options = question.options.map((option) => normalize(option.text)).sort();
  return `${normalize(question.question)}|${options.join('|')}`;
}

export function isMixEligible(question: QuizQuestion): boolean {
  return isGradable(question) && question.options.length >= MIN_OPTIONS_FOR_MIX;
}

export interface MixPool {
  /** Eligible, de-duplicated questions per set, in set order. */
  byBank: Map<string, QuizQuestion[]>;
  total: number;
  duplicatesRemoved: number;
}

/**
 * Builds the pool for a mix: only scorable questions, exact duplicates
 * across (and within) sets removed — the first occurrence wins.
 */
export function buildMixPool(banks: readonly QuestionBank[]): MixPool {
  const seen = new Set<string>();
  const byBank = new Map<string, QuizQuestion[]>();
  let duplicatesRemoved = 0;

  for (const bank of banks) {
    const eligible: QuizQuestion[] = [];
    for (const question of bank.questions) {
      if (!isMixEligible(question)) continue;
      const key = duplicateKey(question);
      if (seen.has(key)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(key);
      eligible.push(question);
    }
    byBank.set(bank.id, eligible);
  }

  const total = [...byBank.values()].reduce((sum, questions) => sum + questions.length, 0);
  return { byBank, total, duplicatesRemoved };
}

/** Number of questions available for the chosen sets. */
export function countAvailable(pool: MixPool, bankIds: readonly string[]): number {
  return bankIds.reduce((sum, bankId) => sum + (pool.byBank.get(bankId)?.length ?? 0), 0);
}

/**
 * Draws `questionCount` questions spread as evenly as possible across the
 * chosen sets (round-robin over shuffled per-set pools), then shuffles the
 * final order. If a set runs out, the others make up the difference; if the
 * whole pool is smaller than requested, every available question is used.
 */
export function selectMixQuestions(pool: MixPool, config: MixConfig, random?: RandomSource): QuestionId[] {
  const queues = shuffle(config.bankIds, random)
    .map((bankId) => shuffle(pool.byBank.get(bankId) ?? [], random))
    .filter((queue) => queue.length > 0);

  const picked: QuestionId[] = [];
  const cursors = queues.map(() => 0);
  while (picked.length < config.questionCount) {
    let progressed = false;
    for (let queueIndex = 0; queueIndex < queues.length && picked.length < config.questionCount; queueIndex += 1) {
      const queue = queues[queueIndex] as QuizQuestion[];
      const cursor = cursors[queueIndex] as number;
      if (cursor >= queue.length) continue;
      picked.push((queue[cursor] as QuizQuestion).id);
      cursors[queueIndex] = cursor + 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return shuffle(picked, random);
}

/** Keeps only known sets and a sane count; falls back to all sets. */
export function normalizeMixConfig(config: Partial<MixConfig> | undefined, allBankIds: readonly string[], fallbackCount: number): MixConfig {
  const known = new Set(allBankIds);
  const bankIds = (config?.bankIds ?? []).filter((bankId, index, list) => known.has(bankId) && list.indexOf(bankId) === index);
  const count = config?.questionCount;
  return {
    bankIds: bankIds.length > 0 ? bankIds : [...allBankIds],
    questionCount: typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : fallbackCount,
  };
}
