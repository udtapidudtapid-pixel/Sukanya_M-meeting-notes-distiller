import type { TopicSlice } from "./topics";
import { splitSentences, truncate } from "./text";

/** Extractive summary: keeps the most informative sentences that already
 *  exist in the transcript. Never generates new claims. */
export function summarizeTopic(slice: TopicSlice, maxSentences = 3): string {
  const sentences = slice.utterances.flatMap((u) => splitSentences(u.text));
  if (sentences.length === 0) return "";
  if (sentences.length <= maxSentences) return sentences.join(" ");

  const scored = sentences.map((s, i) => ({ s, i, score: score(s, i, sentences.length) }));
  const picked = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  return truncate(picked.join(" "), 600);
}

const INFORMATIVE = /[0-9]|ตกลง|สรุป|ต้อง|จะ|decide|agree|will|must|need|issue|risk|ปัญหา|ความเสี่ยง/i;

function score(sentence: string, index: number, total: number): number {
  let s = Math.min(sentence.length, 160) / 160;
  if (INFORMATIVE.test(sentence)) s += 0.6;
  if (index === 0) s += 0.3;
  if (index === total - 1) s += 0.2;
  if (sentence.length < 15) s -= 0.5;
  return s;
}

export function summarizeMeeting(topicSummaries: Array<{ title: string; summary: string }>): string {
  const parts = topicSummaries
    .filter((t) => t.summary.trim() !== "")
    .map((t) => `${t.title}: ${truncate(t.summary, 200)}`);
  return parts.join(" | ");
}
