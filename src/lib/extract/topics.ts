import type { ParsedTranscript, Utterance } from "../types";
import { TOPIC_CUES } from "./lexicon";
import { containsAny } from "./text";

export interface TopicSlice {
  title: string;
  utterances: Utterance[];
}

const GENERAL = "General discussion";

/** Groups utterances into topics using, in priority order:
 *  1. explicit headings carried by the parser (markdown / JSON `topic`)
 *  2. in-line topic cue phrases ("next topic", "หัวข้อถัดไป", ...)
 *  3. a single fallback topic. */
export function extractTopics(t: ParsedTranscript): TopicSlice[] {
  const hasHeadings = t.utterances.some((u) => u.heading !== null);

  if (hasHeadings) {
    const slices: TopicSlice[] = [];
    for (const u of t.utterances) {
      const title = u.heading ?? GENERAL;
      const last = slices[slices.length - 1];
      if (last && last.title === title) last.utterances.push(u);
      else slices.push({ title, utterances: [u] });
    }
    return mergeSameTitle(slices);
  }

  const slices: TopicSlice[] = [];
  let current: TopicSlice = { title: GENERAL, utterances: [] };
  for (const u of t.utterances) {
    const cue = containsAny(u.text, TOPIC_CUES);
    if (cue) {
      const derived = deriveTitle(u.text, cue);
      if (current.utterances.length > 0) slices.push(current);
      current = { title: derived, utterances: [u] };
    } else {
      current.utterances.push(u);
    }
  }
  if (current.utterances.length > 0) slices.push(current);
  return slices.length > 0 ? mergeSameTitle(slices) : [{ title: GENERAL, utterances: [] }];
}

function deriveTitle(text: string, cue: string): string {
  const idx = text.toLowerCase().indexOf(cue.toLowerCase());
  const after = text.slice(idx + cue.length).replace(/^[\s:：\-–,]+/, "");
  const title = after.split(/[.!?\n]/)[0].trim();
  return title.length >= 3 ? title.slice(0, 80) : cue;
}

function mergeSameTitle(slices: TopicSlice[]): TopicSlice[] {
  const map = new Map<string, TopicSlice>();
  for (const s of slices) {
    const existing = map.get(s.title);
    if (existing) existing.utterances.push(...s.utterances);
    else map.set(s.title, { title: s.title, utterances: [...s.utterances] });
  }
  return Array.from(map.values());
}
