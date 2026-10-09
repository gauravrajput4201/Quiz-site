import { LightbulbIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ANSWER_UNAVAILABLE_TEXT, EXPLANATION_UNAVAILABLE_TEXT } from '../config/quiz.constants';
import { getQuestionOutcome } from '../services/quizScoring';
import type { QuizQuestion } from '../types/quiz.types';
import { VERDICT } from './verdict';

interface ExplanationPanelProps {
  question: QuizQuestion;
  selectedOptionKey: string | null;
  /** Show the correct/incorrect verdict banner. */
  showVerdict?: boolean;
}

function optionLabel(question: QuizQuestion, key: string | null): string {
  if (!key) return 'Not answered';
  const option = question.options.find((candidate) => candidate.key === key);
  return option ? `(${option.key}) ${option.text}` : `(${key})`;
}


export function ExplanationPanel({ question, selectedOptionKey, showVerdict = true }: ExplanationPanelProps) {
  const outcome = getQuestionOutcome(question, selectedOptionKey);
  const verdict = VERDICT[outcome];
  const VerdictIcon = verdict.icon;
  const { explanation } = question;
  const otherOptions = question.options.filter(
    (option) => option.key !== question.correctOptionKey && explanation?.options[option.key],
  );

  return (
    <section
      data-testid="explanation"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4 animate-in fade-in-0 slide-in-from-bottom-1 sm:p-5"
    >
      {showVerdict && (
        <div data-testid="verdict" className={cn('flex items-center gap-2 self-start rounded-lg px-3 py-1.5 font-semibold', verdict.className)}>
          <VerdictIcon className="size-5" aria-hidden="true" />
          {verdict.text}
        </div>
      )}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-xs font-medium text-muted-foreground">Your answer</dt>
          <dd className={cn('mt-0.5 font-medium', outcome === 'incorrect' && 'text-destructive')}>
            {optionLabel(question, selectedOptionKey)}
          </dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-xs font-medium text-muted-foreground">Correct answer</dt>
          <dd className={cn('mt-0.5 font-medium', question.correctOptionKey && 'text-success')}>
            {question.correctOptionKey
              ? optionLabel(question, question.correctOptionKey)
              : `${ANSWER_UNAVAILABLE_TEXT}${question.correctAnswerText ? ` — source note: ${question.correctAnswerText}` : ''}`}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <LightbulbIcon className="size-4 text-primary" aria-hidden="true" /> Explanation
        </h3>
        {explanation && explanation.correctAnswerPoints.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
            {explanation.correctAnswerPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">{EXPLANATION_UNAVAILABLE_TEXT}</p>
        )}
        {explanation?.note && <p className="text-sm text-muted-foreground italic">{explanation.note}</p>}
      </div>

      {otherOptions.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Why the other options are wrong</h3>
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
              {otherOptions.map((option) => (
                <li
                  key={option.key}
                  className={cn(
                    'flex gap-2 text-muted-foreground',
                    option.key === selectedOptionKey && 'font-medium text-foreground',
                  )}
                >
                  <span className="font-semibold text-foreground">({option.key})</span>
                  <span>{explanation?.options[option.key]}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
