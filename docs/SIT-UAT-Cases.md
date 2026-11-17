# SIT / UAT Case Document — Meeting Notes Distiller Web

| Field | Value |
| --- | --- |
| Version | 1.0 |
| Date | 2026-08-28 |
| Status | Optional deliverable (Part 4.3) |
| Note | The SIT cases marked "automated" are executed by `npm run test:e2e`. The rest are manual. |

## 1. System Integration Test

Environment: local, `npm run build && npm run start`, browser at
`http://127.0.0.1:3000`.

| ID | Requirement | Steps | Expected result | Automated |
| --- | --- | --- | --- | --- |
| SIT-01 | FR-1, FR-2, FR-5 | Select the four fixtures at once, click Process | Four meeting cards; owner groups visible; unassigned and issues tables visible | Yes — `uploads several files at once, processes, and shows all three result blocks` |
| SIT-02 | FR-1 | Select one fixture, then select a second fixture separately, click Process | Queue shows two files; two meeting cards after processing | Yes — `accumulates files across two separate uploads` |
| SIT-03 | FR-4.1 | Upload `05-no-decision.txt`, click Process | Issues table contains `NO_DECISION_MEETING` | Yes — `flags a meeting that recorded no decision` |
| SIT-04 | FR-6 | Process any fixture, click Download .docx | A `.docx` file downloads, opens in Word, and contains the four report sections | Yes — `downloads the report as a .docx file` |
| SIT-05 | FR-1.1, FR-2.3 | Upload `package.json`, click Process | An error message appears; the file is listed as rejected with a reason; no meeting card is rendered | Yes — `rejects a file that holds no dialogue` |
| SIT-06 | FR-2.2 | Rename `01-speaker-th.txt` to `01-speaker-th.log` and process it | Detected as `speaker-colon` regardless of the extension | No |
| SIT-07 | FR-1.1 | Upload a `.pdf` file | Rejected with an unsupported-extension reason, batch not aborted | No |
| SIT-08 | FR-1.1 | Upload a file larger than 2 MB together with a valid fixture | Large file rejected; the valid file still processes | No |
| SIT-09 | Interface | `POST /api/process` with `Content-Type: application/json` | HTTP 400 with a bilingual error message | No |
| SIT-10 | Interface | `POST /api/export` with an empty body | HTTP 400, no file returned | No |
| SIT-11 | FR-6 | Process a Thai transcript, download, open the `.docx` | Thai characters render correctly, no mojibake, tables intact | No |
| SIT-12 | NFR-1 | Disconnect the network, then process a fixture | Processing succeeds — extraction makes no network call | No |

## 2. User Acceptance Test

Actor: a team lead who runs weekly meetings and keeps transcripts in mixed
Thai and English.

| ID | Requirement | Scenario | Acceptance criteria | Result |
| --- | --- | --- | --- | --- |
| UAT-01 | FR-3 | Upload a week's worth of transcripts in one go | Every meeting appears with its topics, participants and a readable summary | |
| UAT-02 | FR-3.5 | Check the action items for one meeting against the transcript | Each item names the same owner and the same due wording as the transcript; nothing is invented | |
| UAT-03 | FR-5 | Look up what one person owes across all meetings | That person appears once in the owner grouping with every item listed | |
| UAT-04 | FR-4.2, FR-4.3 | Look for work that has no clear owner | Items with no owner and items owned by a group word both appear in the unassigned table and are distinguishable | |
| UAT-05 | FR-4.6 | Upload a meeting where a go-live date was debated but not settled | The issue table reports an unresolved critical date with the candidate dates and the transcript lines as evidence | |
| UAT-06 | FR-4.5 | Upload a meeting where the same work was given two different deadlines | A conflicting-due-dates issue appears naming both dates | |
| UAT-07 | FR-6 | Download the report and forward it | The `.docx` opens in Word, is readable without editing, and matches what the browser showed | |
| UAT-08 | FR-3.4 | Check a transcript that says a matter was *not* settled | That sentence is not listed as a decision | |
| UAT-09 | NFR-4 | Upload one Thai transcript and one English transcript | Both are extracted; the detected language is shown per meeting | |
| UAT-10 | NFR-5 | Upload a batch where one file is corrupt | The good files still produce a report; the bad file is listed with a reason | |

## 3. Known limitations to confirm during UAT

| ID | Limitation | Why it is accepted |
| --- | --- | --- |
| LIM-01 | Relative due dates ("ภายในวันศุกร์", "by Friday") are shown as written, not resolved to a calendar date | The meeting date is not always present in a transcript; resolving would require guessing |
| LIM-02 | `CONFLICTING_DUE_DATES` groups by a coarse subject keyword, so unrelated work sharing a keyword can be reported | A false positive is recoverable by reading the evidence; a missed conflict is not |
| LIM-03 | Summaries are extractive, so they read like transcript excerpts rather than prose | Guarantees no invented content, which matters more for a meeting record |
| LIM-04 | Extraction quality outside Thai and English is unspecified | Out of scope per NFR-4 |
