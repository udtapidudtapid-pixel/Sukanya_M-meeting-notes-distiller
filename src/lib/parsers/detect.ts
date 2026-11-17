import type { FormatId, ParsedTranscript } from "../types";
import { parseSpeakerColon } from "./speaker";
import { parseMarkdownNotes } from "./markdown";
import { parseVtt } from "./vtt";
import { parseJsonExport } from "./json";

/** Detects the transcript format from the content itself.
 *  The filename is only a tie-breaker — the user is never asked. */
export function detectFormat(content: string, fileName = ""): FormatId {
  const text = content.trim();
  if (text === "") return "unknown";

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      JSON.parse(text);
      return "json-export";
    } catch {
      /* not valid JSON, fall through */
    }
  }

  if (/^WEBVTT/m.test(text) || /\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->/m.test(text)) {
    return "vtt-timestamped";
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const headingCount = lines.filter((l) => /^#{1,3}\s+\S/.test(l)).length;
  const bulletCount = lines.filter((l) => /^\s*[-*+]\s+\S/.test(l)).length;
  if (headingCount >= 2 || (headingCount >= 1 && bulletCount >= 2)) {
    return "markdown-notes";
  }

  const speakerLines = lines.filter((l) => /^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?[^:：]{1,40}[:：]\s+\S/.test(l)).length;
  if (speakerLines / lines.length >= 0.4) return "speaker-colon";

  if (/\.md$/i.test(fileName) && (headingCount > 0 || bulletCount > 0)) return "markdown-notes";
  if (speakerLines > 0) return "speaker-colon";
  return "unknown";
}

/** Parses a file using the detected format. `unknown` is handled as
 *  plain text by the speaker-colon parser rather than throwing, so a
 *  single odd file never fails the whole batch. */
export function parseTranscript(content: string, fileName: string): ParsedTranscript {
  const format = detectFormat(content, fileName);
  switch (format) {
    case "json-export":
      return parseJsonExport(content, fileName);
    case "vtt-timestamped":
      return parseVtt(content, fileName);
    case "markdown-notes":
      return parseMarkdownNotes(content, fileName);
    case "speaker-colon":
      return parseSpeakerColon(content, fileName);
    case "unknown":
    default:
      return { ...parseSpeakerColon(content, fileName), format: "unknown" };
  }
}
