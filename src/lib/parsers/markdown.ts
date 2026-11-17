import type { ParsedTranscript, Utterance } from "../types";
import { parseHeader, splitNames } from "./header";
import { titleFromFileName } from "./util";
import { PARTICIPANT_HEADER_KEYS } from "../extract/lexicon";

const H1 = /^#\s+(.+)$/;
const H2 = /^#{2,3}\s+(.+)$/;
const BULLET = /^\s*[-*+]\s+(?:\[[ xX]\]\s*)?(.+)$/;

/** Format 2: markdown meeting notes with `#` title, `##` topic headings and bullets. */
export function parseMarkdownNotes(content: string, fileName: string): ParsedTranscript {
  const lines = content.split(/\r?\n/);
  const utterances: Utterance[] = [];
  let title: string | null = null;
  let date: string | null = null;
  let participants: string[] = [];
  let heading: string | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") continue;

    const h1 = H1.exec(line);
    if (h1) {
      if (!title) title = h1[1].trim();
      continue;
    }
    const h2 = H2.exec(line);
    if (h2) {
      const name = h2[1].trim();
      const key = name.toLowerCase().replace(/[:：]$/, "");
      if (PARTICIPANT_HEADER_KEYS.includes(key)) {
        heading = "__participants__";
      } else {
        heading = name;
      }
      continue;
    }

    const bullet = BULLET.exec(line);
    const text = (bullet ? bullet[1] : line).replace(/\*\*/g, "").trim();

    if (heading === "__participants__") {
      participants.push(...splitNames(text));
      continue;
    }

    const kv = /^\s*(date|วันที่|when)\s*[:：]\s*(.+)$/i.exec(text);
    if (kv && !date) {
      date = kv[2].trim();
      continue;
    }
    const pv = /^\s*(attendees|participants|ผู้เข้าร่วม|ผู้เข้าประชุม)\s*[:：]\s*(.+)$/i.exec(text);
    if (pv) {
      participants.push(...splitNames(pv[2]));
      continue;
    }

    // `Name: said something` inside a bullet keeps its speaker
    const spoken = /^([^:：]{1,40})[:：]\s*(.+)$/.exec(text);
    const isSpeaker = spoken !== null && !/^(decision|decisions|action|actions|note|notes|สรุป|มติ|การตัดสินใจ)$/i.test(spoken[1].trim());
    const u: Utterance = isSpeaker && spoken
      ? { speaker: spoken[1].trim(), text: spoken[2].trim(), time: null, heading }
      : { speaker: null, text, time: null, heading };
    utterances.push(u);
  }

  if (participants.length === 0) {
    const header = parseHeader(lines);
    participants = header.participants;
  }

  return {
    sourceFile: fileName,
    format: "markdown-notes",
    title: title ?? titleFromFileName(fileName),
    date,
    declaredParticipants: participants,
    utterances,
  };
}
