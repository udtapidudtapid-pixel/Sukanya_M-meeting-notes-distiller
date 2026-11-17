/** The shared data contract. Changing anything here means updating every
 *  consumer and its tests in the same change (see CLAUDE.md). */

export type FormatId =
  | "speaker-colon"
  | "markdown-notes"
  | "vtt-timestamped"
  | "json-export"
  | "unknown";

export type Lang = "th" | "en" | "mixed";

/** A single line of dialogue after parsing, regardless of source format. */
export interface Utterance {
  /** Speaker display name, or null when the format carries no speaker. */
  speaker: string | null;
  text: string;
  /** Raw timestamp string as it appeared in the source, if any. */
  time: string | null;
  /** Explicit topic heading the line sits under (markdown formats only). */
  heading: string | null;
}

export interface ParsedTranscript {
  sourceFile: string;
  format: FormatId;
  /** Meeting title from the transcript header, else derived from the filename. */
  title: string;
  /** Meeting date string exactly as written in the source, if present. */
  date: string | null;
  /** Participants declared in a header block (not inferred from speakers). */
  declaredParticipants: string[];
  utterances: Utterance[];
}

export interface ActionItem {
  /** What has to be done. */
  task: string;
  /** Person responsible, or null when nobody was named. */
  owner: string | null;
  /** Due date exactly as written in the transcript, or null. */
  due: string | null;
  /** Topic the item was raised under. */
  topic: string;
  /** Verbatim source line, for traceability in the report. */
  source: string;
  /** True when an owner-like word was found but it is not a person
   *  (e.g. "the team", "someone", "ใครก็ได้"). */
  ownerAmbiguous: boolean;
}

export interface Decision {
  text: string;
  topic: string;
  source: string;
}

export interface Topic {
  title: string;
  summary: string;
  /** Verbatim transcript lines under this topic. Flagging reads these instead
   *  of the summary, which is lossy by design. */
  lines: string[];
  decisions: Decision[];
  actionItems: ActionItem[];
  utteranceCount: number;
}

export type IssueCode =
  | "NO_DECISION_MEETING"
  | "ACTION_ITEM_NO_OWNER"
  | "ACTION_ITEM_AMBIGUOUS_OWNER"
  | "ACTION_ITEM_NO_DUE_DATE"
  | "CONFLICTING_DUE_DATES"
  | "UNRESOLVED_DATE_DISCUSSION";

export type Severity = "high" | "medium" | "low";

export interface Issue {
  code: IssueCode;
  severity: Severity;
  /** Human-readable, bilingual-safe message. */
  message: string;
  meeting: string;
  topic: string | null;
  /** Verbatim lines that triggered the issue. */
  evidence: string[];
}

export interface DistilledMeeting {
  sourceFile: string;
  format: FormatId;
  title: string;
  date: string | null;
  lang: Lang;
  participants: string[];
  overallSummary: string;
  topics: Topic[];
  issues: Issue[];
}

/** Action items regrouped by owner for the browser view and the report. */
export interface OwnerGroup {
  owner: string;
  items: Array<ActionItem & { meeting: string }>;
}

export interface DistillReport {
  generatedAt: string;
  meetings: DistilledMeeting[];
  /** Files that parsed but held no dialogue, so they are not reported as
   *  meetings. Prevents a non-transcript file being flagged as a meeting
   *  with no decision. */
  skipped: Array<{ name: string; reason: string }>;
  byOwner: OwnerGroup[];
  /** Items with no owner, an ambiguous owner, or no due date. */
  unassigned: Array<ActionItem & { meeting: string }>;
  issues: Issue[];
}
