import { CheckIcon, XIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { QuizQuestion } from '../types/quiz.types';

interface QuestionOptionsProps {
  question: QuizQuestion;
  selectedOptionKey: string | null;
  /** Show correct/incorrect styling (learn mode after answering, review). */
  reveal: boolean;
  disabled?: boolean;
  /**
   * `radio` (practice/review): arrow keys move the selection, answers can change.
   * `button` (learn): each click commits once, so arrow keys can't lock in an accidental answer.
   */
  variant?: 'radio' | 'button';
  onSelect?: (optionKey: string) => void;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missed';

function getOptionState(
  optionKey: string,
  selectedOptionKey: string | null,
  correctOptionKey: string | null,
  reveal: boolean,
): OptionState {
  const isSelected = optionKey === selectedOptionKey;
  if (!reveal || !correctOptionKey) return isSelected ? 'selected' : 'idle';
  if (optionKey === correctOptionKey) return isSelected ? 'correct' : 'missed';
  return isSelected ? 'incorrect' : 'idle';
}

const STATE_SUFFIX: Record<OptionState, string> = {
  idle: '',
  selected: '',
  correct: ' — your answer, correct',
  incorrect: ' — your answer, incorrect',
  missed: ' — correct answer',
};

const CARD_BASE =
  'group/option flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left text-[0.95rem] leading-relaxed transition-colors sm:text-base';

const CARD_STATE: Record<OptionState, string> = {
  idle: 'border-border',
  selected: 'border-primary/70 bg-accent',
  correct: 'border-success/70 bg-success/10',
  missed: 'border-success/70 bg-success/5 border-dashed',
  incorrect: 'border-destructive/70 bg-destructive/8',
};

const KEY_STATE: Record<OptionState, string> = {
  idle: 'border-border text-muted-foreground group-hover/option:border-primary/50',
  selected: 'border-primary bg-primary text-primary-foreground',
  correct: 'border-success bg-success text-success-foreground',
  missed: 'border-success text-success',
  incorrect: 'border-destructive bg-destructive text-white',
};

const INTERACTIVE = 'cursor-pointer hover:border-primary/50 hover:bg-accent/40';

function OptionBody({ label, text, state }: { label: string; text: string; state: OptionState }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
          KEY_STATE[state],
        )}
      >
        {label}
      </span>
      <span className="flex-1 pt-0.5">
        {text}
        <span className="sr-only">{STATE_SUFFIX[state]}</span>
      </span>
      {(state === 'correct' || state === 'missed') && (
        <CheckIcon className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
      )}
      {state === 'incorrect' && <XIcon className="mt-1 size-4 shrink-0 text-destructive" aria-hidden="true" />}
    </>
  );
}

export function QuestionOptions({
  question,
  selectedOptionKey,
  reveal,
  disabled,
  variant = 'radio',
  onSelect,
}: QuestionOptionsProps) {
  if (question.options.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No answer options are available for this question in the source.
      </p>
    );
  }

  if (variant === 'button') {
    return (
      <div className="flex flex-col gap-2.5" role="group" aria-label="Answer options">
        {question.options.map((option) => {
          const state = getOptionState(option.key, selectedOptionKey, question.correctOptionKey, reveal);
          return (
            <button
              key={option.key}
              type="button"
              data-testid="option"
              aria-pressed={option.key === selectedOptionKey}
              disabled={disabled}
              onClick={() => onSelect?.(option.key)}
              className={cn(
                CARD_BASE,
                CARD_STATE[state],
                !disabled && INTERACTIVE,
                'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
              )}
            >
              <OptionBody label={option.label} text={option.text} state={state} />
            </button>
          );
        })}
      </div>
    );
  }

  const groupId = `question-${question.id}`;
  return (
    <RadioGroup
      value={selectedOptionKey ?? ''}
      onValueChange={(value) => onSelect?.(value)}
      disabled={disabled}
      orientation="vertical"
      aria-label="Answer options"
      className="gap-2.5"
    >
      {question.options.map((option) => {
        const state = getOptionState(option.key, selectedOptionKey, question.correctOptionKey, reveal);
        const id = `${groupId}-${option.key}`;
        return (
          <label
            key={option.key}
            htmlFor={id}
            data-testid="option"
            className={cn(
              CARD_BASE,
              CARD_STATE[state],
              !disabled && INTERACTIVE,
              'has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
            )}
          >
            <span className="sr-only">
              <RadioGroupItem id={id} value={option.key} />
            </span>
            <OptionBody label={option.label} text={option.text} state={state} />
          </label>
        );
      })}
    </RadioGroup>
  );
}
