import { DATE_HEADER_KEYS, PARTICIPANT_HEADER_KEYS, TITLE_HEADER_KEYS } from "../extract/lexicon";

export interface HeaderBlock {
  title: string | null;
  date: string | null;
  participants: string[];
  /** Index of the first line that is not part of the header block. */
  bodyStart: number;
}

function keyOf(line: string): { key: string; value: string } | null {
  const m = /^\s*[#*\-\s]*([^:：]{1,40})[:：]\s*(.*)$/.exec(line);
  if (!m) return null;
  return { key: m[1].trim().toLowerCase(), value: m[2].trim() };
}

export function splitNames(value: string): string[] {
  return value
    .split(/[,;、]|\s\/\s|\sและ\s|\sand\s/)
    .map((n) => n.replace(/\(.*?\)/g, "").trim())
    .filter((n) => n.length > 0 && n.length <= 40);
}

/** Reads an optional `Key: value` header block from the top of a transcript. */
export function parseHeader(lines: string[]): HeaderBlock {
  const out: HeaderBlock = { title: null, date: null, participants: [], bodyStart: 0 };
  let consumed = 0;
  const limit = Math.min(lines.length, 12);

  for (let i = 0; i < limit; i++) {
    const raw = lines[i];
    if (raw.trim() === "") {
      if (consumed > 0) consumed = i + 1;
      continue;
    }
    const kv = keyOf(raw);
    if (!kv) break;
    const { key, value } = kv;
    if (TITLE_HEADER_KEYS.includes(key) && !out.title) out.title = value;
    else if (DATE_HEADER_KEYS.includes(key) && !out.date) out.date = value;
    else if (PARTICIPANT_HEADER_KEYS.includes(key)) out.participants = splitNames(value);
    else break;
    consumed = i + 1;
  }
  out.bodyStart = consumed;
  return out;
}
