import { THAI_CHAR_G } from "./lexicon";
import type { Lang } from "../types";

export function containsAny(haystack: string, needles: string[]): string | null {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n.toLowerCase())) return n;
  }
  return null;
}

export function detectLang(text: string): Lang {
  const thai = (text.match(THAI_CHAR_G) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (thai === 0) return "en";
  if (latin === 0) return "th";
  const ratio = thai / (thai + latin);
  if (ratio > 0.8) return "th";
  if (ratio < 0.2) return "en";
  return "mixed";
}

/** Splits into sentences for both Thai (space/และ-delimited) and English. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+|\n+|(?<=ครับ|ค่ะ|นะครับ|นะคะ)\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function truncate(text: string, max = 220): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}
