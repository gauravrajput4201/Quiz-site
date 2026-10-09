import { CheckIcon, ClockIcon, CrosshairIcon, GraduationCapIcon, ListChecksIcon, MinusIcon, XIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatGrid, StatTile } from '@/components/common/StatTile';
import { getWeakTopics } from '../services/quizStatistics';
import type { TestResult } from '../types/quiz.types';
import { formatDuration } from '../utils/formatTime';
import { formatPercent } from '../utils/math';
import { ScoreRing } from './ScoreRing';
import { TopicAnalysis } from './TopicAnalysis';

export function LearnSummary({ result }: { result: TestResult }) {
  const completed = result.questions.filter((question) => question.selectedOptionKey !== null).length;
  const weakTopics = getWeakTopics(result.topicStats);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="flex flex-col gap-6 bg-gradient-to-br from-success/8 to-card p-6 sm:flex-row sm:items-center">
          <ScoreRing value={result.accuracy} label="Accuracy" />
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <GraduationCapIcon className="size-4" aria-hidden="true" /> Learning Session Complete
            </p>
            <p data-testid="result-hero" className="text-5xl font-semibold tracking-tight tabular-nums">
              {completed}
              <span className="text-2xl font-medium text-muted-foreground"> / {result.totalQuestions}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              questions completed · {result.correct} correct · {result.incorrect} incorrect
            </p>
          </div>
        </CardContent>
      </Card>

      <StatGrid>
        <StatTile label="Attempted" value={result.attempted} hint="Scored questions answered" icon={<ListChecksIcon />} />
        <StatTile label="Correct" value={result.correct} tone="success" icon={<CheckIcon />} />
        <StatTile label="Incorrect" value={result.incorrect} tone="destructive" icon={<XIcon />} />
        <StatTile label="Accuracy" value={formatPercent(result.accuracy)} icon={<CrosshairIcon />} />
        <StatTile label="Time Spent" value={formatDuration(result.timeTakenSeconds)} hint="Active time" icon={<ClockIcon />} />
        <StatTile label="Not attempted" value={result.unanswered} icon={<MinusIcon />} />
      </StatGrid>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Weak Areas</CardTitle>
        </CardHeader>
        <CardContent>
          {result.topicStats.length > 0 && weakTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weak areas in this session. 🎯</p>
          ) : (
            <TopicAnalysis topicStats={weakTopics.length > 0 ? weakTopics : result.topicStats} compact />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
