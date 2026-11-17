import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DistillReport, Issue } from "./types";

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { before: 200, after: 100 } });
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; indent?: number } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
    indent: opts.indent ? { left: opts.indent } : undefined,
    spacing: { after: 60 },
  });
}

function bullet(text: string, level = 0) {
  return new Paragraph({ text, bullet: { level }, spacing: { after: 40 } });
}

function cell(text: string, bold = false) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function table(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((x) => cell(x, true)), tableHeader: true }),
      ...rows.map((r) => new TableRow({ children: r.map((x) => cell(x)) })),
    ],
  });
}

const SEVERITY_LABEL: Record<Issue["severity"], string> = {
  high: "สูง / High",
  medium: "กลาง / Medium",
  low: "ต่ำ / Low",
};

/** Builds the .docx equivalent of what the browser shows (requirement 6). */
export async function buildDocx(report: DistillReport): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      text: "Meeting Notes Distiller — Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    p(`Generated at: ${report.generatedAt}`, { italics: true }),
    p(`Meetings processed: ${report.meetings.length}`, { italics: true }),
  );

  // Section 1 — one summary per meeting
  children.push(h("1. Meeting summaries", HeadingLevel.HEADING_1));
  for (const m of report.meetings) {
    children.push(h(m.title, HeadingLevel.HEADING_2));
    children.push(
      p(`File: ${m.sourceFile}  |  Format: ${m.format}  |  Language: ${m.lang}`, { italics: true }),
    );
    children.push(p(`Date: ${m.date ?? "ไม่ระบุ / not stated"}`));
    children.push(p(`Participants (${m.participants.length}): ${m.participants.join(", ") || "-"}`));
    children.push(p("Overall summary", { bold: true }));
    children.push(p(m.overallSummary || "-"));

    for (const t of m.topics) {
      children.push(h(`Topic: ${t.title}`, HeadingLevel.HEADING_3));
      children.push(p(t.summary || "-"));

      children.push(p("Decisions", { bold: true }));
      if (t.decisions.length === 0) children.push(bullet("ไม่มีการตัดสินใจ / no decision recorded"));
      else t.decisions.forEach((d) => children.push(bullet(d.text)));

      children.push(p("Action items", { bold: true }));
      if (t.actionItems.length === 0) children.push(bullet("-"));
      else
        t.actionItems.forEach((a) =>
          children.push(
            bullet(
              `${a.task} — owner: ${a.owner ?? "ไม่ระบุ / unassigned"} — due: ${a.due ?? "ไม่ระบุ / none"}`,
            ),
          ),
        );
    }
  }

  // Section 2 — action items grouped by owner
  children.push(h("2. Action items by owner", HeadingLevel.HEADING_1));
  for (const g of report.byOwner) {
    children.push(h(`${g.owner} (${g.items.length})`, HeadingLevel.HEADING_2));
    children.push(
      table(
        ["Task", "Due", "Meeting", "Topic"],
        g.items.map((i) => [i.task, i.due ?? "-", i.meeting, i.topic]),
      ),
    );
  }

  // Section 3 — unowned / unclear items and flagged problems
  children.push(h("3. Unassigned or unclear action items", HeadingLevel.HEADING_1));
  if (report.unassigned.length === 0) {
    children.push(p("ไม่พบ / none"));
  } else {
    children.push(
      table(
        ["Task", "Owner", "Due", "Meeting"],
        report.unassigned.map((i) => [
          i.task,
          i.owner ?? "-",
          i.due ?? "-",
          i.meeting,
        ]),
      ),
    );
  }

  children.push(h("4. Flagged problems", HeadingLevel.HEADING_1));
  if (report.issues.length === 0) {
    children.push(p("ไม่พบปัญหา / none"));
  } else {
    children.push(
      table(
        ["Severity", "Code", "Meeting", "Topic", "Detail"],
        report.issues.map((i) => [
          SEVERITY_LABEL[i.severity],
          i.code,
          i.meeting,
          i.topic ?? "-",
          i.message,
        ]),
      ),
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Tahoma", size: 22 } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
