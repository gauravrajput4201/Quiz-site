import { TagsIcon, TriangleAlertIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { isWeakTopic } from '../services/quizStatistics';
import type { TopicStat } from '../types/quiz.types';
import { formatPercent } from '../utils/math';

/**
 * Topic-wise accuracy. Renders an explanatory empty state when the question
 * data has no topic metadata — topics are never inferred.
 */
export function TopicAnalysis({ topicStats, compact = false }: { topicStats: readonly TopicStat[]; compact?: boolean }) {
  if (topicStats.length === 0) {
    return (
      <EmptyState title="Topic analysis unavailable" icon={<TagsIcon />}>
        The current question data does not include subject/topic tags, so weak areas cannot be calculated yet.
        {!compact && ' Analysis will appear automatically once questions carry a "topic" field.'}
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {topicStats.map((stat) => {
        const weak = isWeakTopic(stat);
        return (
          <li key={stat.topic} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stat.topic}</span>
              <span className={cn('flex items-center gap-1 font-semibold tabular-nums', weak && 'text-destructive')}>
                {weak && <TriangleAlertIcon className="size-3.5" aria-label="Weak area" />}
                {formatPercent(stat.accuracy)}
              </span>
            </div>
            <Progress
              value={stat.accuracy}
              className={cn('h-2', weak && '*:data-[slot=progress-indicator]:bg-destructive')}
            />
            <span className="text-xs text-muted-foreground">
              {stat.correct} of {stat.attempted} correct
            </span>
          </li>
        );
      })}
    </ul>
  );
}
