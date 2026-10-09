# Bihar STET Computer Science — Test Series

Vite + React + TypeScript quiz platform built with shadcn/ui (Radix, Tailwind v4) and a calm blue theme with light/dark mode. Works fully offline on local mock data.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Vitest unit tests (engine, scoring, storage, parser, shuffle) |

## Adding a question set

Drop a `.json` file into `mock/` — that's it. Every file there becomes a test
set automatically (no code changes), then run `npm test` to validate it.

Minimum file shape (same as the existing sets):

```json
{
  "questions": [
    {
      "question_number": 1,
      "question": "…",
      "options": ["(a) …", "(b) …", "(c) …", "(d) …"],
      "correct_option": "b",
      "correct_answer": "…",
      "explanation": {
        "correct_answer_points": ["…"],
        "options": { "a": "…", "c": "…", "d": "…" }
      }
    }
  ]
}
```

Handled automatically: options as a list (`["(a) …"]`) or an object (`{ "a": "…" }`), `(a)` or `(A)` prefixes, `correct_option` in either case,
`explanation.correct_answer_points` or `explanation.correct_answer`, 3–5+ options,
missing explanations, and `correct_option: null` (shown as "Answer unavailable",
not scored).

Optional top-level settings (all can be omitted):

| Field | Default | Purpose |
| --- | --- | --- |
| `test_name` | `Paper 2 - Mock Test <number in file name>` | Card title |
| `subject` | `Bihar STET Computer Science` | Card subtitle |
| `description` | generic text | Card description |
| `duration_minutes` | 0.6 min × questions (100 → 60) | Practice timer |
| `order` | natural file-name order (`sets2` before `sets10`) | Dashboard position |
| `marks_per_question` | `1` | Marks for a correct answer |
| `negative_marks` | `0` | Penalty per wrong answer (e.g. `0.25`) |
| `test_id` | `stet-cs-<file name>` | Keep this fixed if you might rename the file |

Notes:
- History and unfinished tests are linked to the test id. Renaming a file
  changes its id unless `test_id` is set.
- `npm test` checks every set: all records parse, and every `correct_option`
  matches a real option. A failing test names the file and question numbers.
- Files with no usable questions are hidden (a warning is logged).

## Random Mix

With 2+ sets, the dashboard shows a **Random Mix** card. Starting it opens an
options dialog (25 / 50 / 100 questions, choose sets). Each start draws a new
selection; set-wise tests are unchanged.

- Pool: only questions with a verified answer and 2+ options; exact duplicates
  (same wording and options, ignoring case/punctuation) are removed, first set wins.
- Selection: round-robin across the chosen sets, so each set contributes
  equally (±1); if a set runs out the others fill in; then the order is shuffled.
- Timer: 0.6 min per question (50 → 30 min, 100 → 60 min); +1 / 0 marking.
- The drawn questions and options are saved with the session, so resume keeps
  the same questions; "Retake" draws a new mix with the same options.
- Questions are identified as `<file name>#<question_number>` (e.g. `sets2#14`),
  so keep file names and question numbers stable once people have taken tests.

## Architecture (`src/quiz`)

- `services/quizEngine.ts` — session creation (Fisher–Yates order), transitions, finalize/resume, expiry.
- `services/quizMix.ts` — Random Mix pool (eligibility, de-duplication) and balanced selection.
- `services/storageMigrations.ts` — upgrades saved data between storage versions (v1 → v2).
- `services/quizScoring.ts` — `calculateTestResult()`; scoring is driven by `ScoringConfig` (negative marking ready).
- `services/quizStorage.ts` — the only module touching `localStorage` (versioned keys, validation, last-10 cap).
- `pages/loaders.ts` — route loaders; the seam for a future API.
- `hooks/` — session state, debounced autosave, timestamp-based timer, active-time tracking.

Questions without a verifiable `correct_option` are shown as "Answer unavailable" and excluded from scoring.
Topic analytics activate automatically if questions gain a `topic` field.
