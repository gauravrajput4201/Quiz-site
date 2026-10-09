import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ListChecksIcon, RotateCcwIcon, TimerOffIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LearnSummary } from '../components/LearnSummary';
import { ModeBadge } from '../components/ModeBadge';
import { ResultQuestionReview } from '../components/ResultQuestionReview';
import { ResultSummary } from '../components/ResultSummary';
import { useStartTest } from '../hooks/useStartTest';
import { AUTO_SUBMITTED_PARAM, type ResultData } from './loaders';
import { PageHeader } from './PageHeader';

const REVIEW_SECTION_ID = 'review';

export function ResultPage() {
  const { result, context } = useLoaderData() as ResultData;
  const [searchParams] = useSearchParams();
  const { requestStart, dialog } = useStartTest();
  const justExpired = searchParams.get(AUTO_SUBMITTED_PARAM) === '1';
  const isLearn = result.mode === 'learn';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={context?.test.subject ?? 'Test result'}
        title={
          <>
            {result.testName} <ModeBadge mode={result.mode} />
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="lg" asChild>
              <Link to="/">
                <ArrowLeftIcon /> Dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={!context}
              onClick={() => document.getElementById(REVIEW_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' })}
            >
              <ListChecksIcon /> Review Answers
            </Button>
            {context && (
              <Button size="lg" onClick={() => requestStart(result.testId, result.mode, result.mix)}>
                <RotateCcwIcon /> {isLearn ? 'Learn Again' : 'Retake Test'}
              </Button>
            )}
          </>
        }
      />

      {(justExpired || result.autoSubmitted) && (
        <Alert className="border-warning/50 bg-warning/10 *:[svg]:text-warning-foreground dark:*:[svg]:text-warning">
          <TimerOffIcon />
          <AlertTitle>Time ran out</AlertTitle>
          <AlertDescription>This test was submitted automatically with the answers saved at that moment.</AlertDescription>
        </Alert>
      )}

      {isLearn ? <LearnSummary result={result} /> : <ResultSummary result={result} />}

      <div id={REVIEW_SECTION_ID} className="scroll-mt-24">
        {context ? (
          <ResultQuestionReview result={result} questionsById={context.questionsById} />
        ) : (
          <p className="text-sm text-muted-foreground">
            The questions for this test are no longer available, so answers cannot be reviewed.
          </p>
        )}
      </div>
      {dialog}
    </div>
  );
}
