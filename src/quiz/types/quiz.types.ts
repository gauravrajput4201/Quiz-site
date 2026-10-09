/**
 * Core quiz domain types.
 *
 * `Raw*` types describe the mock JSON as it exists on disk. Everything the UI
 * consumes goes through the parser in `data/questionBank.ts`, which produces
 * the normalized `QuizQuestion` shape below.
 */

export type QuizMode = 'learn' | 'practice';
export type SessionStatus = 'in_progress' | 'completed';

/* ------------------------------------------------------------------ */
/* Raw source shape (mock JSON)                                        */
/* ------------------------------------------------------------------ */

export interface RawQuestionExplanation {
  correct_answer_points?: string[];
  /** Legacy key used by some source files. */
  correct_answer?: string[];
  options?: Record<string, string>;
  note?: string;
  status?: string;
  inferred_relationship?: string;
  [key: string]: unknown;
}

export interface RawQuizQuestion {
  question_number: number;
  question: string;
  /** Either `["(a) …"]` or `{ "a": "…" }`. */
  options: string[] | Record<string, string>;
  correct_option?: string | null;
  correct_answer?: string | null;
  explanation?: RawQuestionExplanation;
  extraction_status?: string;
  extraction_note?: string;
  needs_source_recheck?: boolean;
  recheck_note?: string;
  source_issue?: string;
  corrected?: boolean;
  correction_note?: string;
  source_question_original?: string;
  source_options_original?: string[];
  /** Not present in the current data; supported for future topic analytics. */
  topic?: string;
  subject?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Normalized shape                                                    */
/* ------------------------------------------------------------------ */

export interface QuizOption {
  /** Lowercase option key, e.g. "a". */
  key: string;
  /** Display label, e.g. "A". */
  label: string;
  /** Option text without the "(a)" prefix. */
  text: string;
}

export interface QuestionExplanation {
  correctAnswerPoints: string[];
  options: Record<string, string>;
  note?: string;
}

export interface SourceIntegrity {
  extractionStatus?: string;
  extractionNote?: string;
  needsSourceRecheck: boolean;
  recheckNote?: string;
  sourceIssue?: string;
  corrected: boolean;
  correctionNote?: string;
  sourceQuestionOriginal?: string;
  sourceOptionsOriginal?: string[];
}

/**
 * Globally unique question id: `<bankId>#<question_number>`, e.g. "sets2#14".
 * Question numbers repeat across sets, so the set is part of the id.
 */
export type QuestionId = string;

export interface QuizQuestion {
  id: QuestionId;
  /** Set (bank) this question comes from. */
  bankId: string;
  questionNumber: number;
  question: string;
  options: QuizOption[];
  /** Key of the correct option, or `null` when the source has no verifiable answer. */
  correctOptionKey: string | null;
  /** Free-text answer from the source; may be present even when the key is null. */
  correctAnswerText?: string;
  explanation: QuestionExplanation | null;
  integrity: SourceIntegrity;
  /** Topic metadata if the source provides it. Never inferred. */
  topic?: string;
  /** Original record, preserved untouched. */
  raw: RawQuizQuestion;
}

/**
 * Optional top-level fields a set file may declare. Every field is optional;
 * missing values fall back to defaults derived from the file name/content.
 */
export interface SetMetadata {
  /** Stable id — set this if you may rename the file, so history stays linked. */
  testId?: string;
  name?: string;
  subject?: string;
  description?: string;
  durationMinutes?: number;
  /** Sort position on the dashboard (lower first). */
  order?: number;
  marksPerQuestion?: number;
  /** Marks for a wrong answer, e.g. -0.25. */
  negativeMarks?: number;
}

export interface QuestionBank {
  id: string;
  /** File name without extension, e.g. "sets2". */
  fileName: string;
  sourceFile?: string;
  notes: string[];
  meta: SetMetadata;
  questions: QuizQuestion[];
  /** Records that could not be parsed at all (kept for diagnostics). */
  invalidRecords: number;
}

/* ------------------------------------------------------------------ */
/* Tests, sessions, results                                            */
/* ------------------------------------------------------------------ */

export interface ScoringConfig {
  correct: number;
  incorrect: number;
  unanswered: number;
}

interface TestDefinitionBase {
  id: string;
  name: string;
  subject: string;
  description: string;
  durationSeconds: number;
  scoring: ScoringConfig;
}

/** A fixed test built from one set file. */
export interface SetTestDefinition extends TestDefinitionBase {
  kind: 'set';
  questionBankId: string;
}

/** Random questions drawn from several sets at start time. */
export interface MixTestDefinition extends TestDefinitionBase {
  kind: 'mix';
}

export type TestDefinition = SetTestDefinition | MixTestDefinition;

/** User choices for a Random Mix test; saved so resume/retake reuse them. */
export interface MixConfig {
  questionCount: number;
  bankIds: string[];
}

export interface QuizSession {
  version: number;
  sessionId: string;
  testId: string;
  testName: string;
  mode: QuizMode;

  /** Shuffled question ids, fixed for the lifetime of the session. */
  questionIds: QuestionId[];
  currentQuestionIndex: number;

  /** questionId -> option key */
  answers: Record<QuestionId, string>;
  markedForReview: QuestionId[];

  /** Random Mix only: the options the questions were drawn with. */
  mix?: MixConfig;

  startedAt: string;
  lastSavedAt: string;

  /** Practice mode only: total allowed duration and absolute deadline. */
  durationSeconds?: number;
  endsAt?: string;
  /** Snapshot for display/debugging; the deadline is the source of truth. */
  remainingSeconds?: number;

  /** Learn mode: accumulated active seconds (excludes time away). */
  activeSeconds: number;

  status: SessionStatus;
}

export type QuestionOutcome = 'correct' | 'incorrect' | 'unanswered' | 'ungraded';

export interface QuestionResult {
  questionId: QuestionId;
  selectedOptionKey: string | null;
  correctOptionKey: string | null;
  outcome: QuestionOutcome;
  marks: number;
}

export interface TopicStat {
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface TestResult {
  version: number;
  resultId: string;
  sessionId: string;
  testId: string;
  testName: string;
  mode: QuizMode;

  startedAt: string;
  completedAt: string;
  autoSubmitted: boolean;

  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** Questions with no verifiable answer key (excluded from scoring). */
  ungraded: number;

  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;

  timeTakenSeconds: number;
  /** Practice mode only. */
  timeRemainingSeconds?: number;
  durationSeconds?: number;

  /** Per-question data in the order the user saw it — enables review after reload. */
  questions: QuestionResult[];
  topicStats: TopicStat[];

  /** Random Mix only: lets "Retake" draw a new mix with the same options. */
  mix?: MixConfig;
}
