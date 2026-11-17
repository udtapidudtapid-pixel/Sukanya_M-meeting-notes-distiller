import type { ActionItem } from "../types";
import type { TopicSlice } from "./topics";
import { ACTION_CUES, AMBIGUOUS_OWNERS, DUE_PATTERNS } from "./lexicon";
import { containsAny, splitSentences, truncate } from "./text";

/** Extracts a due date exactly as written. Returns null when none is present. */
export function extractDue(sentence: string): string | null {
  for (const re of DUE_PATTERNS) {
    const m = re.exec(sentence);
    if (m) return (m[1] ?? m[0]).trim();
  }
  return null;
}

const OWNER_PATTERNS: RegExp[] = [
  /@([A-Za-z0-9._\-]{2,30})/,
  /(?:assigned to|owner|responsible)\s*[:\-]?\s*([A-Z][A-Za-z.\-]{1,25}(?:\s[A-Z][A-Za-z.\-]{1,25})?)/,
  /(?:มอบหมาย(?:ให้)?|ฝาก|ให้)\s*([^\s,]{2,25})\s*(?:ช่วย|ทำ|ดู|รับ|เตรียม|ส่ง|แก้|ตรวจ)/,
  /^\s*([^\s,:：]{2,25})\s*(?:จะ|รับไป|ต้อง)/,
  /\b([A-Z][a-z]{1,20})\s+(?:will|to)\s+/,
];

/** Finds the responsible person. `speakerFallback` is used only when the
 *  sentence is self-assigning ("ผมจะ...", "I will ..."). */
export function extractOwner(
  sentence: string,
  speakerFallback: string | null,
): { owner: string | null; ambiguous: boolean } {
  const ambiguousHit = AMBIGUOUS_OWNERS.find((a) => {
    const re = new RegExp(`(?:^|[\\s(:：])${escapeRe(a)}(?:$|[\\s),.:：])`, "i");
    return re.test(sentence);
  });

  for (const re of OWNER_PATTERNS) {
    const m = re.exec(sentence);
    if (!m) continue;
    const candidate = m[1].trim().replace(/[.,;]+$/, "");
    if (candidate === "") continue;
    if (AMBIGUOUS_OWNERS.includes(candidate.toLowerCase())) {
      return { owner: candidate, ambiguous: true };
    }
    if (isSelfReference(candidate)) {
      return speakerFallback
        ? { owner: speakerFallback, ambiguous: false }
        : { owner: null, ambiguous: false };
    }
    return { owner: candidate, ambiguous: false };
  }

  if (ambiguousHit) return { owner: ambiguousHit, ambiguous: true };
  if (isSelfAssigning(sentence) && speakerFallback) {
    return { owner: speakerFallback, ambiguous: false };
  }
  return { owner: null, ambiguous: false };
}

const SELF_WORDS = ["ผม", "ฉัน", "เรา", "หนู", "i", "we", "me"];

function isSelfReference(candidate: string): boolean {
  return SELF_WORDS.includes(candidate.toLowerCase());
}

function isSelfAssigning(sentence: string): boolean {
  return /(?:^|\s)(?:ผม|ฉัน|หนู|เดี๋ยวผม|เดี๋ยวเรา|i)\s*(?:จะ|will|'ll)/i.test(sentence);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractActionItems(slice: TopicSlice): ActionItem[] {
  const out: ActionItem[] = [];
  for (const u of slice.utterances) {
    for (const sentence of splitSentences(u.text)) {
      if (containsAny(sentence, ACTION_CUES) === null) continue;
      const { owner, ambiguous } = extractOwner(sentence, u.speaker);
      out.push({
        task: truncate(stripCuePrefix(sentence)),
        owner,
        due: extractDue(sentence),
        topic: slice.title,
        source: u.speaker ? `${u.speaker}: ${u.text}` : u.text,
        ownerAmbiguous: ambiguous,
      });
    }
  }
  return out;
}

function stripCuePrefix(sentence: string): string {
  return sentence.replace(/^\s*(?:action item|action|ai|todo|to-do)\s*[:\-]\s*/i, "").trim();
}
