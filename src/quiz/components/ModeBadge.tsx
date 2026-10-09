import { BookOpenIcon, PencilLineIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { QuizMode } from '../types/quiz.types';

export function ModeBadge({ mode, className }: { mode: QuizMode; className?: string }) {
  const isLearn = mode === 'learn';
  return (
    <Badge
      variant="secondary"
      className={cn(
        isLearn ? 'bg-success/12 text-success' : 'bg-accent text-accent-foreground',
        'gap-1 font-medium',
        className,
      )}
    >
      {isLearn ? <BookOpenIcon aria-hidden="true" /> : <PencilLineIcon aria-hidden="true" />}
      {isLearn ? 'Learn Mode' : 'Practice Mode'}
    </Badge>
  );
}
