import { BookOpenIcon, LayersIcon, PlayIcon, ShuffleIcon, SparklesIcon, StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MixTestDefinition, QuizMode } from '../types/quiz.types';
import { formatPercent } from '../utils/math';
import type { TestCardStats } from './TestCard';

interface MixTestCardProps {
  test: MixTestDefinition;
  poolSize: number;
  setCount: number;
  stats: Pick<TestCardStats, 'attempts' | 'bestResult'>;
  unfinishedMode?: QuizMode;
  onStart: (mode: QuizMode) => void;
  onContinue: () => void;
}

export function MixTestCard({ test, poolSize, setCount, stats, unfinishedMode, onStart, onContinue }: MixTestCardProps) {
  const status = unfinishedMode
    ? { className: 'bg-warning/15 text-warning-foreground dark:text-warning', text: 'In progress' }
    : { className: 'bg-accent text-accent-foreground', text: 'New questions every time' };

  const facts = [
    { icon: LayersIcon, label: 'Question pool', value: `${poolSize} from ${setCount} sets` },
    { icon: ShuffleIcon, label: 'Selection', value: 'Even across sets' },
    { icon: StarIcon, label: 'Best', value: stats.bestResult ? formatPercent(stats.bestResult.percentage) : '—' },
  ];

  return (
    <Card className="relative gap-5 overflow-hidden border-primary/25 shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 font-medium">
          <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" /> {test.subject} · All sets
        </CardDescription>
        <CardTitle className="text-xl">{test.name}</CardTitle>
        <CardAction>
          <Badge variant="secondary" className={cn('font-medium', status.className)}>
            {status.text}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{test.description}</p>
        <dl className="grid gap-3 sm:grid-cols-3" data-testid="mix-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-lg bg-muted/60 p-3">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <fact.icon className="size-3.5" aria-hidden="true" /> {fact.label}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Only questions with a verified answer are used, and exact duplicates across sets are removed.
          {stats.attempts > 0 && ` Attempted ${stats.attempts}×.`}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-2 border-t bg-muted/30 py-4">
        {unfinishedMode ? (
          <Button size="lg" onClick={onContinue}>
            <PlayIcon /> Continue Mix
          </Button>
        ) : (
          <Button size="lg" onClick={() => onStart('practice')}>
            <ShuffleIcon /> Start Random Mix
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={() => onStart('learn')}>
          <BookOpenIcon /> Learn with Random Mix
        </Button>
      </CardFooter>
    </Card>
  );
}
