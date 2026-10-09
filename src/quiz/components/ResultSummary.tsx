import { CheckIcon, ClockIcon, CrosshairIcon, HourglassIcon, ListChecksIcon, MinusIcon, TargetIcon, XIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatGrid, StatTile } from '@/components/common/StatTile';
import type { TestResult } from '../types/quiz.types';
import { formatDateTime, formatDuration } from '../utils/formatTime';
import { formatPercent, formatScore } from '../utils/math';
import { PerformanceBreakdown } from './PerformanceBreakdown';
import { ScoreRing } from './ScoreRing';

export function ResultSummary({ result }: { result: TestResult }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="flex flex-col gap-6 bg-gradient-to-br from-accent/60 to-card p-6 sm:flex-row sm:items-center">
          <ScoreRing value={result.percentage} label="Score" />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Your score</p>
            <p data-testid="result-hero" className="text-5xl font-semibold tracking-tight tabular-nums">
              {formatScore(result.score)}
              <span className="text-2xl font-medium text-muted-foreground"> / {formatScore(result.maxScore)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Accuracy <span className="font-semibold text-foreground">{formatPercent(result.accuracy)}</span> · Submitted{' '}
              {formatDateTime(result.completedAt)}
            </p>
          </div>
          <div className="w-full sm:w-80">
            <PerformanceBreakdown result={result} />
          </div>
        </CardContent>
      </Card>

      <StatGrid className="lg:grid-cols-5">
        <StatTile label="Correct" value={result.correct} tone="success" icon={<CheckIcon />} />
        <StatTile label="Incorrect" value={result.incorrect} tone="destructive" icon={<XIcon />} />
        <StatTile label="Unanswered" value={result.unanswered} icon={<MinusIcon />} />
        <StatTile label="Attempted" value={result.attempted} icon={<ListChecksIcon />} />
        <StatTile label="Accuracy" value={formatPercent(result.accuracy)} hint="Correct ÷ attempted" icon={<CrosshairIcon />} />
        <StatTile label="Percentage" value={formatPercent(result.percentage)} icon={<TargetIcon />} />
        <StatTile label="Max Score" value={formatScore(result.maxScore)} hint={`${result.totalQuestions} questions`} />
        <StatTile label="Time Taken" value={formatDuration(result.timeTakenSeconds)} icon={<ClockIcon />} />
        {result.timeRemainingSeconds !== undefined && (
          <StatTile label="Time Remaining" value={formatDuration(result.timeRemainingSeconds)} icon={<HourglassIcon />} />
        )}
        {result.ungraded > 0 && (
          <StatTile label="Answer unavailable" value={result.ungraded} tone="warning" hint="Not scored" />
        )}
      </StatGrid>
    </div>
  );
}
