# CLAUDE.md

Instructions for Claude Code when working in this repository.
Read this file before making any change.

## Project

Meeting Notes Distiller Web — uploads meeting transcripts, distills them into
topics / participants / summaries / decisions / action items, flags problems,
displays the result in the browser, and exports it as a `.docx` file.

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript (strict) | No `any` in `src/lib/**` |
| Frontend | Next.js 15 App Router, React 19 | Single client page, `src/app/page.tsx` |
| Backend | Next.js Route Handlers | `src/app/api/process`, `src/app/api/export` |
| Extraction | Rule-based, pure functions | No network, no LLM, no API key at runtime |
| Styling | Plain CSS in `src/app/globals.css` | No CSS framework |
| Word export | `docx` npm package | Server-side buffer, streamed to browser |
| Unit tests | Vitest | `tests/**/*.test.ts` |
| E2E tests | Playwright | `e2e/**/*.spec.ts` |

## Directory layout

```
src/app/                 UI + route handlers only (no business logic here)
src/lib/types.ts         the shared data contract — change with care
src/lib/parsers/         one file per transcript format + detect.ts dispatcher
src/lib/extract/         topics, participants, decisions, actions, summary, lexicon
src/lib/flags.ts         problem detection
src/lib/docx.ts          docx document builder
tests/fixtures/          one transcript file per supported format
tests/                   unit tests
e2e/                     Playwright specs
docs/                    SRS.md, UnitTestCases.md
.claude/skills/          repeatable-task skills
```

## Commands

| Purpose | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Unit tests | `npm test` |
| Unit tests (watch) | `npm run test:watch` |
| E2E tests | `npm run test:e2e` |
| Everything CI runs | `npm run verify` |

## Always

- Keep all business logic in `src/lib/**` as pure functions that take strings and
  return plain objects. Route handlers only parse the request and call `src/lib`.
- Add a fixture in `tests/fixtures/` for every new transcript format, and a test
  that asserts `detectFormat()` returns the right format id for it.
- Write the failing unit test before the implementation for anything in
  `src/lib/extract/**` or `src/lib/flags.ts`.
- Support Thai and English in every lexicon entry. Cues live only in
  `src/lib/extract/lexicon.ts` — never inline a keyword elsewhere.
- Flagging in `src/lib/flags.ts` must read `Topic.lines` (verbatim transcript
  lines), never `Topic.summary` — the summary keeps only the top few sentences
  and silently drops the evidence a flag depends on.
- Run `npm run verify` before declaring a task done.
- When a requirement is ambiguous, implement the narrow reading and record the
  assumption in `README.md` under "Assumptions", instead of guessing silently.

## Never

- Never call an external API or LLM from `src/lib/**`. Extraction must be
  deterministic and offline so unit tests are stable.
- Never persist uploads to disk or a database. Processing is in-memory per request.
- Never put extraction logic in a React component or a route handler.
- Never edit files in `tests/fixtures/` to make a failing test pass — fix the parser.
- Never add a dependency without recording why in README "Design decisions".
- Never widen a type to `any` or add `// @ts-expect-error` to silence a real error.
- Never change `src/lib/types.ts` without updating every consumer and its tests
  in the same change.
