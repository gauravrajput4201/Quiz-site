import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, icon, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      {icon && (
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
