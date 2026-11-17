# Unit Test Case Document — Meeting Notes Distiller Web

| Field | Value |
| --- | --- |
| Version | 1.0 |
| Date | 2026-08-28 |
| Runner | Vitest (`npm test`) |
| Total automated unit tests | 42, all passing |
| Generated with | Claude, using the `spec-doc` skill; every row names a test that exists in the repository |

## 1. Summary

| Suite | File | Tests |
| --- | --- | --- |
| Format auto-detection | `tests/detect.test.ts` | 6 |
| Parsers | `tests/detect.test.ts` | 4 |
| Owner extraction | `tests/extract.test.ts` | 6 |
| Due date extraction | `tests/extract.test.ts` | 6 |
| Decision detection | `tests/extract.test.ts` | 2 |
| Meeting distillation | `tests/extract.test.ts` | 2 |
| Multi-file report | `tests/extract.test.ts` | 2 |
| Non-transcript input | `tests/extract.test.ts` | 2 |
| Problem flags | `tests/flags.test.ts` | 10 |
| Word export | `tests/docx.test.ts` | 2 |

## 2. The two test cases required by the assignment

| ID | Requirement | Test | Input | Expected |
| --- | --- | --- | --- | --- |
| UT-F-01 | FR-4.2 — action item with no owner | `ACTION_ITEM_NO_OWNER > flags an action item that has no owner` | A topic holding one action item with `owner: null` and a decision present | The returned issue codes contain `ACTION_ITEM_NO_OWNER` |
| UT-F-02 | FR-4.1 — meeting with no decision | `NO_DECISION_MEETING > flags a meeting where nothing was decided` | Fixture `05-no-decision.txt`, a Thai meeting whose only summary sentence is negated | The meeting's issue codes contain `NO_DECISION_MEETING` |

Each has a matching negative case so that the rule cannot pass by always firing:

| ID | Test | Expected |
| --- | --- | --- |
| UT-F-03 | `ACTION_ITEM_NO_OWNER > does not flag an action item that has a named owner and a date` | No issues returned |
| UT-F-04 | `NO_DECISION_MEETING > does not flag a meeting that recorded a decision` | `NO_DECISION_MEETING` absent for fixture `02-markdown-en.md` |

## 3. Format detection and parsing

| ID | Requirement | Test | Input | Expected |
| --- | --- | --- | --- | --- |
| UT-D-01 | FR-2.2 | `format auto-detection > detects %s as %s without being told` (table case 1) | `01-speaker-th.txt` | `speaker-colon` |
| UT-D-02 | FR-2.2 | same table, case 2 | `02-markdown-en.md` | `markdown-notes` |
| UT-D-03 | FR-2.2 | same table, case 3 | `03-vtt-mixed.vtt` | `vtt-timestamped` |
| UT-D-04 | FR-2.2 | same table, case 4 | `04-json-export.json` | `json-export` |
| UT-D-05 | NFR-5 | `format auto-detection > returns unknown for empty input instead of throwing` | `""` | `unknown`, no exception |
| UT-D-06 | NFR-5 | `format auto-detection > does not treat malformed JSON as a JSON export` | `{ "title": broken` | Any format other than `json-export` |
| UT-P-01 | FR-2.1 | `parsers > reads the header block of a Thai speaker transcript` | `01-speaker-th.txt` | Title contains `Go-live`; date `2026-08-20`; `Nattapong` among declared participants; first utterance time `10:00` |
| UT-P-02 | FR-3.1 | `parsers > reads markdown headings as topic boundaries` | `02-markdown-en.md` | Headings include both topic names; three declared participants |
| UT-P-03 | FR-2.1 | `parsers > reads WebVTT voice spans with timestamps` | `03-vtt-mixed.vtt` | Title `Weekly Ops Sync`; first speaker `Somchai`; time `00:00:01` |
| UT-P-04 | FR-2.1 | `parsers > reads a JSON export with per-entry topics` | `04-json-export.json` | Title `Vendor Contract Review`; first heading `Pricing`; three participants |

## 4. Owner extraction (FR-3.5)

| ID | Test | Input sentence | Expected owner |
| --- | --- | --- | --- |
| UT-O-01 | `owner extraction > reads an @mention` | `Action: @bob please update the runbook` | `bob` |
| UT-O-02 | `owner extraction > reads an explicit assignment in English` | `Action: assigned to Bob - prepare the dry run` | `Bob` |
| UT-O-03 | `owner extraction > reads a Thai assignment` | `มอบหมายให้ ปรีชา ช่วยตรวจ UAT report` | `ปรีชา` |
| UT-O-04 | `owner extraction > falls back to the speaker for a self-assigning sentence` | `ผมจะเตรียม test data ภายในวันที่ 25/08`, speaker `Nattapong` | `Nattapong`, not ambiguous |
| UT-O-05 | `owner extraction > marks a group word as an ambiguous owner, not a person` | `Action item: someone needs to update the runbook` | `ambiguous === true` |
| UT-O-06 | `owner extraction > returns null when nobody is named` | `Action item: the monitoring thresholds need a review` | `null` |

## 5. Due date extraction (FR-3.5)

| ID | Test | Input sentence | Expected due |
| --- | --- | --- | --- |
| UT-U-01 | `due date extraction > reads %s` case 1 | `ต้องส่ง RCA draft ภายในวันที่ 29/08` | `29/08` |
| UT-U-02 | case 2 | `ช่วยตรวจ UAT report ภายในวันศุกร์` | `ศุกร์` |
| UT-U-03 | case 3 | `prepare the staging dry run, due 2026-08-26` | `2026-08-26` |
| UT-U-04 | case 4 | `Priya will confirm the customer list by Friday` | `Friday` |
| UT-U-05 | case 5 | `send the report by EOD` | `EOD` |
| UT-U-06 | `due date extraction > returns null when no date is written` | `Action: the team will check the monitoring thresholds` | `null` |

## 6. Decision detection (FR-3.4)

| ID | Test | Input | Expected |
| --- | --- | --- | --- |
| UT-C-01 | `decision detection > accepts a real decision` | `01-speaker-th.txt` | A decision containing `script ชุดเดิม` is extracted |
| UT-C-02 | `decision detection > rejects a negated decision sentence` | `อันนี้ยังไม่ได้ข้อสรุป …`, `We have not decided …`, `We agreed to counter …` | `true`, `true`, `false` |
| UT-C-03 | `NO_DECISION_MEETING > does not count a negated sentence as a decision` | `03-vtt-mixed.vtt` | No decision text contains `have not decided` |

## 7. Distillation and report assembly (FR-3, FR-5)

| ID | Test | Expected |
| --- | --- | --- |
| UT-M-01 | `meeting distillation > extracts topics, participants and action items from markdown notes` | Both topic titles present; participants include `Alice Chen`, `Bob Martin`; non-empty overall summary; at least three action items |
| UT-M-02 | `meeting distillation > detects the transcript language` | `en` for the English fixture, `th` for the Thai fixture |
| UT-R-01 | `multi-file report > processes every uploaded file in one report` | Four meetings, four distinct formats |
| UT-R-02 | `multi-file report > groups action items by owner and keeps an unassigned bucket` | `Nattapong` present as an owner; the unassigned group sorts last; non-empty unassigned list |
| UT-N-01 | `non-transcript input > skips a file with no dialogue instead of reporting it as a meeting` | `package.json` content yields zero meetings, one skipped entry, zero issues |
| UT-N-02 | `non-transcript input > still processes the good files in a mixed batch` | One meeting and one skipped entry |

## 8. Remaining problem flags (FR-4)

| ID | Test | Expected |
| --- | --- | --- |
| UT-F-05 | `ACTION_ITEM_NO_OWNER > flags a group word as an ambiguous owner rather than a person` | Report issues contain `ACTION_ITEM_AMBIGUOUS_OWNER` for `02-markdown-en.md` |
| UT-F-06 | `CONFLICTING_DUE_DATES > flags two action items on the same subject with different dates` | Exactly one issue, with two evidence lines |
| UT-F-07 | `CONFLICTING_DUE_DATES > does not flag two items on the same subject with the same date` | No issue |
| UT-F-08 | `CONFLICTING_DUE_DATES > maps different phrasings of the same work to one subject` | `subjectKey` equal for both release-date phrasings; `null` for unrelated text |
| UT-F-09 | `UNRESOLVED_DATE_DISCUSSION > flags a go-live date discussed without a decision` | At least one `UNRESOLVED_DATE_DISCUSSION` issue for `01-speaker-th.txt` |

## 9. Word export (FR-6)

| ID | Test | Expected |
| --- | --- | --- |
| UT-X-01 | `docx export > produces a valid, non-trivial docx buffer` | Buffer over 5 000 bytes starting with the `PK` zip header |
| UT-X-02 | `docx export > handles an empty report without throwing` | Buffer over 1 000 bytes, no exception |

## 10. Coverage against requirements

| Requirement | Covered by | Status |
| --- | --- | --- |
| FR-1 Upload accumulation | E2E `accumulates files across two separate uploads` | Covered (E2E) |
| FR-1.1 Upload validation | E2E `rejects a file that holds no dialogue`; UT-N-01 | Covered |
| FR-2 Process | UT-R-01; E2E first spec | Covered |
| FR-2.1 / FR-2.2 Formats and detection | UT-D-01 … UT-D-06, UT-P-01 … UT-P-04 | Covered |
| FR-2.3 Non-transcript input | UT-N-01, UT-N-02 | Covered |
| FR-3.1 Topics | UT-P-02, UT-M-01 | Covered |
| FR-3.2 Participants | UT-M-01, UT-P-01 | Covered |
| FR-3.3 Summaries | UT-M-01 | Partially covered — the sentence-selection ranking itself has no dedicated test |
| FR-3.4 Decisions | UT-C-01 … UT-C-03 | Covered |
| FR-3.5 Action items | UT-O-01 … UT-O-06, UT-U-01 … UT-U-06 | Covered |
| FR-4.1 … FR-4.6 Flags | UT-F-01 … UT-F-09 | Covered |
| FR-5 Browser display | E2E first spec | Covered (E2E) |
| FR-6 Download | UT-X-01, UT-X-02, E2E `downloads the report as a .docx file` | Covered |
| NFR-4 Language handling | UT-M-02 | Covered for Thai and English only |
| NFR-6 Strict types | `npm run typecheck` in `npm run verify` | Covered by tooling |

## 11. How to run

```bash
npm test              # all unit tests once
npm run test:watch    # watch mode
npm run test:e2e      # Playwright end-to-end suite
npm run verify        # typecheck + unit tests + production build
```
