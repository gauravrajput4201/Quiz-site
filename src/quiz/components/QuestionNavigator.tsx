import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getQuestionOutcome } from '../services/quizScoring';
import type { QuestionId, QuizMode, QuizQuestion } from '../types/quiz.types';
import type { SessionProgress } from '../services/quizEngine';

interface QuestionNavigatorProps {
  mode: QuizMode;
  questionIds: readonly QuestionId[];
  currentIndex: number;
  answers: Readonly<Record<QuestionId, string>>;
  markedForReview: readonly QuestionId[];
  questionsById: ReadonlyMap<QuestionId, QuizQuestion>;
  progress: SessionProgress;
  onSelect: (index: number) => void;
}

type CellState = 'answered' | 'unanswered' | 'marked' | 'marked-answered' | 'correct' | 'incorrect' | 'info';

const STATE_LABEL: Record<CellState, string> = {
  answered: 'Answered',
  unanswered: 'Not answered',
  marked: 'Marked for review',
  'marked-answered': 'Answered & marked',
  correct: 'Correct',
  incorrect: 'Incorrect',
  info: 'Answer unavailable',
};

const STATE_CLASS: Record<CellState, string> = {
  answered: 'border-success/40 bg-success/15 text-success',
  unanswered: 'border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground',
  marked: 'border-review/50 border-dashed bg-review/8 text-review',
  'marked-answered': 'border-review/50 bg-review/20 text-review',
  correct: 'border-success/40 bg-success/15 text-success',
  incorrect: 'border-destructive/40 bg-destructive/12 text-destructive',
  info: 'border-warning bg-warning/20 text-warning-foreground dark:text-warning',
};

function getCellState(
  mode: QuizMode,
  question: QuizQuestion | undefined,
  answer: string | undefined,
  marked: boolean,
): CellState {
  if (marked) return answer ? 'marked-answered' : 'marked';
  if (!answer) return 'unanswered';
  if (mode === 'practice') return 'answered';
  const outcome = getQuestionOutcome(question, answer);
  return outcome === 'correct' ? 'correct' : outcome === 'incorrect' ? 'incorrect' : 'info';
}

const PRACTICE_LEGEND: CellState[] = ['answered', 'unanswered', 'marked', 'marked-answered'];
const LEARN_LEGEND: CellState[] = ['correct', 'incorrect', 'unanswered', 'marked'];

export const QuestionNavigator = memo(function QuestionNavigator({
  mode,
  questionIds,
  currentIndex,
  answers,
  markedForReview,
  questionsById,
  progress,
  onSelect,
}: QuestionNavigatorProps) {
  const markedSet = new Set(markedForReview);
  const legend = mode === 'practice' ? PRACTICE_LEGEND : LEARN_LEGEND;

  return (
    <Card className="gap-4 py-5 shadow-sm">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center justify-between text-sm">
          Question Palette
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {progress.answered}/{progress.total} answered
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <nav aria-label="Question navigator">
          <ScrollArea className="h-auto lg:h-[min(52vh,420px)] lg:pr-3">
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5 p-1">
              {questionIds.map((questionId, index) => {
                const state = getCellState(mode, questionsById.get(questionId), answers[questionId], markedSet.has(questionId));
                const isCurrent = index === currentIndex;
                return (
                  <li key={questionId}>
                    <button
                      type="button"
                      data-testid="nav-cell"
                      onClick={() => onSelect(index)}
                      aria-label={`Question ${index + 1}, ${STATE_LABEL[state]}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'relative flex aspect-square w-full items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        STATE_CLASS[state],
                        isCurrent && 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-card',
                      )}
                    >
                      {index + 1}
                      {state === 'marked-answered' && (
                        <span className="absolute right-0.5 bottom-0.5 size-1.5 rounded-full bg-success" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </nav>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-4 text-xs text-muted-foreground" aria-label="Legend">
          {legend.map((state) => (
            <li key={state} className="flex items-center gap-2">
              <span className={cn('size-3.5 shrink-0 rounded border', STATE_CLASS[state])} aria-hidden="true" />
              {STATE_LABEL[state]}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded border ring-2 ring-foreground/70 ring-offset-1 ring-offset-card" aria-hidden="true" />
            Current
          </li>
        </ul>
        <dl className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
          {[
            ['Answered', progress.answered, 'text-success'],
            ['Pending', progress.unanswered, 'text-foreground'],
            ['Marked', progress.marked, 'text-review'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg bg-muted/60 py-2">
              <dt className="text-[0.7rem] font-medium text-muted-foreground">{label}</dt>
              <dd className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
});
