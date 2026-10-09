import type { ReactNode } from 'react';
import { BookmarkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { QuizQuestion } from '../types/quiz.types';
import { SourceNotice } from './SourceNotice';

interface QuestionCardProps {
  question: QuizQuestion;
  position: number;
  isMarked?: boolean;
  /** Shown in Random Mix so learners know which set a question came from. */
  setName?: string;
  children?: ReactNode;
}

export function QuestionCard({ question, position, isMarked, setName, children }: QuestionCardProps) {
  const textId = `question-${question.id}-text`;
  return (
    <Card className="gap-5 py-6 shadow-sm" aria-labelledby={textId} role="article">
      <CardHeader className="gap-3 px-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md px-2 font-semibold">Q{position}</Badge>
          <span className="text-xs text-muted-foreground" data-testid="question-source">
            {setName ? `${setName} · ` : 'Source '}Q{question.questionNumber}
          </span>
          {isMarked && (
            <Badge variant="secondary" className="ml-auto gap-1 bg-review/12 text-review" data-testid="question-marked">
              <BookmarkIcon aria-hidden="true" /> Marked for review
            </Badge>
          )}
        </div>
        <p id={textId} className="text-lg leading-relaxed font-medium whitespace-pre-line sm:text-[1.2rem]">
          {question.question || 'Question text is not available.'}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 sm:px-6">
        <SourceNotice question={question} />
        {children}
      </CardContent>
    </Card>
  );
}
