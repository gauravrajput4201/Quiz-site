import { BookmarkCheckIcon, BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, EraserIcon, FlagIcon, SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuizMode } from '../types/quiz.types';

interface QuizActionsProps {
  mode: QuizMode;
  isFirst: boolean;
  isLast: boolean;
  isAnswered: boolean;
  isMarked: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMark: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function QuizActions({
  mode,
  isFirst,
  isLast,
  isAnswered,
  isMarked,
  onPrevious,
  onNext,
  onToggleMark,
  onClear,
  onSubmit,
}: QuizActionsProps) {
  const isLearn = mode === 'learn';
  const nextLabel = isLearn ? (isAnswered ? 'Next Question' : 'Skip') : 'Save & Next';

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid grid-cols-3 gap-2 sm:flex">
        <Button variant="outline" size="lg" onClick={onPrevious} disabled={isFirst} aria-keyshortcuts="ArrowLeft">
          <ChevronLeftIcon /> Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onToggleMark}
          aria-pressed={isMarked}
          aria-keyshortcuts="M"
          className={cn(isMarked && 'border-review/50 bg-review/10 text-review hover:bg-review/15 hover:text-review')}
        >
          {isMarked ? <BookmarkCheckIcon /> : <BookmarkIcon />}
          <span>
            {isMarked ? 'Marked' : 'Mark'}
            <span className="hidden md:inline"> for Review</span>
          </span>
        </Button>
        {!isLearn && (
          <Button variant="ghost" size="lg" onClick={onClear} disabled={!isAnswered}>
            <EraserIcon /> Clear
          </Button>
        )}
      </div>
      {isLast ? (
        <Button size="lg" onClick={onSubmit} className="px-5">
          {isLearn ? <FlagIcon /> : <SendIcon />}
          {isLearn ? 'Finish Session' : 'Submit Test'}
        </Button>
      ) : (
        <Button
          size="lg"
          variant={isLearn && !isAnswered ? 'secondary' : 'default'}
          onClick={onNext}
          aria-keyshortcuts="ArrowRight"
          className="px-5"
        >
          {nextLabel} <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
