import { useMemo, useState } from 'react';
import { ShuffleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MIX_QUESTION_COUNT_OPTIONS } from '../config/quiz.constants';
import { defaultDurationSeconds } from '../config/tests.config';
import type { MixConfig, QuizMode } from '../types/quiz.types';
import { formatMinutes } from '../utils/formatTime';

export interface MixSetOption {
  bankId: string;
  name: string;
  available: number;
}

interface MixOptionsDialogProps {
  open: boolean;
  mode: QuizMode;
  sets: readonly MixSetOption[];
  initialConfig: MixConfig;
  onCancel: () => void;
  onStart: (config: MixConfig) => void;
}

export function MixOptionsDialog({ open, mode, sets, initialConfig, onCancel, onStart }: MixOptionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        {/* Keyed so every opening starts from the initial choices. */}
        {open && <MixOptionsForm key={String(open)} mode={mode} sets={sets} initialConfig={initialConfig} onCancel={onCancel} onStart={onStart} />}
      </DialogContent>
    </Dialog>
  );
}

function MixOptionsForm({ mode, sets, initialConfig, onCancel, onStart }: Omit<MixOptionsDialogProps, 'open'>) {
  const [questionCount, setQuestionCount] = useState(initialConfig.questionCount);
  const [selected, setSelected] = useState<string[]>(initialConfig.bankIds);

  const available = useMemo(
    () => sets.filter((set) => selected.includes(set.bankId)).reduce((sum, set) => sum + set.available, 0),
    [sets, selected],
  );
  const effectiveCount = Math.min(questionCount, available);
  const perSet = selected.length > 0 ? Math.floor(effectiveCount / selected.length) : 0;
  const allSelected = selected.length === sets.length;

  const toggleSet = (bankId: string, checked: boolean) =>
    setSelected((current) =>
      checked ? sets.map((set) => set.bankId).filter((id) => id === bankId || current.includes(id)) : current.filter((id) => id !== bankId),
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShuffleIcon className="size-5 text-primary" aria-hidden="true" />
          Random Mix — {mode === 'learn' ? 'Learn Mode' : 'Practice Mode'}
        </DialogTitle>
        <DialogDescription>
          A new set of questions is drawn every time, spread evenly across the sets you choose.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Number of questions</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(questionCount)}
            onValueChange={(value) => value && setQuestionCount(Number(value))}
            aria-label="Number of questions"
            className="w-full"
          >
            {MIX_QUESTION_COUNT_OPTIONS.map((count) => (
              <ToggleGroupItem
                key={count}
                value={String(count)}
                className="flex-1 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {count}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between">
            <legend className="text-sm font-medium">Include sets</legend>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0"
              onClick={() => setSelected(allSelected ? [] : sets.map((set) => set.bankId))}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </div>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border p-1">
            {sets.map((set) => {
              const id = `mix-set-${set.bankId}`;
              return (
                <Label
                  key={set.bankId}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 font-normal hover:bg-muted/60"
                >
                  <Checkbox
                    id={id}
                    checked={selected.includes(set.bankId)}
                    onCheckedChange={(checked) => toggleSet(set.bankId, checked === true)}
                  />
                  <span className="flex-1">{set.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{set.available} questions</span>
                </Label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-lg bg-muted/60 p-3 text-sm" aria-live="polite" data-testid="mix-summary">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select at least one set.</span>
          ) : (
            <>
              <span className="font-semibold tabular-nums">{effectiveCount} questions</span>
              <span className="text-muted-foreground">
                {' '}
                · about {perSet} from each of {selected.length} set{selected.length === 1 ? '' : 's'}
                {mode === 'practice' && ` · ${formatMinutes(defaultDurationSeconds(effectiveCount))}`}
              </span>
              {effectiveCount < questionCount && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Only {available} questions are available in the selected sets, so all of them will be used.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={selected.length === 0} onClick={() => onStart({ questionCount, bankIds: selected })}>
          <ShuffleIcon /> Start {effectiveCount}-question mix
        </Button>
      </DialogFooter>
    </>
  );
}
