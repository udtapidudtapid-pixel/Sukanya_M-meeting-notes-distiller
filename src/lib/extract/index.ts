import type {
  ActionItem,
  DistilledMeeting,
  DistillReport,
  OwnerGroup,
  ParsedTranscript,
  Topic,
} from "../types";
import { parseTranscript } from "../parsers/detect";
import { flagIssues } from "../flags";
import { extractParticipants } from "./participants";
import { extractTopics } from "./topics";
import { extractDecisions } from "./decisions";
import { extractActionItems } from "./actions";
import { summarizeMeeting, summarizeTopic } from "./summary";
import { detectLang } from "./text";

export interface InputFile {
  name: string;
  content: string;
}

export function distillParsed(parsed: ParsedTranscript): DistilledMeeting {
  const slices = extractTopics(parsed);

  const topics: Topic[] = slices.map((slice) => ({
    title: slice.title,
    summary: summarizeTopic(slice),
    lines: slice.utterances.map((u) => (u.speaker ? `${u.speaker}: ${u.text}` : u.text)),
    decisions: extractDecisions(slice),
    actionItems: extractActionItems(slice),
    utteranceCount: slice.utterances.length,
  }));

  const meeting: DistilledMeeting = {
    sourceFile: parsed.sourceFile,
    format: parsed.format,
    title: parsed.title,
    date: parsed.date,
    lang: detectLang(parsed.utterances.map((u) => u.text).join(" ")),
    participants: extractParticipants(parsed),
    overallSummary: summarizeMeeting(topics.map((t) => ({ title: t.title, summary: t.summary }))),
    topics,
    issues: [],
  };

  meeting.issues = flagIssues({ title: meeting.title, topics });
  return meeting;
}

export function distillFile(file: InputFile): DistilledMeeting {
  return distillParsed(parseTranscript(file.content, file.name));
}

const UNASSIGNED_LABEL = "ไม่มีผู้รับผิดชอบ / Unassigned";

/** Builds the full browser + report payload from any number of files. */
export function buildReport(files: InputFile[]): DistillReport {
  const skipped: Array<{ name: string; reason: string }> = [];
  const meetings: DistilledMeeting[] = [];

  for (const file of files) {
    const parsed = parseTranscript(file.content, file.name);
    if (parsed.utterances.length === 0) {
      skipped.push({
        name: file.name,
        reason: "ไม่พบบทสนทนาในไฟล์นี้ / no dialogue found, not treated as a meeting",
      });
      continue;
    }
    meetings.push(distillParsed(parsed));
  }

  const all: Array<ActionItem & { meeting: string }> = meetings.flatMap((m) =>
    m.topics.flatMap((t) => t.actionItems.map((a) => ({ ...a, meeting: m.title }))),
  );

  const groups = new Map<string, OwnerGroup>();
  for (const item of all) {
    const key = item.owner !== null && !item.ownerAmbiguous ? item.owner : UNASSIGNED_LABEL;
    const group = groups.get(key) ?? { owner: key, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  const byOwner = Array.from(groups.values()).sort((a, b) => {
    if (a.owner === UNASSIGNED_LABEL) return 1;
    if (b.owner === UNASSIGNED_LABEL) return -1;
    return a.owner.localeCompare(b.owner);
  });

  const unassigned = all.filter(
    (i) => i.owner === null || i.ownerAmbiguous || i.due === null,
  );

  return {
    generatedAt: new Date().toISOString(),
    meetings,
    skipped,
    byOwner,
    unassigned,
    issues: meetings.flatMap((m) => m.issues),
  };
}

export { UNASSIGNED_LABEL };
