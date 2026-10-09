import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AlertDialogCancel } from '@/components/ui/alert-dialog';
import { getActiveSession, getSessionProgress, startTest } from '../services/quizEngine';
import type { MixConfig, QuizMode, QuizSession } from '../types/quiz.types';

interface PendingStart {
  testId: string;
  mode: QuizMode;
  mix?: MixConfig;
  unfinished: QuizSession;
}

/**
 * Starts (or retakes) a test. If another test is unfinished, asks the user
 * whether to continue it or discard it first — never silently overwrites.
 */
export function useStartTest() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingStart | null>(null);

  const begin = (testId: string, mode: QuizMode, mix?: MixConfig) => {
    setPending(null);
    if (!startTest(testId, mode, { mix })) {
      toast.error('This test could not be started because its questions are unavailable.');
      return;
    }
    navigate('/session');
  };

  /** `mix` is only used for the Random Mix test (question count + sets). */
  const requestStart = (testId: string, mode: QuizMode, mix?: MixConfig) => {
    const unfinished = getActiveSession();
    if (unfinished) setPending({ testId, mode, mix, unfinished });
    else begin(testId, mode, mix);
  };

  const progress = pending ? getSessionProgress(pending.unfinished) : null;

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title="You have an unfinished test"
      confirmLabel="Discard & Start New"
      tone="destructive"
      onCancel={() => setPending(null)}
      onConfirm={() => pending && begin(pending.testId, pending.mode, pending.mix)}
      secondaryAction={
        <AlertDialogCancel variant="secondary" onClick={() => navigate('/session')}>
          Continue Unfinished
        </AlertDialogCancel>
      }
      description={
        pending &&
        progress && (
          <>
            <span className="font-medium text-foreground">{pending.unfinished.testName}</span> (
            {pending.unfinished.mode} mode) is at question {progress.position} of {progress.total} with{' '}
            {progress.answered} answered. Starting a new {pending.mode} session will permanently discard it.
          </>
        )
      }
    />
  );

  return { requestStart, dialog };
}
