import { AwardIcon, BookOpenIcon, ClockIcon, FileQuestionIcon, PlayIcon, RotateCcwIcon, StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { QuizMode, TestDefinition, TestResult } from '../types/quiz.types';
import { formatDate, formatMinutes } from '../utils/formatTime';
import { formatPercent, formatScore } from '../utils/math';

export interface TestCardStats {
  questionCount: number;
  maxScore: number;
  ungradedCount: number;
  attempts: number;
  bestResult: TestResult | null;
  lastResult: TestResult | null;
}

interface TestCardProps {
  test: TestDefinition;
  stats: TestCardStats;
  /** Unfinished session for this test, if any. */
  unfinishedMode?: QuizMode;
  onStart: (mode: QuizMode) => void;
  onContinue: () => void;
}

export function TestCard({ test, stats, unfinishedMode, onStart, onContinue }: TestCardProps) {
  const { bestResult, lastResult } = stats;
  const status = unfinishedMode
    ? { className: 'bg-warning/15 text-warning-foreground dark:text-warning', text: 'In progress' }
    : lastResult
      ? { className: 'bg-success/12 text-success', text: `Attempted ${stats.attempts}×` }
      : { className: 'bg-muted text-muted-foreground', text: 'Not attempted' };

  const facts = [
    { icon: FileQuestionIcon, label: 'Questions', value: stats.questionCount },
    { icon: AwardIcon, label: 'Marks', value: formatScore(stats.maxScore) },
    { icon: ClockIcon, label: 'Duration', value: formatMinutes(test.durationSeconds) },
    {
      icon: StarIcon,
      label: 'Best score',
      value: bestResult ? `${formatScore(bestResult.score)}/${formatScore(bestResult.maxScore)}` : '—',
    },
  ];

  return (
    <Card className="relative gap-5 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary/60" aria-hidden="true" />
      <CardHeader>
        <CardDescription className="font-medium">{test.subject}</CardDescription>
        <CardTitle className="text-xl">{test.name}</CardTitle>
        <CardAction>
          <Badge variant="secondary" className={cn('font-medium', status.className)}>
            {status.text}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{test.description}</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="test-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-lg bg-muted/60 p-3">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <fact.icon className="size-3.5" aria-hidden="true" /> {fact.label}
              </dt>
              <dd className="mt-0.5 font-semibold whitespace-nowrap tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {stats.ungradedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {stats.ungradedCount} question{stats.ungradedCount === 1 ? '' : 's'} without a verified answer key{' '}
            {stats.ungradedCount === 1 ? 'is' : 'are'} shown but not scored.
          </p>
        )}
        {lastResult && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Last attempt: <span className="font-medium text-foreground">{formatPercent(lastResult.percentage)}</span> ·{' '}
              <span className="capitalize">{lastResult.mode}</span> · {formatDate(lastResult.completedAt)}
            </p>
          </>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-2 border-t bg-muted/30 py-4">
        {unfinishedMode ? (
          <Button size="lg" onClick={onContinue}>
            <PlayIcon /> Continue Test
          </Button>
        ) : (
          <Button size="lg" onClick={() => onStart('practice')}>
            <PlayIcon /> Start Test
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={() => onStart('learn')}>
          <BookOpenIcon /> Learn Mode
        </Button>
        {unfinishedMode && (
          <Button size="lg" variant="ghost" onClick={() => onStart('practice')}>
            <RotateCcwIcon /> Start New Test
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
