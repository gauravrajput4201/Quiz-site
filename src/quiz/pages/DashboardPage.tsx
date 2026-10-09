import { useMemo, useState } from 'react';
import { useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import { BarChart3Icon, CalendarCheckIcon, FileQuestionIcon, LayersIcon, TrophyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatGrid, StatTile } from '@/components/common/StatTile';
import { ContinueTestCard } from '../components/ContinueTestCard';
import { RecentTests } from '../components/RecentTests';
import { MixOptionsDialog } from '../components/MixOptionsDialog';
import { MixTestCard } from '../components/MixTestCard';
import { TestCard, type TestCardStats } from '../components/TestCard';
import { useStartTest } from '../hooks/useStartTest';
import { discardActiveSession, resolveMixConfig } from '../services/quizEngine';
import { calculateMaxScore, isGradable } from '../services/quizScoring';
import { calculateOverallStatistics, findBestResult } from '../services/quizStatistics';
import type { QuizMode } from '../types/quiz.types';
import { formatDate } from '../utils/formatTime';
import { formatPercent, formatScore } from '../utils/math';
import { PageHeader } from './PageHeader';
import type { DashboardData } from './loaders';

export function DashboardPage() {
  const { active, results, tests, mixSets } = useLoaderData() as DashboardData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { requestStart, dialog } = useStartTest();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [mixDialogMode, setMixDialogMode] = useState<QuizMode | null>(null);

  const overall = useMemo(() => calculateOverallStatistics(results), [results]);
  const setTests = useMemo(() => tests.filter((context) => context.test.kind === 'set'), [tests]);
  const mixContext = tests.find((context) => context.test.kind === 'mix');
  const totalQuestions = setTests.reduce((sum, context) => sum + context.questions.length, 0);
  const mixResults = mixContext ? results.filter((result) => result.testId === mixContext.test.id) : [];
  const lastMix = mixResults.find((result) => result.mix)?.mix;
  const lastResult = overall.latestResult;

  const cardStats = useMemo(
    () =>
      new Map<string, TestCardStats>(
        setTests.map(({ test, questions }) => {
          const testResults = results.filter((result) => result.testId === test.id);
          return [
            test.id,
            {
              questionCount: questions.length,
              maxScore: calculateMaxScore(questions, test.scoring),
              ungradedCount: questions.filter((question) => !isGradable(question)).length,
              attempts: testResults.length,
              bestResult: findBestResult(testResults),
              lastResult: testResults[0] ?? null,
            },
          ];
        }),
      ),
    [setTests, results],
  );

  const handleDiscard = () => {
    discardActiveSession();
    setConfirmDiscard(false);
    toast.success('Unfinished test discarded');
    revalidator.revalidate();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Bihar STET · Computer Science"
        title="Test Series"
        description="Practise previous-year questions under exam conditions, or learn with instant explanations."
      />

      {active && (
        <ContinueTestCard
          session={active.session}
          subject={active.context.test.subject}
          onContinue={() => navigate('/session')}
          onDiscard={() => setConfirmDiscard(true)}
        />
      )}

      <StatGrid>
        <StatTile label="Total Questions" value={totalQuestions} icon={<FileQuestionIcon />} />
        <StatTile label="Test Sets" value={setTests.length} icon={<LayersIcon />} />
        <StatTile label="Tests Attempted" value={overall.testsCompleted} hint="Last 10 kept" icon={<CalendarCheckIcon />} />
        <StatTile
          label="Best Score"
          value={overall.bestResult ? formatPercent(overall.bestResult.percentage) : '—'}
          tone={overall.bestResult ? 'success' : 'default'}
          icon={<TrophyIcon />}
        />
        <StatTile
          label="Average Score"
          value={overall.testsCompleted ? formatPercent(overall.averagePercentage) : '—'}
          
          icon={<BarChart3Icon />}
        />
        <StatTile
          label="Last Result"
          value={lastResult ? `${formatScore(lastResult.score)}/${formatScore(lastResult.maxScore)}` : '—'}
          hint={lastResult ? `${formatPercent(lastResult.percentage)} · ${formatDate(lastResult.completedAt)}` : undefined}
        />
      </StatGrid>

      <section aria-labelledby="tests-heading" className="flex flex-col gap-4">
        <h2 id="tests-heading" className="text-xl font-semibold tracking-tight">
          Available Tests
        </h2>
        {setTests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test sets could be loaded from the question data.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {mixContext?.test.kind === 'mix' && (
              <MixTestCard
                test={mixContext.test}
                poolSize={mixContext.questions.length}
                setCount={mixSets.length}
                stats={{ attempts: mixResults.length, bestResult: findBestResult(mixResults) }}
                unfinishedMode={active?.session.testId === mixContext.test.id ? active.session.mode : undefined}
                onStart={setMixDialogMode}
                onContinue={() => navigate('/session')}
              />
            )}
            {setTests.map(({ test }) => (
              <TestCard
                key={test.id}
                test={test}
                stats={cardStats.get(test.id) as TestCardStats}
                unfinishedMode={active?.session.testId === test.id ? active.session.mode : undefined}
                onStart={(mode) => requestStart(test.id, mode)}
                onContinue={() => navigate('/session')}
              />
            ))}
          </div>
        )}
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Tests</CardTitle>
          <CardDescription>Your latest 10 completed tests and learning sessions.</CardDescription>
          {results.length > 0 && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => navigate('/stats')}>
                View statistics
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <RecentTests results={results} />
        </CardContent>
      </Card>

      {dialog}
      {mixContext && (
        <MixOptionsDialog
          open={mixDialogMode !== null}
          mode={mixDialogMode ?? 'practice'}
          sets={mixSets}
          initialConfig={resolveMixConfig(lastMix)}
          onCancel={() => setMixDialogMode(null)}
          onStart={(config) => {
            const mode = mixDialogMode ?? 'practice';
            setMixDialogMode(null);
            requestStart(mixContext.test.id, mode, config);
          }}
        />
      )}
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unfinished test?"
        description="Your answers and progress for this test will be permanently deleted. This cannot be undone."
        confirmLabel="Discard Test"
        tone="destructive"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={handleDiscard}
      />
    </div>
  );
}
