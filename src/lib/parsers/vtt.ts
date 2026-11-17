import type { ParsedTranscript, Utterance } from "../types";
import { titleFromFileName } from "./util";

const CUE = /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/;
const SPOKEN = /^\s*<v\s+([^>]+)>\s*(.+?)(?:<\/v>)?\s*$/;
const NAME_COLON = /^([^:：]{1,40})[:：]\s*(.+)$/;

/** Format 3: WebVTT / SRT timestamped transcript exported from a meeting tool. */
export function parseVtt(content: string, fileName: string): ParsedTranscript {
  const lines = content.split(/\r?\n/);
  const utterances: Utterance[] = [];
  let currentTime: string | null = null;
  let title: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "" || line === "WEBVTT") continue;
    if (/^NOTE\s+/.test(line)) {
      const t = line.replace(/^NOTE\s+/, "").trim();
      if (!title && t) title = t;
      continue;
    }
    const cue = CUE.exec(line);
    if (cue) {
      currentTime = cue[1].slice(0, 8);
      continue;
    }
    if (/^\d+$/.test(line)) continue; // SRT sequence number

    const v = SPOKEN.exec(line);
    if (v) {
      utterances.push({ speaker: v[1].trim(), text: v[2].trim(), time: currentTime, heading: null });
      continue;
    }
    const nc = NAME_COLON.exec(line);
    if (nc) {
      utterances.push({ speaker: nc[1].trim(), text: nc[2].trim(), time: currentTime, heading: null });
      continue;
    }
    if (utterances.length > 0 && currentTime === utterances[utterances.length - 1].time) {
      utterances[utterances.length - 1].text += " " + line;
    } else {
      utterances.push({ speaker: null, text: line, time: currentTime, heading: null });
    }
  }

  return {
    sourceFile: fileName,
    format: "vtt-timestamped",
    title: title ?? titleFromFileName(fileName),
    date: null,
    declaredParticipants: [],
    utterances,
  };
}
