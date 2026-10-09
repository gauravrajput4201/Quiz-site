import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAnswer,
  finalizeSession,
  getCurrentQuestionId,
  getRemainingSeconds,
  getSessionProgress,
  goToQuestion,
  persistActiveSession,
  selectAnswer,
  toggleMarkForReview,
  type TestContext,
} from '../services/quizEngine';
import type { QuestionId, QuizSession, TestResult } from '../types/quiz.types';
import { useActiveTime } from './useActiveTime';
import { useQuizPersistence } from './useQuizPersistence';

interface UseQuizSessionOptions {
  initialSession: QuizSession;
  context: TestContext;
  onFinished: (result: TestResult | null) => void;
  /** The stored session disappeared or was replaced (e.g. another tab). */
  onSessionLost: () => void;
}

export function useQuizSession({ initialSession, context, onFinished, onSessionLost }: UseQuizSessionOptions) {
  const [session, setSession] = useState(initialSession);
  const sessionRef = useRef(session);
  const finalized = useRef(false);
  const getActiveSeconds = useActiveTime(initialSession.activeSeconds);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const prepare = useCallback(
    (current: QuizSession): QuizSession => ({
      ...current,
      activeSeconds: getActiveSeconds(),
      remainingSeconds: getRemainingSeconds(current) ?? undefined,
    }),
    [getActiveSeconds],
  );

  const { stop } = useQuizPersistence({
    session,
    prepare,
    save: persistActiveSession,
    onSaveRejected: onSessionLost,
  });

  const submit = useCallback(
    (autoSubmitted = false) => {
      if (finalized.current) return;
      finalized.current = true;
      stop();
      onFinished(finalizeSession(prepare(sessionRef.current), { autoSubmitted }));
    },
    [onFinished, prepare, stop],
  );

  const currentQuestionId = getCurrentQuestionId(session);
  const currentQuestion = context.questionsById.get(currentQuestionId);

  const actions = useMemo(
    () => ({
      selectOption: (questionId: QuestionId, optionKey: string) =>
        setSession((current) => selectAnswer(current, questionId, optionKey)),
      clearAnswer: (questionId: QuestionId) => setSession((current) => clearAnswer(current, questionId)),
      toggleMark: (questionId: QuestionId) => setSession((current) => toggleMarkForReview(current, questionId)),
      goTo: (index: number) => setSession((current) => goToQuestion(current, index)),
      next: () => setSession((current) => goToQuestion(current, current.currentQuestionIndex + 1)),
      previous: () => setSession((current) => goToQuestion(current, current.currentQuestionIndex - 1)),
    }),
    [],
  );

  const progress = useMemo(() => getSessionProgress(session), [session]);

  return {
    session,
    currentQuestion,
    currentQuestionId,
    selectedOptionKey: session.answers[currentQuestionId] ?? null,
    isMarked: session.markedForReview.includes(currentQuestionId),
    progress,
    actions,
    submit,
  };
}
