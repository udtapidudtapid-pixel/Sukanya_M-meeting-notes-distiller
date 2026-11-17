import { describe, expect, it } from "vitest";
import { buildReport, distillFile, UNASSIGNED_LABEL } from "@/lib/extract";
import { extractDue, extractOwner } from "@/lib/extract/actions";
import { isNegated } from "@/lib/extract/decisions";
import { FIXTURES, fixture } from "./helpers";

describe("owner extraction", () => {
  it("reads an @mention", () => {
    expect(extractOwner("Action: @bob please update the runbook", null).owner).toBe("bob");
  });

  it("reads an explicit assignment in English", () => {
    expect(extractOwner("Action: assigned to Bob - prepare the dry run", null).owner).toBe("Bob");
  });

  it("reads a Thai assignment", () => {
    expect(extractOwner("มอบหมายให้ ปรีชา ช่วยตรวจ UAT report", null).owner).toBe("ปรีชา");
  });

  it("falls back to the speaker for a self-assigning sentence", () => {
    const r = extractOwner("ผมจะเตรียม test data ภายในวันที่ 25/08", "Nattapong");
    expect(r.owner).toBe("Nattapong");
    expect(r.ambiguous).toBe(false);
  });

  it("marks a group word as an ambiguous owner, not a person", () => {
    const r = extractOwner("Action item: someone needs to update the runbook", null);
    expect(r.ambiguous).toBe(true);
  });

  it("returns null when nobody is named", () => {
    expect(extractOwner("Action item: the monitoring thresholds need a review", null).owner).toBeNull();
  });
});

describe("due date extraction", () => {
  it.each([
    ["ต้องส่ง RCA draft ภายในวันที่ 29/08", "29/08"],
    ["ช่วยตรวจ UAT report ภายในวันศุกร์", "ศุกร์"],
    ["prepare the staging dry run, due 2026-08-26", "2026-08-26"],
    ["Priya will confirm the customer list by Friday", "Friday"],
    ["send the report by EOD", "EOD"],
  ])("reads %s", (sentence, expected) => {
    expect(extractDue(sentence)?.toLowerCase()).toBe(expected.toLowerCase());
  });

  it("returns null when no date is written", () => {
    expect(extractDue("Action: the team will check the monitoring thresholds")).toBeNull();
  });
});

describe("decision detection", () => {
  it("accepts a real decision", () => {
    const m = distillFile(fixture(FIXTURES.speakerTh));
    const texts = m.topics.flatMap((t) => t.decisions.map((d) => d.text));
    expect(texts.some((t) => t.includes("script ชุดเดิม"))).toBe(true);
  });

  it("rejects a negated decision sentence", () => {
    expect(isNegated("อันนี้ยังไม่ได้ข้อสรุป เดี๋ยวคุยกันอีกรอบ")).toBe(true);
    expect(isNegated("We have not decided who owns the RCA yet")).toBe(true);
    expect(isNegated("We agreed to counter at 6 percent")).toBe(false);
  });
});

describe("meeting distillation", () => {
  it("extracts topics, participants and action items from markdown notes", () => {
    const m = distillFile(fixture(FIXTURES.markdownEn));
    expect(m.topics.map((t) => t.title)).toEqual(
      expect.arrayContaining(["Billing service migration", "Release scope"]),
    );
    expect(m.participants).toEqual(expect.arrayContaining(["Alice Chen", "Bob Martin"]));
    expect(m.overallSummary.length).toBeGreaterThan(0);
    const items = m.topics.flatMap((t) => t.actionItems);
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("detects the transcript language", () => {
    expect(distillFile(fixture(FIXTURES.markdownEn)).lang).toBe("en");
    expect(distillFile(fixture(FIXTURES.noDecision)).lang).toBe("th");
  });
});

describe("multi-file report", () => {
  const files = [
    fixture(FIXTURES.speakerTh),
    fixture(FIXTURES.markdownEn),
    fixture(FIXTURES.vttMixed),
    fixture(FIXTURES.jsonExport),
  ];

  it("processes every uploaded file in one report", () => {
    const report = buildReport(files);
    expect(report.meetings).toHaveLength(4);
    expect(new Set(report.meetings.map((m) => m.format)).size).toBe(4);
  });

  it("groups action items by owner and keeps an unassigned bucket", () => {
    const report = buildReport(files);
    const owners = report.byOwner.map((g) => g.owner);
    expect(owners).toContain("Nattapong");
    expect(owners[owners.length - 1]).toBe(UNASSIGNED_LABEL);
    expect(report.unassigned.length).toBeGreaterThan(0);
  });
});

describe("non-transcript input", () => {
  it("skips a file with no dialogue instead of reporting it as a meeting", () => {
    const report = buildReport([
      { name: "package.json", content: '{ "name": "app", "version": "1.0.0" }' },
    ]);
    expect(report.meetings).toHaveLength(0);
    expect(report.skipped[0].name).toBe("package.json");
    expect(report.issues).toHaveLength(0);
  });

  it("still processes the good files in a mixed batch", () => {
    const report = buildReport([
      { name: "package.json", content: '{ "name": "app" }' },
      fixture(FIXTURES.speakerTh),
    ]);
    expect(report.meetings).toHaveLength(1);
    expect(report.skipped).toHaveLength(1);
  });
});
