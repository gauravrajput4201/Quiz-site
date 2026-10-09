import { MAX_WEAK_TOPICS_SHOWN, WEAK_TOPIC_ACCURACY_THRESHOLD } from '../config/quiz.constants';
import type { TestResult, TopicStat } from '../types/quiz.types';
import { average, toPercent } from '../utils/math';

export interface OverallStatistics {
  testsCompleted: number;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsUnanswered: number;
  overallAccuracy: number;
  averagePercentage: number;
  bestResult: TestResult | null;
  latestResult: TestResult | null;
  averageTimeSeconds: number;
}

function sumBy(results: readonly TestResult[], pick: (result: TestResult) => number): number {
  return results.reduce((sum, result) => sum + pick(result), 0);
}

/** Highest percentage; ties go to the most recent attempt. */
export function findBestResult(results: readonly TestResult[]): TestResult | null {
  return results.reduce<TestResult | null>(
    (best, result) =>
      !best ||
      result.percentage > best.percentage ||
      (result.percentage === best.percentage && result.completedAt > best.completedAt)
        ? result
        : best,
    null,
  );
}

/** Results are stored newest-first. */
export function calculateOverallStatistics(results: readonly TestResult[]): OverallStatistics {
  const questionsAttempted = sumBy(results, (result) => result.attempted);
  const questionsCorrect = sumBy(results, (result) => result.correct);
  return {
    testsCompleted: results.length,
    questionsAttempted,
    questionsCorrect,
    questionsIncorrect: sumBy(results, (result) => result.incorrect),
    questionsUnanswered: sumBy(results, (result) => result.unanswered),
    overallAccuracy: toPercent(questionsCorrect, questionsAttempted),
    averagePercentage: average(results.map((result) => result.percentage)),
    bestResult: findBestResult(results),
    latestResult: results[0] ?? null,
    averageTimeSeconds: average(results.map((result) => result.timeTakenSeconds)),
  };
}

/** Merges per-result topic stats into overall topic accuracy (weakest first). */
export function aggregateTopicStats(results: readonly TestResult[]): TopicStat[] {
  const totals = new Map<string, { attempted: number; correct: number }>();
  for (const result of results) {
    for (const stat of result.topicStats) {
      const entry = totals.get(stat.topic) ?? { attempted: 0, correct: 0 };
      entry.attempted += stat.attempted;
      entry.correct += stat.correct;
      totals.set(stat.topic, entry);
    }
  }
  return [...totals.entries()]
    .map(([topic, { attempted, correct }]) => ({
      topic,
      attempted,
      correct,
      accuracy: toPercent(correct, attempted),
    }))
    .sort((left, right) => left.accuracy - right.accuracy);
}

export function getWeakTopics(topicStats: readonly TopicStat[]): TopicStat[] {
  return topicStats
    .filter((stat) => stat.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD)
    .slice(0, MAX_WEAK_TOPICS_SHOWN);
}

export function isWeakTopic(stat: TopicStat): boolean {
  return stat.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD;
}
