import { useMemo, useState } from 'react';
import { SearchXIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { ANSWER_UNAVAILABLE_TEXT } from '../config/quiz.constants';
import { getSetName } from '../config/tests.config';
import type { QuestionId, QuestionOutcome, QuizQuestion, TestResult } from '../types/quiz.types';
import { ExplanationPanel } from './ExplanationPanel';
import { VERDICT } from './verdict';
import { QuestionOptions } from './QuestionOptions';
import { SourceNotice } from './SourceNotice';

type ReviewFilter = 'all' | QuestionOutcome;

const FILTER_LABELS: Record<ReviewFilter, string> = {
  all: 'All',
  correct: 'Correct',
  incorrect: 'Incorrect',
  unanswered: 'Unanswered',
  ungraded: ANSWER_UNAVAILABLE_TEXT,
};

interface ResultQuestionReviewProps {
  result: TestResult;
  questionsById: ReadonlyMap<QuestionId, QuizQuestion>;
}

export function ResultQuestionReview({ result, questionsById }: ResultQuestionReviewProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const items = useMemo(
    () => result.questions.map((questionResult, index) => ({ ...questionResult, position: index + 1 })),
    [result.questions],
  );
  const counts = useMemo(() => {
    const totals: Record<ReviewFilter, number> = { all: items.length, correct: 0, incorrect: 0, unanswered: 0, ungraded: 0 };
    for (const item of items) totals[item.outcome] += 1;
    return totals;
  }, [items]);

  const visible = filter === 'all' ? items : items.filter((item) => item.outcome === filter);
  const filters = (Object.keys(FILTER_LABELS) as ReviewFilter[]).filter(
    (key) => key !== 'ungraded' || counts.ungraded > 0,
  );

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="review-heading" className="text-xl font-semibold tracking-tight">
          Review Answers
        </h2>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter}
          onValueChange={(value) => value && setFilter(value as ReviewFilter)}
          aria-label="Filter questions"
          className="flex-wrap"
        >
          {filters.map((key) => (
            <ToggleGroupItem key={key} value={key} className="gap-1.5 px-3 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
              {FILTER_LABELS[key]}
              <span className="text-xs text-muted-foreground tabular-nums">{counts[key]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={`No ${FILTER_LABELS[filter].toLowerCase()} questions`} icon={<SearchXIcon />} />
      ) : (
        <ol className="flex flex-col gap-4">
          {visible.map((item) => {
            const question = questionsById.get(item.questionId);
            const verdict = VERDICT[item.outcome];
            return (
              <li key={item.questionId} data-testid="review-item">
                <Card className="gap-4 shadow-sm">
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">Q{item.position}</span>
                      <span className="text-xs text-muted-foreground">
                        {question
                          ? `${result.mix ? `${getSetName(question.bankId)} · ` : 'Source '}Q${question.questionNumber}`
                          : 'Question unavailable'}
                      </span>
                      <span
                        className={cn(
                          'ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          verdict.className,
                        )}
                      >
                        <verdict.icon className="size-3.5" aria-hidden="true" />
                        {item.outcome === 'unanswered' ? 'Unanswered' : verdict.text}
                      </span>
                    </div>
                    {question && <p className="leading-relaxed font-medium whitespace-pre-line">{question.question}</p>}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {question ? (
                      <>
                        <SourceNotice question={question} />
                        <QuestionOptions question={question} selectedOptionKey={item.selectedOptionKey} reveal disabled />
                        <ExplanationPanel question={question} selectedOptionKey={item.selectedOptionKey} showVerdict={false} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">This question is no longer available in the question bank.</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
