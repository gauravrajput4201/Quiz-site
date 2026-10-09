import { CircleAlertIcon, CircleCheckIcon, CircleMinusIcon, CircleXIcon } from 'lucide-react';
import { ANSWER_UNAVAILABLE_TEXT } from '../config/quiz.constants';
import type { QuestionOutcome } from '../types/quiz.types';

/** Icon, label and colour for each question outcome. */
export const VERDICT: Record<QuestionOutcome, { icon: typeof CircleCheckIcon; text: string; className: string }> = {
  correct: { icon: CircleCheckIcon, text: 'Correct', className: 'bg-success/12 text-success' },
  incorrect: { icon: CircleXIcon, text: 'Incorrect', className: 'bg-destructive/10 text-destructive' },
  unanswered: { icon: CircleMinusIcon, text: 'Not answered', className: 'bg-muted text-muted-foreground' },
  ungraded: {
    icon: CircleAlertIcon,
    text: ANSWER_UNAVAILABLE_TEXT,
    className: 'bg-warning/15 text-warning-foreground dark:text-warning',
  },
};
