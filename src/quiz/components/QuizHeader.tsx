import type { ReactNode } from 'react';
import type { QuizMode } from '../types/quiz.types';
import { ModeBadge } from './ModeBadge';

interface QuizHeaderProps {
  subject: string;
  testName: string;
  mode: QuizMode;
  timer?: ReactNode;
  actions?: ReactNode;
}

export function QuizHeader({ subject, testName, mode, timer, actions }: QuizHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="hidden text-xs font-medium tracking-wide text-muted-foreground uppercase sm:block">{subject}</p>
          <h1 className="flex flex-wrap items-center gap-2 text-base font-semibold sm:text-lg">
            <span className="truncate">{testName}</span>
            <ModeBadge mode={mode} />
          </h1>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {timer && <div className="mr-auto sm:mr-2">{timer}</div>}
          {actions}
        </div>
      </div>
    </header>
  );
}

