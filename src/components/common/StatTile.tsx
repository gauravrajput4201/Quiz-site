import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatTone = 'default' | 'primary' | 'success' | 'destructive' | 'warning';

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  destructive: 'text-destructive',
  warning: 'text-warning-foreground dark:text-warning',
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
}

export function StatTile({ label, value, hint, icon, tone = 'default' }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon && <span className="[&_svg]:size-3.5" aria-hidden="true">{icon}</span>}
        {label}
      </dt>
      <dd className={cn('text-2xl font-semibold tracking-tight tabular-nums', TONE_CLASS[tone])}>{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6', className)}>{children}</dl>;
}
