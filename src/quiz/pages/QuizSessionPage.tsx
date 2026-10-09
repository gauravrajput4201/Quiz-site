import { useCallback, useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { KeyboardIcon, LogOutIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionNavigator } from '../components/QuestionNavigator';
import { QuestionOptions } from '../components/QuestionOptions';
import { QuizActions } from '../components/QuizActions';
import { QuizHeader } from '../components/QuizHeader';
import { QuizProgress } from '../components/QuizProgress';
import { QuizTimer } from '../components/QuizTimer';
import { SubmitConfirmation } from '../components/SubmitConfirmation';
import { useQuizSession } from '../hooks/useQuizSession';
import { getSetName } from '../config/tests.config';
import type { TestResult } from '../types/quiz.types';
import type { SessionData } from './loaders';

export function QuizSessionPage() {
  const { session, context } = useLoaderData() as SessionData;
  // Keyed by session so a new/retaken test always starts with fresh state.
  return <QuizSessionView key={session.sessionId} initial={session} context={context} />;
}

const OPTION_SHORTCUT_PATTERN = /^[1-9a-e]$/i;
const FIRST_LETTER_CODE = 'a'.charCodeAt(0);

/** Text fields keep their keys; option radios defer to the exam shortcuts. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return target.type !== 'radio';
  return target.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target.tagName);
}

function QuizSessionView({ initial, context }: { initial: SessionData['session']; context: SessionData['context'] }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleFinished = useCallback(
    (result: TestResult | null) => navigate(result ? `/results/${result.resultId}` : '/', { replace: true }),
    [navigate],
  );
  const handleLost = useCallback(() => {
    toast.warning('This test was submitted, discarded or replaced in another tab.');
    navigate('/', { replace: true });
  }, [navigate]);

  const { session, currentQuestion, currentQuestionId, selectedOptionKey, isMarked, progress, actions, submit } =
    useQuizSession({ initialSession: initial, context, onFinished: handleFinished, onSessionLost: handleLost });

  const isLearn = session.mode === 'learn';
  const isAnswered = selectedOptionKey !== null;
  const isFirst = session.currentQuestionIndex === 0;
  const isLast = session.currentQuestionIndex === session.questionIds.length - 1;
  const handleExpire = useCallback(() => submit(true), [submit]);

  // Exam-style keyboard shortcuts: ←/→ navigate, 1–9 or A–E pick an option, M marks.
  useEffect(() => {
    if (confirmOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') actions.next();
      else if (event.key === 'ArrowLeft') actions.previous();
      else if (event.key.toLowerCase() === 'm') actions.toggleMark(currentQuestionId);
      else if (OPTION_SHORTCUT_PATTERN.test(event.key) && currentQuestion) {
        const key = event.key.toLowerCase();
        const index = /\d/.test(key) ? Number(key) - 1 : key.charCodeAt(0) - FIRST_LETTER_CODE;
        const option = currentQuestion.options[index];
        if (option) actions.selectOption(currentQuestionId, option.key);
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, confirmOpen, currentQuestion, currentQuestionId]);

  return (
    <div className="flex min-h-svh flex-col">
      <QuizHeader
        subject={context.test.subject}
        testName={session.testName}
        mode={session.mode}
        timer={session.endsAt ? <QuizTimer endsAt={session.endsAt} onExpire={handleExpire} /> : undefined}
        actions={
          <>
            <Button variant="ghost" size="lg" onClick={() => navigate('/')} title="Progress is saved automatically">
              <LogOutIcon /> <span className="hidden sm:inline">Save &amp; Exit</span>
              <span className="sm:hidden">Exit</span>
            </Button>
            <Button size="lg" variant="outline" onClick={() => setConfirmOpen(true)}>
              <SendIcon /> {isLearn ? 'Finish' : 'Submit'}
            </Button>
          </>
        }
      />

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="flex min-w-0 flex-col gap-5">
          <QuizProgress progress={progress} />
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              position={progress.position}
              isMarked={isMarked}
              setName={context.test.kind === 'mix' ? getSetName(currentQuestion.bankId) : undefined}
            >
              <QuestionOptions
                question={currentQuestion}
                selectedOptionKey={selectedOptionKey}
                reveal={isLearn && isAnswered}
                disabled={isLearn && isAnswered}
                variant={isLearn ? 'button' : 'radio'}
                onSelect={(optionKey) => actions.selectOption(currentQuestionId, optionKey)}
              />
              {isLearn && isAnswered && (
                <ExplanationPanel question={currentQuestion} selectedOptionKey={selectedOptionKey} />
              )}
            </QuestionCard>
          ) : (
            <p className="text-sm text-destructive">This question could not be loaded.</p>
          )}
          <QuizActions
            mode={session.mode}
            isFirst={isFirst}
            isLast={isLast}
            isAnswered={isAnswered}
            isMarked={isMarked}
            onPrevious={actions.previous}
            onNext={actions.next}
            onToggleMark={() => actions.toggleMark(currentQuestionId)}
            onClear={() => actions.clearAnswer(currentQuestionId)}
            onSubmit={() => setConfirmOpen(true)}
          />
          <p className="hidden items-center justify-center gap-1.5 text-xs text-muted-foreground md:flex">
            <KeyboardIcon className="size-3.5" aria-hidden="true" />
            ← → navigate · 1–5 / A–E choose · M mark for review · progress saves automatically
          </p>
        </main>

        <aside className="lg:sticky lg:top-24">
          <QuestionNavigator
            mode={session.mode}
            questionIds={session.questionIds}
            currentIndex={session.currentQuestionIndex}
            answers={session.answers}
            markedForReview={session.markedForReview}
            questionsById={context.questionsById}
            progress={progress}
            onSelect={actions.goTo}
          />
        </aside>
      </div>

      <SubmitConfirmation
        open={confirmOpen}
        mode={session.mode}
        progress={progress}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submit(false);
        }}
      />
    </div>
  );
}
