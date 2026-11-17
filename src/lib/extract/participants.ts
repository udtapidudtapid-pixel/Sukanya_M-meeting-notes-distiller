import type { ParsedTranscript } from "../types";
import { AMBIGUOUS_OWNERS } from "./lexicon";

/** Declared header participants first, then any speaker seen in the body. */
export function extractParticipants(t: ParsedTranscript): string[] {
  const seen = new Map<string, string>();
  const add = (name: string) => {
    const clean = name.trim().replace(/[.,;]+$/, "");
    if (clean === "" || clean.length > 40) return;
    if (AMBIGUOUS_OWNERS.includes(clean.toLowerCase())) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) seen.set(key, clean);
  };

  t.declaredParticipants.forEach(add);
  t.utterances.forEach((u) => {
    if (u.speaker) add(u.speaker);
  });
  return Array.from(seen.values());
}
