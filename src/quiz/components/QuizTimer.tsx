import { memo } from 'react';
import { TimerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIMER_CRITICAL_SECONDS, TIMER_WARNING_SECONDS } from '../config/quiz.constants';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { formatClock } from '../utils/formatTime';

interface QuizTimerProps {
  endsAt: string;
  onExpire: () => void;
}

const STATE_CLASS = {
  normal: 'border-border bg-muted/60 text-foreground',
  warning: 'border-warning/60 bg-warning/15 text-warning-foreground dark:text-warning',
  critical: 'border-destructive/50 bg-destructive/10 text-destructive',
} as const;

/** Isolated so the per-second tick re-renders only this component. */
export const QuizTimer = memo(function QuizTimer({ endsAt, onExpire }: QuizTimerProps) {
  const remaining = useQuizTimer(endsAt, onExpire);
  const state =
    remaining <= TIMER_CRITICAL_SECONDS ? 'critical' : remaining <= TIMER_WARNING_SECONDS ? 'warning' : 'normal';

  return (
    <div
      role="timer"
      aria-label={`Time remaining ${formatClock(remaining)}`}
      className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5', STATE_CLASS[state])}
    >
      <TimerIcon className="size-4 opacity-70" aria-hidden="true" />
      <span data-testid="quiz-timer" className="font-mono text-lg font-semibold tabular-nums" aria-hidden="true">
        {formatClock(remaining)}
      </span>
    </div>
  );
});
