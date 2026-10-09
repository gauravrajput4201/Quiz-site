import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { SessionProgress } from '../services/quizEngine';
import type { QuizMode } from '../types/quiz.types';

interface SubmitConfirmationProps {
  open: boolean;
  mode: QuizMode;
  progress: SessionProgress;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitConfirmation({ open, mode, progress, onCancel, onConfirm }: SubmitConfirmationProps) {
  const isLearn = mode === 'learn';
  const items = [
    { label: 'Answered', value: progress.answered, tone: 'text-success bg-success/10' },
    { label: isLearn ? 'Not attempted' : 'Unanswered', value: progress.unanswered, tone: 'text-foreground bg-muted' },
    { label: 'Marked for Review', value: progress.marked, tone: 'text-review bg-review/10' },
  ];

  return (
    <ConfirmDialog
      open={open}
      title={isLearn ? 'Finish this learning session?' : 'Are you sure you want to submit the test?'}
      description={
        isLearn
          ? 'Your learning summary will be saved. Unattempted questions are not counted against accuracy.'
          : 'You cannot change your answers after submitting.'
      }
      confirmLabel={isLearn ? 'Finish Session' : 'Submit Test'}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <dl className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className={cn('rounded-lg p-3 text-center', item.tone)}>
            <dt className="text-[0.7rem] leading-tight font-medium opacity-80">{item.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </ConfirmDialog>
  );
}
