import { Progress } from '@/components/ui/progress';
import type { SessionProgress } from '../services/quizEngine';

export function QuizProgress({ progress }: { progress: SessionProgress }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground" data-testid="quiz-position">
          Question <span className="font-semibold text-foreground tabular-nums">{progress.position}</span> of{' '}
          <span className="tabular-nums">{progress.total}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {progress.positionPercent}% · {progress.answered} answered
        </span>
      </div>
      <Progress value={progress.positionPercent} className="h-1.5" aria-label="Test progress" />
    </div>
  );
}
