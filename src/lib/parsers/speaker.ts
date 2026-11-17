import type { ParsedTranscript, Utterance } from "../types";
import { parseHeader } from "./header";
import { titleFromFileName } from "./util";

const SPEAKER_LINE = /^\s*(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*)?([^:：]{1,40})[:：]\s*(.+)$/;

/** Format 1: plain text, `Speaker: text`, optional `[10:03]` timestamps. */
export function parseSpeakerColon(content: string, fileName: string): ParsedTranscript {
  const lines = content.split(/\r?\n/);
  const header = parseHeader(lines);
  const utterances: Utterance[] = [];

  for (let i = header.bodyStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const m = SPEAKER_LINE.exec(line);
    if (m) {
      utterances.push({ speaker: m[2].trim(), text: m[3].trim(), time: m[1] ?? null, heading: null });
    } else if (utterances.length > 0) {
      // continuation of the previous speaker's turn
      utterances[utterances.length - 1].text += " " + line.trim();
    } else {
      utterances.push({ speaker: null, text: line.trim(), time: null, heading: null });
    }
  }

  return {
    sourceFile: fileName,
    format: "speaker-colon",
    title: header.title ?? titleFromFileName(fileName),
    date: header.date,
    declaredParticipants: header.participants,
    utterances,
  };
}
