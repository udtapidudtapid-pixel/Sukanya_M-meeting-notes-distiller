import type { Decision } from "../types";
import type { TopicSlice } from "./topics";
import { DECISION_CUES } from "./lexicon";
import { containsAny, splitSentences, truncate } from "./text";

/** A decision is a sentence carrying a decision cue. Only sentences that are
 *  actually present in the transcript are reported — nothing is invented. */
export function extractDecisions(slice: TopicSlice): Decision[] {
  const out: Decision[] = [];
  for (const u of slice.utterances) {
    for (const sentence of splitSentences(u.text)) {
      const cue = containsAny(sentence, DECISION_CUES);
      if (!cue) continue;
      if (isNegated(sentence)) continue;
      out.push({
        text: truncate(sentence),
        topic: slice.title,
        source: u.speaker ? `${u.speaker}: ${u.text}` : u.text,
      });
    }
  }
  return dedupe(out);
}

const NEGATIONS = [
  "ยังไม่",
  "ไม่ได้ตกลง",
  "ไม่ได้ข้อสรุป",
  "ยังตกลงกันไม่ได้",
  "ยังสรุปไม่ได้",
  "not decided",
  "no decision",
  "haven't decided",
  "have not decided",
  "cannot agree",
  "can't agree",
  "still deciding",
  "undecided",
  "pending decision",
];

/** "ยังไม่ได้ตกลง" / "we have not decided" must not count as a decision. */
export function isNegated(sentence: string): boolean {
  return containsAny(sentence, NEGATIONS) !== null;
}

function dedupe(items: Decision[]): Decision[] {
  const seen = new Set<string>();
  return items.filter((d) => {
    const key = d.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
