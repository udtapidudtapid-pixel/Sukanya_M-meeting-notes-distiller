---
name: add-extraction-rule
description: Add or tune a rule-based extraction cue (decision, action, topic, owner, due date) or a new problem flag, keeping Thai and English in step and adding the required regression tests. Use whenever the extractor misses a phrasing, produces a false positive, or a new issue code is needed.
---

# Add or tune an extraction rule

Every tuning pass hit the same trap: an English cue was added and the Thai
equivalent was forgotten, or a broadened cue created a false positive that
nothing tested for.

## Where things live

| Change | File |
| --- | --- |
| A keyword or phrase cue | `src/lib/extract/lexicon.ts` — nowhere else |
| Owner detection pattern | `src/lib/extract/actions.ts` -> `OWNER_PATTERNS` |
| Due-date pattern | `src/lib/extract/lexicon.ts` -> `DUE_PATTERNS` |
| Negation guard | `src/lib/extract/decisions.ts` -> `NEGATIONS` |
| A new problem flag | `src/lib/flags.ts` + `IssueCode` in `src/lib/types.ts` |

## Steps

1. **Write the failing test first**, with the exact sentence that misbehaves.
   A cue change needs two tests: one that the new phrasing is now caught, and
   one that a near-miss phrasing is still *not* caught.

2. **Add the cue in both languages.** Every Thai cue needs its English
   counterpart in the same array and vice versa. If no natural counterpart
   exists, say so in a comment on the line.

3. **Check the negation guard.** Broadening a decision cue is the usual way a
   "ยังไม่ได้ตกลง" / "we have not decided" sentence starts counting as a
   decision. Add the negated form to `NEGATIONS` in the same change.

4. **For a new flag**, add the code to `IssueCode`, emit it from `flagIssues`
   with a `severity` and a bilingual `message`, populate `evidence` with
   verbatim transcript lines, and add both a positive and a negative test in
   `tests/flags.test.ts`.

5. **Verify.** `npm run verify`

## Rules

- Cues are matched case-insensitively against sentences, so keep them lowercase
  and short. A long cue is a fragile cue.
- `DUE_PATTERNS` is ordered — the most specific pattern must come first, or a
  loose ISO-date fallback will swallow "ภายในวันที่ 25/08".
- Never make the extractor produce text the transcript does not contain. All
  summarisation is extractive by design.
- Flagging reads `Topic.lines` (verbatim), never `Topic.summary`, because the
  summary is lossy on purpose.
