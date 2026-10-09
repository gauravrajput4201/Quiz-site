import { Link } from 'react-router-dom';
import { ClipboardListIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TestResult } from '../types/quiz.types';
import { formatDate, formatDuration } from '../utils/formatTime';
import { formatPercent, formatScore } from '../utils/math';
import { ModeBadge } from './ModeBadge';

export function RecentTests({ results }: { results: readonly TestResult[] }) {
  if (results.length === 0) {
    return (
      <EmptyState title="No completed tests yet" icon={<ClipboardListIcon />}>
        Finish a test or learning session to see it here.
      </EmptyState>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Test</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Percentage</TableHead>
          <TableHead className="text-right">Accuracy</TableHead>
          <TableHead className="text-right">Time</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result, index) => (
          <TableRow key={result.resultId}>
            <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
            <TableCell>
              <Link
                to={`/results/${result.resultId}`}
                className="font-medium underline-offset-4 hover:text-primary hover:underline"
              >
                {result.testName}
              </Link>
              {result.autoSubmitted && <span className="ml-1 text-xs text-muted-foreground">· auto-submitted</span>}
            </TableCell>
            <TableCell>
              <ModeBadge mode={result.mode} />
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatScore(result.score)}/{formatScore(result.maxScore)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(result.percentage)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(result.accuracy)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatDuration(result.timeTakenSeconds)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(result.completedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
