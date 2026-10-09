import type { QuestionBank, QuestionId, QuizQuestion } from '../types/quiz.types';
import { parseQuestionBank } from './parseQuestionBank';

/**
 * Every `*.json` file in `/mock` is a question set. Vite bundles them at build
 * time, so adding a set = dropping a file in the folder (no code changes).
 * To move to an API later, replace this map with a fetch and keep
 * `parseQuestionBank` as the boundary.
 */
const SET_FILES = import.meta.glob<unknown>('../../../mock/*.json', { eager: true, import: 'default' });

const JSON_EXTENSION = /\.json$/i;

function fileNameFromPath(path: string): string {
  return (path.split('/').pop() ?? path).replace(JSON_EXTENSION, '');
}

/** "Set 2 (final).json" -> "set-2-final" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadBanks(): Map<string, QuestionBank> {
  const banks = new Map<string, QuestionBank>();
  for (const [path, document] of Object.entries(SET_FILES)) {
    const fileName = fileNameFromPath(path);
    const id = slugify(fileName);
    if (!id || banks.has(id)) {
      console.warn(`[questionBank] Skipping "${path}": its file name clashes with another set.`);
      continue;
    }
    const bank = parseQuestionBank(id, document, fileName);
    if (bank.invalidRecords > 0) {
      console.warn(`[questionBank] "${fileName}": ${bank.invalidRecords} invalid question record(s) skipped.`);
    }
    if (bank.questions.length === 0) {
      console.warn(`[questionBank] "${fileName}" has no usable questions and is hidden.`);
      continue;
    }
    banks.set(id, bank);
  }
  return banks;
}

let bankRegistry: Map<string, QuestionBank> | null = null;

function registry(): Map<string, QuestionBank> {
  bankRegistry ??= loadBanks();
  return bankRegistry;
}

export function getAllQuestionBanks(): QuestionBank[] {
  return [...registry().values()];
}

export function getQuestionBank(bankId: string): QuestionBank | undefined {
  return registry().get(bankId);
}

export function indexQuestions(questions: readonly QuizQuestion[]): Map<QuestionId, QuizQuestion> {
  return new Map(questions.map((question) => [question.id, question]));
}

let globalIndex: Map<QuestionId, QuizQuestion> | null = null;

/** Every question of every set, keyed by its global id. */
export function getGlobalQuestionIndex(): Map<QuestionId, QuizQuestion> {
  globalIndex ??= indexQuestions(getAllQuestionBanks().flatMap((bank) => bank.questions));
  return globalIndex;
}
