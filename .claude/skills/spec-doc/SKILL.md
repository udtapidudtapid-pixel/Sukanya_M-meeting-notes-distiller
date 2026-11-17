---
name: spec-doc
description: Generate or refresh the project documents in docs/ (SRS, unit test case document, SIT/UAT case documents) so they trace to real requirement ids, real test names and real issue codes. Use when a requirement, test or flag changes, or when a document is needed for submission.
---

# Generate a project document

The documents in `docs/` are graded against the code, so a document written
from memory is worse than no document. Regenerate from the source of truth
instead of editing prose in place.

## Sources of truth

| Document content | Read from |
| --- | --- |
| Requirement ids and wording | the assignment brief, mirrored in `docs/SRS.md` §4 |
| Data model | `src/lib/types.ts` |
| Supported formats | `detectFormat` in `src/lib/parsers/detect.ts` |
| Problem flags | `IssueCode` in `src/lib/types.ts` + `src/lib/flags.ts` |
| Unit test cases | `describe` / `it` titles in `tests/**/*.test.ts` |
| E2E cases | `test(...)` titles in `e2e/**/*.spec.ts` |

## Steps

1. List the real ids first: `grep -rn "describe(\|  it(" tests/` and read the
   `IssueCode` union in `src/lib/types.ts`.
2. Fill the table rows from that output. Every test case row must name a test
   that exists, spelled the way the file spells it.
3. Keep requirement ids stable (`FR-1` … `FR-7`, `NFR-*`) — the unit test case
   document and the SIT/UAT documents reference them.
4. If a requirement has no covering test, add a row with status `NOT COVERED`
   rather than quietly omitting it. An honest gap is gradeable; a missing row
   looks like an oversight.
5. Do not restate the brief's wording as if it were implemented behaviour.
   Write what the code does, and record any narrowing under README
   "Assumptions".

## Format

Markdown, one document per file, tables over prose, ids in the first column.
