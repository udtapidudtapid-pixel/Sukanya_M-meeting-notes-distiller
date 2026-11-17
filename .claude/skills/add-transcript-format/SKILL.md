---
name: add-transcript-format
description: Add support for a new meeting-transcript format end to end — fixture, parser, detector branch, and tests. Use whenever a new sample transcript arrives in a shape the existing parsers do not handle, or when detectFormat() misclassifies a file.
---

# Add a transcript format

Adding a format touched four places every single time, and forgetting the
detector branch or the fixture test was the recurring mistake this skill exists
to prevent.

## Steps

1. **Save the sample as a fixture.**
   Put the real sample in `tests/fixtures/NN-<slug>.<ext>` using the next free
   number. Never trim or reformat it — the point of a fixture is that it is
   exactly what the user will upload.

2. **Add the format id.**
   Extend the `FormatId` union in `src/lib/types.ts`. Do not reuse an existing
   id for a shape that needs different parsing.

3. **Write the parser.**
   Create `src/lib/parsers/<slug>.ts` exporting
   `parse<Slug>(content: string, fileName: string): ParsedTranscript`.
   Rules:
   - Return the header values exactly as written; never normalise dates.
   - Set `heading` on an utterance only when the source really carries a topic
     structure. Leave it `null` otherwise so `extractTopics` falls back to cue
     detection instead of inventing one topic per line.
   - Never throw on a malformed line. Attach it to the previous utterance or
     emit it with `speaker: null`.

4. **Add the detector branch.**
   In `src/lib/parsers/detect.ts`, add a check to `detectFormat` and a case to
   `parseTranscript`. Order matters — put the most specific signature first
   (a magic header or a unique delimiter) and keep the ratio-based
   speaker-colon heuristic last, because it matches loosely.

5. **Write the tests before running anything.**
   In `tests/detect.test.ts` add the fixture to the `it.each` detection table,
   plus a parser test asserting title, participants and the first utterance.
   Then add one extraction assertion in `tests/extract.test.ts` proving the new
   format reaches the same distillation output shape as the others.

6. **Verify.** `npm run verify`

## Checklist

- [ ] fixture committed, unmodified from the sample
- [ ] `FormatId` extended
- [ ] parser returns a full `ParsedTranscript`
- [ ] `detectFormat` branch added, in the right priority position
- [ ] `parseTranscript` case added
- [ ] detection test, parser test, extraction test all present
- [ ] `npm run verify` clean
