import type { InputFile } from "./extract";

export const MAX_FILES = 25;
export const MAX_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_EXT = [".txt", ".md", ".vtt", ".srt", ".json", ".log"];

export interface ReadResult {
  files: InputFile[];
  rejected: Array<{ name: string; reason: string }>;
}

/** Validates a batch of uploaded files. Rejections are reported, never thrown,
 *  so one bad file cannot fail the whole batch (see CLAUDE.md). */
export async function readUploads(entries: File[]): Promise<ReadResult> {
  const files: InputFile[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];

  for (const entry of entries.slice(0, MAX_FILES)) {
    const lower = entry.name.toLowerCase();
    if (!ACCEPTED_EXT.some((ext) => lower.endsWith(ext))) {
      rejected.push({ name: entry.name, reason: `นามสกุลไม่รองรับ / unsupported extension` });
      continue;
    }
    if (entry.size > MAX_BYTES) {
      rejected.push({ name: entry.name, reason: `ไฟล์ใหญ่เกิน 2MB / file too large` });
      continue;
    }
    const content = await entry.text();
    if (content.trim() === "") {
      rejected.push({ name: entry.name, reason: `ไฟล์ว่าง / empty file` });
      continue;
    }
    files.push({ name: entry.name, content });
  }

  if (entries.length > MAX_FILES) {
    rejected.push({
      name: `+${entries.length - MAX_FILES} files`,
      reason: `เกินจำนวนสูงสุด ${MAX_FILES} ไฟล์ / over the ${MAX_FILES} file limit`,
    });
  }

  return { files, rejected };
}
