import type { ParsedTranscript, Utterance } from "../types";
import { titleFromFileName } from "./util";

interface RawEntry {
  speaker?: string;
  name?: string;
  displayName?: string;
  text?: string;
  content?: string;
  message?: string;
  ts?: string;
  time?: string;
  timestamp?: string;
  topic?: string;
}

interface RawDoc {
  title?: string;
  subject?: string;
  meeting?: string;
  date?: string;
  participants?: unknown;
  attendees?: unknown;
  transcript?: RawEntry[];
  entries?: RawEntry[];
  segments?: RawEntry[];
  utterances?: RawEntry[];
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object" && "name" in x) return String((x as { name: unknown }).name);
      return "";
    })
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Format 4: JSON export (Zoom/Teams/Meet style) with a transcript array. */
export function parseJsonExport(content: string, fileName: string): ParsedTranscript {
  const doc = JSON.parse(content) as RawDoc | RawEntry[];
  const isArray = Array.isArray(doc);
  const root: RawDoc = isArray ? { transcript: doc } : doc;
  const entries: RawEntry[] =
    root.transcript ?? root.entries ?? root.segments ?? root.utterances ?? [];

  const utterances: Utterance[] = entries.map((e) => ({
    speaker: (e.speaker ?? e.name ?? e.displayName ?? "").trim() || null,
    text: (e.text ?? e.content ?? e.message ?? "").trim(),
    time: e.ts ?? e.time ?? e.timestamp ?? null,
    heading: e.topic ?? null,
  }));

  const declared = [
    ...toStringArray(root.participants),
    ...toStringArray(root.attendees),
  ];

  return {
    sourceFile: fileName,
    format: "json-export",
    title: root.title ?? root.subject ?? root.meeting ?? titleFromFileName(fileName),
    date: root.date ?? null,
    declaredParticipants: Array.from(new Set(declared)),
    utterances: utterances.filter((u) => u.text.length > 0),
  };
}
