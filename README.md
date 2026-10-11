# Recall

![](https://github.com/garan1610/Quiz-Maker/Nhat-Sao-Demo.gif)

A browser-based question-bank importer and study app. No AI API key or backend database is needed.

## Run locally

Use Node.js 22.18 or newer, then:

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. `npm run ...` works in shells where PowerShell's script policy does not block `npm.ps1`.

## Study workflow

1. Choose **Get AI prompt**, copy the prompt, and attach your question-bank document in your own chatbot.
2. Import its JSON file or paste its JSON response. A downloadable sample is included in the prompt dialog.
3. Review the question bank against the source. Accept flagged questions individually or in bulk when they have answer keys, or choose **Skip review & study** to continue with warnings. Questions without answer keys are ungraded and excluded from accuracy. You can edit questions, choices, correct answers, explanations, and source references.
4. Pick sections, question count, shuffling, and practice or self-test mode. Navigate with Previous/Next or the clickable question map. Draft selections are saved; checked practice answers stay locked, while self-test answers remain editable until finishing.
5. Submit answers, then review your score. Incorrect and unanswered questions appear first. Retry the whole session or just the mistakes.

Open **Public quizz** on the home screen to study the supplied 200-question Tư tưởng Hồ Chí Minh bank. Download its JSON and original Word document from the same card. The EN–VI switch translates the interface and conversion prompt while preserving all source content.

## Storage and privacy

Projects, edits, settings, current quiz progress, results, and language are saved in localStorage on this browser and survive reloads and reopening the site. Cookies are not used. Saved work uses the recall.workspace.v2 localStorage key; older workspace data is left untouched and is not loaded. Attempts store question/choice IDs and their order rather than duplicating question text. Imported material is not uploaded. Clearing site data removes your saved work; private browsing may clear it when the session ends.

Browser storage has a finite quota. If saving fails, the app shows a warning and keeps the current work in memory; the previous saved value remains intact. Keep the tab open and use **Export JSON** to back up your question bank. JSON exports include bank edits, not study progress. Corrupt saved data is not silently overwritten.

All quiz processing happens in the browser. Source content is rendered as text, not HTML. This is a personal study tool, not a secure exam platform: the imported answer key is present in the browser.

## JSON format

The prompt requests exactly one complete JSON file, preserving original section and question order. The bilingual prompt in `lib/import-prompt.ts` defines compact version 2. Only this format is supported for import, export, and browser storage. Older files must be converted before importing.

`schemaVersion: 2`, a `title`, and `questions` are required. Each question contains:

- `section`: the original chapter/section, retaining source order; empty when the source has no sections
- `question`: the original question text
- `answers`: 2–26 answer texts keyed by original uppercase letters, e.g. `{"A":"First choice","B":"Second choice"}`
- `correct_answers`: answer letters, e.g. `["B"]` or `["A","C"]`; use `[]` for unknown answers
- `explanation`: the complete original explanation, only when provided by the source; omit when absent
- `source_page` (optional): positive integer document page, starting at 1; omit when unknown
- `answerShuffleSafe: false` only for unsafe/uncertain questions; otherwise omit it
- `reviewIssues` (optional): unresolved source problems as strings

The app generates IDs and derives question types from the answer key. The app generates stable IDs from original order, preserves letter mappings, and infers single/multiple-answer types. Source numbering may restart per chapter; generated question IDs remain unique across the bank. Version-2 exports and localStorage use the compact format; IDs are reconstructed deterministically on reload. Attempts retain their saved question and choice order.

Missing answers or flagged issues require review unless the user explicitly skips it. Missing explanations do not create review warnings. Grading requires the exact set of correct choices. Validation checks structure, not factual accuracy; compare the bank against the source before studying.

The prompt dialog downloads the supplied public bank in the same format. Its source does not provide reliable page boundaries in the JSON, so the app does not invent page numbers. The public JSON and original Word document remain available.

Choice IDs remain unchanged when answers are shuffled. Questions flagged as unsafe to shuffle retain their answer order; conservative checks also detect common English and Vietnamese order-dependent wording. This heuristic is not a substitute for source review. Explanations are always accompanied by the original answer labels.

Imports are limited to 5 MB. Complete JSON Markdown fences are accepted; malformed or truncated content is rejected without attempting to invent a repair.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The logic tests cover validation, source fidelity, missing answers, safe shuffling, stable-ID grading, multi-answer scoring, summary ordering, and section selection. Playwright tests exercise importing, editing, practice, self-test, results, retrying mistakes, reload recovery, storage failures, public-bank downloads, language switching, and mobile layout.

Browser tests use installed Microsoft Edge on desktop and an emulated mobile viewport. Build first; Playwright starts the production server on port 3100 and stops it afterward. To use bundled Chromium elsewhere, remove `channel: "msedge"` from `playwright.config.ts` and install Chromium with `npx playwright install chromium`.
