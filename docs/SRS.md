# Software Requirement Specification — Meeting Notes Distiller Web

| Field | Value |
| --- | --- |
| Document | SRS |
| Version | 1.0 |
| Date | 2026-08-28 |
| Status | Draft for submission |
| Generated with | Claude, using the `spec-doc` skill in `.claude/skills/spec-doc/` |

## 1. Purpose

The system takes meeting transcripts uploaded by a user, distills each one into
topics, participants, summaries, decisions and action items, flags problems in
the meeting record, displays the result in a browser, and exports the same
result as a Microsoft Word document.

## 2. Scope

| In scope | Out of scope |
| --- | --- |
| Upload of one or many plain-text transcript files | Audio or video input, speech-to-text |
| Automatic detection of the transcript format | Asking the user which format a file is |
| Rule-based, offline extraction | LLM-based extraction, external API calls |
| Thai and English transcripts | Other languages (undefined behaviour, see NFR-4) |
| In-memory, per-request processing | Persistence, user accounts, authentication, multi-user state |
| `.docx` export | PDF, Excel, email delivery |

## 3. Definitions

| Term | Meaning |
| --- | --- |
| Transcript | A text file holding the record of one meeting |
| Utterance | One line of dialogue after parsing, format-independent |
| Topic | A group of utterances under one subject |
| Decision | A sentence in the transcript carrying a decision cue and not negated |
| Action item | A sentence carrying an action cue, with an optional owner and due date |
| Issue | A detected problem in the meeting record, identified by an `IssueCode` |
| Report | The full result over all uploaded files (`DistillReport`) |

## 4. Functional requirements

| ID | Requirement | Detail | Implemented in |
| --- | --- | --- | --- |
| FR-1 | Upload | The user can select or drag one or more files, and can upload more than once; every queued file is processed in the same run. Duplicate name+size pairs are de-duplicated. | `src/app/page.tsx`, `src/lib/upload.ts` |
| FR-1.1 | Upload validation | Only `.txt`, `.md`, `.vtt`, `.srt`, `.json`, `.log` are accepted; max 25 files; max 2 MB per file; empty files rejected. A rejected file never fails the batch. | `src/lib/upload.ts` |
| FR-2 | Process | A submit action sends all queued files to the backend for processing. | `src/app/api/process/route.ts` |
| FR-2.1 | Format support | At least three transcript formats are supported. Four are implemented: `speaker-colon`, `markdown-notes`, `vtt-timestamped`, `json-export`. | `src/lib/parsers/` |
| FR-2.2 | Format auto-detection | The format is determined from the file content, never from a user selection. The filename is only a tie-breaker. | `detectFormat` in `src/lib/parsers/detect.ts` |
| FR-2.3 | Non-transcript input | A file that parses but holds no dialogue is reported as skipped, not as a meeting with no decisions. | `buildReport` in `src/lib/extract/index.ts` |
| FR-3 | Extract | Per meeting: topics discussed, participants, an overall summary and a per-topic summary, the decisions per topic, and action items with owner and due date where stated. | `src/lib/extract/` |
| FR-3.1 | Topics | Derived from explicit headings when the format carries them, otherwise from topic cue phrases, otherwise one fallback topic. | `src/lib/extract/topics.ts` |
| FR-3.2 | Participants | Declared header participants first, then any speaker observed in the body. Group words are not participants. | `src/lib/extract/participants.ts` |
| FR-3.3 | Summaries | Extractive only. The system never writes a sentence the transcript does not contain. | `src/lib/extract/summary.ts` |
| FR-3.4 | Decisions | A sentence with a decision cue, excluded when a negation guard matches. | `src/lib/extract/decisions.ts` |
| FR-3.5 | Action items | Owner from `@mention`, explicit assignment, Thai assignment pattern, or the speaker for a self-assigning sentence. Due date returned exactly as written. | `src/lib/extract/actions.ts` |
| FR-4 | Flag problems | Six issue codes, each with a severity and verbatim evidence. | `src/lib/flags.ts` |
| FR-4.1 | `NO_DECISION_MEETING` | The meeting recorded no decision in any topic. Severity high. | `flagIssues` |
| FR-4.2 | `ACTION_ITEM_NO_OWNER` | An action item names nobody. Severity high. | `flagIssues` |
| FR-4.3 | `ACTION_ITEM_AMBIGUOUS_OWNER` | The owner is a group word, not a person. Severity medium. | `flagIssues` |
| FR-4.4 | `ACTION_ITEM_NO_DUE_DATE` | An action item states no due date. Severity medium. | `flagIssues` |
| FR-4.5 | `CONFLICTING_DUE_DATES` | Two action items on the same subject carry different due dates. Severity high. | `conflictingDueDates` |
| FR-4.6 | `UNRESOLVED_DATE_DISCUSSION` | A critical date (go-live, release, cutover, ขึ้นระบบ …) was discussed with at least one candidate date, and the topic recorded no decision. Severity high. | `unresolvedCriticalDate` |
| FR-5 | Display in browser | Three blocks: per-meeting summary; action items grouped by owner; unassigned or unclear items plus the flagged problem table. | `src/app/page.tsx` |
| FR-6 | Download | The same content as FR-5 is downloadable as `.docx`. | `src/lib/docx.ts`, `src/app/api/export/route.ts` |
| FR-7 | Tests | Unit tests for the extraction logic, including an action item with no owner and a meeting with no decision. E2E tests for the browser flow. | `tests/`, `e2e/` |

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Extraction is deterministic and offline. No network call, no API key, no LLM at runtime, so unit tests are stable and the app runs with no configuration. |
| NFR-2 | All business logic is a pure function in `src/lib/**`. Route handlers only parse the request and call into `src/lib`. |
| NFR-3 | No persistence. Uploads are held in memory for the duration of the request. |
| NFR-4 | Thai and English are supported symmetrically; every cue exists in both languages. Behaviour on other languages is undefined — the pipeline runs but extraction quality is not specified. |
| NFR-5 | A single malformed or unsupported file never aborts a batch. |
| NFR-6 | TypeScript strict mode; no `any` in `src/lib/**`. |
| NFR-7 | `npm run verify` (typecheck, unit tests, production build) must pass before any change is considered done. |

## 6. Data model

Defined in `src/lib/types.ts`.

```
InputFile        { name, content }
      |  parseTranscript (format auto-detected)
      v
ParsedTranscript { sourceFile, format, title, date, declaredParticipants, utterances[] }
      |  distillParsed
      v
DistilledMeeting { title, date, lang, participants[], overallSummary, topics[], issues[] }
      |  buildReport (n files)
      v
DistillReport    { generatedAt, meetings[], skipped[], byOwner[], unassigned[], issues[] }
      |  buildDocx
      v
.docx
```

## 7. Interfaces

| Interface | Method | Request | Response |
| --- | --- | --- | --- |
| `/api/process` | POST | `multipart/form-data`, one or more `files` entries | `200 { report, rejected[] }`; `400` on a non-multipart request, no files, or no readable transcript; `500` on an unexpected failure |
| `/api/export` | POST | `application/json`, `{ report }` | `200` `.docx` binary with `Content-Disposition: attachment`; `400` on a missing report; `500` on a build failure |

## 8. Assumptions and constraints

Recorded in full under "Assumptions" in `README.md`. The material ones:

1. The assignment's sample data file was not available when this system was
   built, so the four supported formats and the fixtures in `tests/fixtures/`
   were designed from the brief. Adding a real sample format is a fixture plus
   a parser plus a detector branch, per the `add-transcript-format` skill.
2. Due dates are surfaced exactly as written in the transcript. The system does
   not resolve a relative date ("ภายในวันศุกร์", "by Friday") to a calendar
   date, because the meeting date is not always stated.
3. `CONFLICTING_DUE_DATES` compares items sharing a coarse subject keyword.
   Two items on genuinely different work that share a keyword can be reported;
   that is a deliberate bias toward reporting over silence.
