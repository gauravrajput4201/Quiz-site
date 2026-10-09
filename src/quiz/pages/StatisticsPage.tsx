import { useMemo } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import {
  BarChart3Icon,
  CheckIcon,
  ClockIcon,
  CrosshairIcon,
  ListChecksIcon,
  MinusIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { StatGrid, StatTile } from '@/components/common/StatTile';
import { RecentTests } from '../components/RecentTests';
import { ScoreTrendChart } from '../components/ScoreTrendChart';
import { TopicAnalysis } from '../components/TopicAnalysis';
import { aggregateTopicStats, calculateOverallStatistics } from '../services/quizStatistics';
import type { TestResult } from '../types/quiz.types';
import { formatDate, formatDuration } from '../utils/formatTime';
import { formatPercent } from '../utils/math';
import { PageHeader } from './PageHeader';

export function StatisticsPage() {
  const { results } = useLoaderData() as { results: TestResult[] };
  const stats = useMemo(() => calculateOverallStatistics(results), [results]);
  const topicStats = useMemo(() => aggregateTopicStats(results), [results]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your performance"
        title="Statistics"
        description={results.length ? `Based on your last ${results.length} completed results.` : undefined}
      />

      {results.length === 0 ? (
        <EmptyState
          title="No statistics yet"
          icon={<BarChart3Icon />}
          action={
            <Button asChild size="lg">
              <Link to="/">Go to tests</Link>
            </Button>
          }
        >
          Complete a test to see your performance trend, accuracy and averages.
        </EmptyState>
      ) : (
        <>
          <StatGrid className="lg:grid-cols-5">
            <StatTile label="Tests Completed" value={stats.testsCompleted} icon={<ListChecksIcon />} />
            <StatTile label="Questions Attempted" value={stats.questionsAttempted} />
            <StatTile label="Correct" value={stats.questionsCorrect} tone="success" icon={<CheckIcon />} />
            <StatTile label="Incorrect" value={stats.questionsIncorrect} tone="destructive" icon={<XIcon />} />
            <StatTile label="Unanswered" value={stats.questionsUnanswered} icon={<MinusIcon />} />
            <StatTile label="Overall Accuracy" value={formatPercent(stats.overallAccuracy)} icon={<CrosshairIcon />} />
            <StatTile label="Average Score" value={formatPercent(stats.averagePercentage)} icon={<BarChart3Icon />} />
            <StatTile
              label="Best Score"
              value={stats.bestResult ? formatPercent(stats.bestResult.percentage) : '—'}
              tone="success"
              icon={<TrophyIcon />}
            />
            <StatTile label="Average Time" value={formatDuration(stats.averageTimeSeconds)} icon={<ClockIcon />} />
          </StatGrid>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Performance Trend</CardTitle>
              <CardDescription>Score percentage per attempt, oldest → newest</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <ScoreTrendChart results={results} />
              <StatGrid className="sm:grid-cols-3 lg:grid-cols-3">
                <StatTile
                  label="Best Performance"
                  value={stats.bestResult ? formatPercent(stats.bestResult.percentage) : '—'}
                  hint={stats.bestResult ? formatDate(stats.bestResult.completedAt) : undefined}
                  tone="success"
                />
                <StatTile label="Average Performance" value={formatPercent(stats.averagePercentage)} />
                <StatTile
                  label="Latest Performance"
                  value={stats.latestResult ? formatPercent(stats.latestResult.percentage) : '—'}
                  hint={stats.latestResult ? formatDate(stats.latestResult.completedAt) : undefined}
                />
              </StatGrid>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Topic Analysis</CardTitle>
              <CardDescription>Accuracy by subject area</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicAnalysis topicStats={topicStats} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTests results={results} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
