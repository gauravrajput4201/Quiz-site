import { CircleAlertIcon, CircleCheckIcon, CircleMinusIcon, CircleXIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ANSWER_UNAVAILABLE_TEXT } from '../config/quiz.constants';
import type { TestResult } from '../types/quiz.types';
import { toPercent } from '../utils/math';

const SEGMENTS = [
  { key: 'correct', label: 'Correct', icon: CircleCheckIcon, bar: 'bg-success', text: 'text-success' },
  { key: 'incorrect', label: 'Incorrect', icon: CircleXIcon, bar: 'bg-destructive', text: 'text-destructive' },
  { key: 'unanswered', label: 'Unanswered', icon: CircleMinusIcon, bar: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
  { key: 'ungraded', label: ANSWER_UNAVAILABLE_TEXT, icon: CircleAlertIcon, bar: 'bg-warning', text: 'text-warning-foreground dark:text-warning' },
] as const;

/** Stacked bar of question outcomes; the legend carries counts so colour is never the only cue. */
export function PerformanceBreakdown({ result }: { result: TestResult }) {
  const segments = SEGMENTS.map((segment) => ({ ...segment, count: result[segment.key] })).filter(
    (segment) => segment.count > 0,
  );

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-medium">Question outcomes</figcaption>
      <div className="flex h-3 gap-0.5" role="img" aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(', ')}>
        {segments.map((segment) => (
          <Tooltip key={segment.key}>
            <TooltipTrigger asChild>
              <div
                className={cn('min-w-1 rounded-sm first:rounded-l-full last:rounded-r-full', segment.bar)}
                style={{ flexGrow: segment.count }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {segment.label}: {segment.count} ({toPercent(segment.count, result.totalQuestions)}%)
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <segment.icon className={cn('size-4', segment.text)} aria-hidden="true" />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-semibold tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
