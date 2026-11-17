import type { DistilledMeeting, Issue, Topic } from "./types";
import { CRITICAL_SUBJECTS } from "./extract/lexicon";
import { containsAny, splitSentences } from "./extract/text";
import { extractDue } from "./extract/actions";

/** Detects the problems required by requirement 4. Pure function over an
 *  already-distilled meeting so it can be unit tested in isolation. */
export function flagIssues(meeting: {
  title: string;
  topics: Topic[];
}): Issue[] {
  const issues: Issue[] = [];
  const allDecisions = meeting.topics.flatMap((t) => t.decisions);

  // 4.1 A meeting where nothing was decided at all.
  if (allDecisions.length === 0) {
    issues.push({
      code: "NO_DECISION_MEETING",
      severity: "high",
      message: "ไม่พบการตัดสินใจใด ๆ ในการประชุมนี้ / No decision was recorded in this meeting.",
      meeting: meeting.title,
      topic: null,
      evidence: [],
    });
  }

  for (const topic of meeting.topics) {
    // 4.2 Action items with no owner / an ambiguous owner / no due date.
    for (const item of topic.actionItems) {
      if (item.owner === null) {
        issues.push({
          code: "ACTION_ITEM_NO_OWNER",
          severity: "high",
          message: `ไม่มีผู้รับผิดชอบสำหรับงาน "${item.task}" / Action item has no owner.`,
          meeting: meeting.title,
          topic: topic.title,
          evidence: [item.source],
        });
      } else if (item.ownerAmbiguous) {
        issues.push({
          code: "ACTION_ITEM_AMBIGUOUS_OWNER",
          severity: "medium",
          message: `ผู้รับผิดชอบไม่ชัดเจน ("${item.owner}") สำหรับงาน "${item.task}" / Owner is not a named person.`,
          meeting: meeting.title,
          topic: topic.title,
          evidence: [item.source],
        });
      }
      if (item.due === null) {
        issues.push({
          code: "ACTION_ITEM_NO_DUE_DATE",
          severity: "medium",
          message: `ไม่มีกำหนดเวลาสำหรับงาน "${item.task}" / Action item has no due date.`,
          meeting: meeting.title,
          topic: topic.title,
          evidence: [item.source],
        });
      }
    }

    // 4.3 Two action items on the same subject with different due dates.
    issues.push(...conflictingDueDates(meeting.title, topic));

    // 4.4 A go-live / release date was discussed but never decided.
    issues.push(...unresolvedCriticalDate(meeting.title, topic));
  }

  return issues;
}

/** Groups action items in a topic by subject keyword and reports pairs whose
 *  due dates disagree. */
export function conflictingDueDates(meetingTitle: string, topic: Topic): Issue[] {
  const bySubject = new Map<string, Array<{ due: string; source: string; task: string }>>();

  for (const item of topic.actionItems) {
    if (item.due === null) continue;
    const subject = subjectKey(`${item.task} ${item.source}`);
    if (subject === null) continue;
    const list = bySubject.get(subject) ?? [];
    list.push({ due: item.due, source: item.source, task: item.task });
    bySubject.set(subject, list);
  }

  const issues: Issue[] = [];
  for (const [subject, items] of bySubject) {
    const distinct = Array.from(new Set(items.map((i) => normalizeDue(i.due))));
    if (distinct.length > 1) {
      issues.push({
        code: "CONFLICTING_DUE_DATES",
        severity: "high",
        message: `กำหนดเวลาของเรื่อง "${subject}" ขัดแย้งกัน (${distinct.join(" vs ")}) / Conflicting due dates for the same subject.`,
        meeting: meetingTitle,
        topic: topic.title,
        evidence: items.map((i) => i.source),
      });
    }
  }
  return issues;
}

/** A critical subject (go-live, release, cutover, ขึ้นระบบ) was discussed with
 *  at least two different candidate dates, and the topic has no decision. */
export function unresolvedCriticalDate(meetingTitle: string, topic: Topic): Issue[] {
  const haystack = [topic.title, ...topic.lines].join("\n");
  const subjectHit = containsAny(haystack, CRITICAL_SUBJECTS);
  if (subjectHit === null) return [];

  const dates = new Set<string>();
  const evidence: string[] = [];
  for (const line of topic.lines) {
    for (const sentence of splitSentences(line)) {
      const due = extractDue(sentence);
      if (!due) continue;
      dates.add(normalizeDue(due));
      evidence.push(line);
    }
  }

  if (topic.decisions.length > 0 || dates.size === 0) return [];

  return [
    {
      code: "UNRESOLVED_DATE_DISCUSSION",
      severity: "high",
      message: `มีการพูดถึงกำหนดวันของ "${subjectHit}" (${Array.from(dates).join(", ")}) แต่ยังไม่มีการตัดสินใจ / A critical date was discussed but not decided.`,
      meeting: meetingTitle,
      topic: topic.title,
      evidence: Array.from(new Set(evidence)).slice(0, 5),
    },
  ];
}

function normalizeDue(due: string): string {
  return due.toLowerCase().replace(/\s+/g, " ").trim();
}

const SUBJECT_WORDS = [
  ...CRITICAL_SUBJECTS,
  "uat",
  "sit",
  "test",
  "report",
  "รายงาน",
  "เอกสาร",
  "document",
  "spec",
  "design",
  "migration",
  "ย้ายระบบ",
  "training",
  "อบรม",
];

/** Reduces a task to a coarse subject so two phrasings of the same work land
 *  in the same bucket. Returns null when no known subject word is present. */
export function subjectKey(text: string): string | null {
  return containsAny(text, SUBJECT_WORDS)?.toLowerCase() ?? null;
}

export function issuesOf(meetings: DistilledMeeting[]): Issue[] {
  return meetings.flatMap((m) => m.issues);
}
