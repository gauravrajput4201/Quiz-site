import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { TestResult } from '../types/quiz.types';
import { formatDate } from '../utils/formatTime';
import { formatPercent } from '../utils/math';

const chartConfig = {
  percentage: { label: 'Score', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const Y_TICKS = [0, 25, 50, 75, 100];

/** Single-series bar chart of score % per attempt, oldest → newest. */
export function ScoreTrendChart({ results }: { results: readonly TestResult[] }) {
  const data = [...results].reverse().map((result, index) => ({
    name: `T${index + 1}`,
    percentage: result.percentage,
    testName: result.testName,
    mode: result.mode,
    date: formatDate(result.completedAt),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" data-testid="trend-chart">
      <BarChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} ticks={Y_TICKS} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
        <ChartTooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const item = payload[0]?.payload as (typeof data)[number] | undefined;
                return item ? `${item.testName} · ${item.mode} · ${item.date}` : '';
              }}
              formatter={(value) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-mono font-medium tabular-nums">{formatPercent(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={[6, 6, 0, 0]} maxBarSize={44} minPointSize={3}>
          <LabelList
            dataKey="percentage"
            position="top"
            className="fill-foreground"
            fontSize={11}
            formatter={(value: unknown) => formatPercent(Number(value))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
