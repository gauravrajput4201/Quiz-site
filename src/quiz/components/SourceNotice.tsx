import { ChevronDownIcon, FilePenLineIcon, TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { QuizQuestion } from '../types/quiz.types';

const COMPLETE_STATUS = 'complete';

/**
 * Surfaces source-integrity metadata from the JSON so learners know when a
 * question was cropped, unreadable or editorially corrected.
 */
export function SourceNotice({ question, showOriginal = true }: { question: QuizQuestion; showOriginal?: boolean }) {
  const { integrity } = question;
  const incomplete =
    integrity.needsSourceRecheck ||
    (integrity.extractionStatus !== undefined && integrity.extractionStatus !== COMPLETE_STATUS);
  const hasOriginal = Boolean(integrity.sourceQuestionOriginal || integrity.sourceOptionsOriginal);

  if (!incomplete && !integrity.corrected) return null;

  return (
    <div className="flex flex-col gap-2">
      {incomplete && (
        <Alert className="border-warning/50 bg-warning/10 text-foreground *:[svg]:text-warning-foreground dark:*:[svg]:text-warning">
          <TriangleAlertIcon />
          <AlertTitle>Source incomplete</AlertTitle>
          <AlertDescription>
            {integrity.extractionNote ??
              integrity.sourceIssue ??
              integrity.recheckNote ??
              'This question could not be fully extracted from the source.'}
            {!question.correctOptionKey && ' This question is not scored.'}
          </AlertDescription>
        </Alert>
      )}
      {integrity.corrected && (
        <Alert className="border-primary/25 bg-accent/60 *:[svg]:text-primary">
          <FilePenLineIcon />
          <AlertTitle>Edited from source</AlertTitle>
          <AlertDescription>
            <p>{integrity.correctionNote ?? 'This question was corrected from the original paper.'}</p>
            {showOriginal && hasOriginal && (
              <Collapsible className="mt-1 w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="link" size="sm" className="group h-auto px-0 text-primary">
                    View original wording
                    <ChevronDownIcon className="transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 text-muted-foreground">
                  {integrity.sourceQuestionOriginal && <p>{integrity.sourceQuestionOriginal}</p>}
                  {integrity.sourceOptionsOriginal && (
                    <ul className="list-disc pl-5">
                      {integrity.sourceOptionsOriginal.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ul>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
