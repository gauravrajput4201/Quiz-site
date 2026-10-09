import type {
  QuestionBank,
  SetMetadata,
  QuestionExplanation,
  QuizOption,
  QuizQuestion,
  RawQuizQuestion,
  SourceIntegrity,
} from '../types/quiz.types';

const OPTION_PREFIX_PATTERN = /^\s*\(([a-z])\)\s*([\s\S]*)$/i;
const FIRST_OPTION_CHAR_CODE = 'a'.charCodeAt(0);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function indexToKey(index: number): string {
  return String.fromCharCode(FIRST_OPTION_CHAR_CODE + index);
}

/**
 * Splits "(a) Text" into key/text. Falls back to positional keys when the
 * prefix is missing or duplicated, so every option stays selectable.
 */
export function parseOptions(rawOptions: string[]): QuizOption[] {
  const seen = new Set<string>();
  return rawOptions.map((rawOption, index) => {
    const match = OPTION_PREFIX_PATTERN.exec(rawOption);
    let key = match?.[1]?.toLowerCase() ?? indexToKey(index);
    if (seen.has(key)) key = indexToKey(index);
    seen.add(key);
    const text = match ? (match[2] ?? '').trim() : rawOption.trim();
    return { key, label: key.toUpperCase(), text };
  });
}

const OPTION_KEY_PATTERN = /^[a-z]$/i;

/**
 * Object form used by some files: `{ "a": "O(1)", "b": "O(n)" }`.
 * Keys become option letters (in file order); a redundant "(a)" prefix in the
 * text is stripped. Non-letter keys or non-string values are ignored.
 */
export function parseOptionMap(rawOptions: Record<string, unknown>): QuizOption[] {
  const options: QuizOption[] = [];
  for (const [rawKey, rawText] of Object.entries(rawOptions)) {
    const key = rawKey.trim().toLowerCase();
    if (!OPTION_KEY_PATTERN.test(key) || typeof rawText !== 'string') continue;
    const text = (OPTION_PREFIX_PATTERN.exec(rawText)?.[2] ?? rawText).trim();
    options.push({ key, label: key.toUpperCase(), text });
  }
  return options;
}

/** Accepts both `["(a) …", …]` and `{ "a": "…", … }`. */
function parseAnyOptions(value: unknown): QuizOption[] {
  return isRecord(value) ? parseOptionMap(value) : parseOptions(asStringArray(value));
}

function parseExplanation(value: unknown): QuestionExplanation | null {
  if (!isRecord(value)) return null;

  const points = asStringArray(value.correct_answer_points);
  const correctAnswerPoints = points.length > 0 ? points : asStringArray(value.correct_answer);

  const options: Record<string, string> = {};
  if (isRecord(value.options)) {
    for (const [key, text] of Object.entries(value.options)) {
      const optionText = asString(text);
      if (optionText) options[key.toLowerCase()] = optionText;
    }
  }

  const note = asString(value.note);
  if (correctAnswerPoints.length === 0 && Object.keys(options).length === 0 && !note) return null;
  return { correctAnswerPoints, options, note };
}

function parseIntegrity(record: Record<string, unknown>): SourceIntegrity {
  const sourceOptionsOriginal = asStringArray(record.source_options_original);
  return {
    extractionStatus: asString(record.extraction_status),
    extractionNote: asString(record.extraction_note),
    needsSourceRecheck: record.needs_source_recheck === true,
    recheckNote: asString(record.recheck_note),
    sourceIssue: asString(record.source_issue),
    corrected: record.corrected === true,
    correctionNote: asString(record.correction_note),
    sourceQuestionOriginal: asString(record.source_question_original),
    sourceOptionsOriginal: sourceOptionsOriginal.length > 0 ? sourceOptionsOriginal : undefined,
  };
}

/** `sets2` + 14 -> "sets2#14" */
export function makeQuestionId(bankId: string, questionNumber: number): string {
  return `${bankId}#${questionNumber}`;
}

export function parseQuestion(value: unknown, bankId = ''): QuizQuestion | null {
  if (!isRecord(value)) return null;
  const questionNumber = value.question_number;
  if (typeof questionNumber !== 'number' || !Number.isFinite(questionNumber)) return null;

  const question = typeof value.question === 'string' ? value.question : '';
  const options = parseAnyOptions(value.options);

  // Only accept a correct key that actually exists among the options.
  const rawCorrect = asString(value.correct_option)?.trim().toLowerCase();
  const correctOptionKey =
    rawCorrect && options.some((option) => option.key === rawCorrect) ? rawCorrect : null;

  return {
    id: makeQuestionId(bankId, questionNumber),
    bankId,
    questionNumber,
    question,
    options,
    correctOptionKey,
    correctAnswerText: asString(value.correct_answer),
    explanation: parseExplanation(value.explanation),
    integrity: parseIntegrity(value),
    topic: asString(value.topic),
    raw: value as RawQuizQuestion,
  };
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
  const number = asFiniteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

/** Reads the optional set-level settings (snake_case, matching the question fields). */
export function parseSetMetadata(root: Record<string, unknown>): SetMetadata {
  const negativeMarks = asFiniteNumber(root.negative_marks);
  return {
    testId: asString(root.test_id)?.trim(),
    name: asString(root.test_name)?.trim(),
    subject: asString(root.subject)?.trim(),
    description: asString(root.description)?.trim(),
    durationMinutes: asPositiveNumber(root.duration_minutes),
    order: asFiniteNumber(root.order),
    marksPerQuestion: asPositiveNumber(root.marks_per_question),
    // Accept both -0.25 and 0.25 — a penalty is always applied as negative.
    negativeMarks: negativeMarks === undefined ? undefined : -Math.abs(negativeMarks),
  };
}

/** Parses a question bank JSON document without trusting its shape. */
export function parseQuestionBank(id: string, document: unknown, fileName: string = id): QuestionBank {
  const root = isRecord(document) ? document : {};
  const rawQuestions: unknown[] = Array.isArray(root.questions)
    ? root.questions
    : Array.isArray(document)
      ? document
      : [];

  const questions: QuizQuestion[] = [];
  const seenIds = new Set<string>();
  let invalidRecords = 0;

  for (const rawQuestion of rawQuestions) {
    const parsed = parseQuestion(rawQuestion, id);
    if (!parsed || seenIds.has(parsed.id)) {
      invalidRecords += 1;
      continue;
    }
    seenIds.add(parsed.id);
    questions.push(parsed);
  }

  return {
    id,
    fileName,
    meta: parseSetMetadata(root),
    sourceFile: asString(root.source_file),
    notes: asStringArray(root.notes),
    questions,
    invalidRecords,
  };
}
