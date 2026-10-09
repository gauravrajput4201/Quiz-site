import { HistoryIcon, PlayIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getRemainingSeconds, getSessionProgress } from '../services/quizEngine';
import type { QuizSession } from '../types/quiz.types';
import { formatDateTime, formatDuration } from '../utils/formatTime';
import { ModeBadge } from './ModeBadge';

interface ContinueTestCardProps {
  session: QuizSession;
  subject: string;
  onContinue: () => void;
  onDiscard: () => void;
}

export function ContinueTestCard({ session, subject, onContinue, onDiscard }: ContinueTestCardProps) {
  const progress = getSessionProgress(session);
  const remaining = getRemainingSeconds(session);

  return (
    <Card
      aria-labelledby="continue-heading"
      data-testid="continue-card"
      className="overflow-hidden border-primary/20 bg-accent/50 py-0 shadow-sm"
    >
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <HistoryIcon className="size-6" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p id="continue-heading" className="text-xs font-semibold tracking-wider text-primary uppercase">
            Continue Test
          </p>
          <h2 className="text-lg font-semibold">
            {subject} — {session.testName}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <ModeBadge mode={session.mode} />
            <span className="tabular-nums">
              Question <span className="font-medium text-foreground">{progress.position}</span> / {progress.total}
            </span>
            <span className="tabular-nums">{progress.answeredPercent}% completed</span>
            {remaining !== null && <span className="tabular-nums">{formatDuration(remaining)} left</span>}
            <span>Started {formatDateTime(session.startedAt)}</span>
          </div>
          <Progress value={progress.answeredPercent} className="mt-1 h-1.5 bg-primary/15" aria-label="Answered" />
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={onContinue} className="flex-1 px-5 lg:flex-none">
            <PlayIcon /> Continue Test
          </Button>
          <Button size="lg" variant="ghost" onClick={onDiscard} className="text-muted-foreground">
            <Trash2Icon /> Discard Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
