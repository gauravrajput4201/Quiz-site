import { MS_PER_SECOND, STORAGE_SCHEMA_VERSION } from '../config/quiz.constants';
import type {
  QuestionId,
  QuestionOutcome,
  QuestionResult,
  QuizQuestion,
  QuizSession,
  ScoringConfig,
  TestResult,
  TopicStat,
} from '../types/quiz.types';
import { createId } from '../utils/id';
import { toPercent } from '../utils/math';

/** A question can be graded only when the source provides a valid answer key. */
export function isGradable(question: QuizQuestion | undefined): boolean {
  return Boolean(question?.correctOptionKey);
}

export function getQuestionOutcome(
  question: QuizQuestion | undefined,
  selectedOptionKey: string | null | undefined,
): QuestionOutcome {
  if (!question || !question.correctOptionKey) return 'ungraded';
  if (!selectedOptionKey) return 'unanswered';
  return selectedOptionKey === question.correctOptionKey ? 'correct' : 'incorrect';
}

export function getMarksForOutcome(outcome: QuestionOutcome, scoring: ScoringConfig): number {
  switch (outcome) {
    case 'correct':
      return scoring.correct;
    case 'incorrect':
      return scoring.incorrect;
    case 'unanswered':
      return scoring.unanswered;
    case 'ungraded':
      return 0;
  }
}

/** Maximum achievable score for a set of questions. Ungraded questions carry no marks. */
export function calculateMaxScore(questions: readonly QuizQuestion[], scoring: ScoringConfig): number {
  return questions.filter(isGradable).length * scoring.correct;
}

export function calculateTopicStats(
  questionResults: readonly QuestionResult[],
  questionsById: ReadonlyMap<QuestionId, QuizQuestion>,
): TopicStat[] {
  const byTopic = new Map<string, { attempted: number; correct: number }>();
  for (const result of questionResults) {
    const topic = questionsById.get(result.questionId)?.topic;
    if (!topic || (result.outcome !== 'correct' && result.outcome !== 'incorrect')) continue;
    const entry = byTopic.get(topic) ?? { attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (result.outcome === 'correct') entry.correct += 1;
    byTopic.set(topic, entry);
  }
  return [...byTopic.entries()]
    .map(([topic, { attempted, correct }]) => ({
      topic,
      attempted,
      correct,
      accuracy: toPercent(correct, attempted),
    }))
    .sort((left, right) => left.accuracy - right.accuracy);
}

export interface CalculateTestResultInput {
  session: QuizSession;
  questionsById: ReadonlyMap<QuestionId, QuizQuestion>;
  scoring: ScoringConfig;
  completedAt: Date;
  autoSubmitted?: boolean;
}

function calculateTiming(session: QuizSession, completedAt: Date) {
  if (session.mode === 'practice' && session.durationSeconds !== undefined && session.endsAt) {
    const startedMs = new Date(session.startedAt).getTime();
    const endsMs = new Date(session.endsAt).getTime();
    const elapsed = Math.round((completedAt.getTime() - startedMs) / MS_PER_SECOND);
    const remaining = Math.round((endsMs - completedAt.getTime()) / MS_PER_SECOND);
    return {
      timeTakenSeconds: Math.min(session.durationSeconds, Math.max(0, elapsed)),
      timeRemainingSeconds: Math.max(0, remaining),
      durationSeconds: session.durationSeconds,
    };
  }
  return { timeTakenSeconds: Math.max(0, Math.round(session.activeSeconds)) };
}

/**
 * Single source of truth for scoring. All result numbers in the app come from
 * here, so negative marking only requires changing the `ScoringConfig`.
 */
export function calculateTestResult({
  session,
  questionsById,
  scoring,
  completedAt,
  autoSubmitted = false,
}: CalculateTestResultInput): TestResult {
  const questions: QuestionResult[] = session.questionIds.map((questionId) => {
    const question = questionsById.get(questionId);
    const selectedOptionKey = session.answers[questionId] ?? null;
    const outcome = getQuestionOutcome(question, selectedOptionKey);
    return {
      questionId,
      selectedOptionKey,
      correctOptionKey: question?.correctOptionKey ?? null,
      outcome,
      marks: getMarksForOutcome(outcome, scoring),
    };
  });

  const count = (outcome: QuestionOutcome) =>
    questions.filter((question) => question.outcome === outcome).length;
  const correct = count('correct');
  const incorrect = count('incorrect');
  const unanswered = count('unanswered');
  const ungraded = count('ungraded');
  const attempted = correct + incorrect;

  const score = questions.reduce((sum, question) => sum + question.marks, 0);
  const maxScore = (questions.length - ungraded) * scoring.correct;

  return {
    version: STORAGE_SCHEMA_VERSION,
    resultId: createId('result'),
    sessionId: session.sessionId,
    testId: session.testId,
    testName: session.testName,
    mode: session.mode,
    startedAt: session.startedAt,
    completedAt: completedAt.toISOString(),
    autoSubmitted,
    totalQuestions: questions.length,
    attempted,
    correct,
    incorrect,
    unanswered,
    ungraded,
    score,
    maxScore,
    percentage: toPercent(score, maxScore),
    accuracy: toPercent(correct, attempted),
    ...calculateTiming(session, completedAt),
    questions,
    topicStats: calculateTopicStats(questions, questionsById),
    ...(session.mix ? { mix: session.mix } : {}),
  };
}
