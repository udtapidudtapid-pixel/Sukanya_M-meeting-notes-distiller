import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "tests", "fixtures");

export function fixture(name: string): { name: string; content: string } {
  return { name, content: fs.readFileSync(path.join(DIR, name), "utf8") };
}

export const FIXTURES = {
  speakerTh: "01-speaker-th.txt",
  markdownEn: "02-markdown-en.md",
  vttMixed: "03-vtt-mixed.vtt",
  jsonExport: "04-json-export.json",
  noDecision: "05-no-decision.txt",
} as const;
