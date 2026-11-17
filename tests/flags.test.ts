import { describe, expect, it } from "vitest";
import { buildReport, distillFile } from "@/lib/extract";
import { conflictingDueDates, flagIssues, subjectKey } from "@/lib/flags";
import type { Topic } from "@/lib/types";
import { FIXTURES, fixture } from "./helpers";

function topic(partial: Partial<Topic>): Topic {
  return {
    title: "T",
    summary: "",
    lines: [],
    decisions: [],
    actionItems: [],
    utteranceCount: 0,
    ...partial,
  };
}

/** Required test case 7.a.i — action item with no owner. */
describe("ACTION_ITEM_NO_OWNER", () => {
  it("flags an action item that has no owner", () => {
    const issues = flagIssues({
      title: "M",
      topics: [
        topic({
          decisions: [{ text: "we agreed to ship", topic: "T", source: "x" }],
          actionItems: [
            {
              task: "update the runbook",
              owner: null,
              due: "2026-09-01",
              topic: "T",
              source: "Action item: update the runbook",
              ownerAmbiguous: false,
            },
          ],
        }),
      ],
    });
    expect(issues.map((i) => i.code)).toContain("ACTION_ITEM_NO_OWNER");
  });

  it("does not flag an action item that has a named owner and a date", () => {
    const issues = flagIssues({
      title: "M",
      topics: [
        topic({
          decisions: [{ text: "we agreed", topic: "T", source: "x" }],
          actionItems: [
            {
              task: "send the counter offer",
              owner: "Deepak",
              due: "2026-08-27",
              topic: "T",
              source: "s",
              ownerAmbiguous: false,
            },
          ],
        }),
      ],
    });
    expect(issues).toHaveLength(0);
  });

  it("flags a group word as an ambiguous owner rather than a person", () => {
    const report = buildReport([fixture(FIXTURES.markdownEn)]);
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain("ACTION_ITEM_AMBIGUOUS_OWNER");
  });
});

/** Required test case 7.a.ii — meeting with no decision. */
describe("NO_DECISION_MEETING", () => {
  it("flags a meeting where nothing was decided", () => {
    const m = distillFile(fixture(FIXTURES.noDecision));
    expect(m.issues.map((i) => i.code)).toContain("NO_DECISION_MEETING");
  });

  it("does not flag a meeting that recorded a decision", () => {
    const m = distillFile(fixture(FIXTURES.markdownEn));
    expect(m.issues.map((i) => i.code)).not.toContain("NO_DECISION_MEETING");
  });

  it("does not count a negated sentence as a decision", () => {
    const m = distillFile(fixture(FIXTURES.vttMixed));
    const decisionTexts = m.topics.flatMap((t) => t.decisions.map((d) => d.text));
    expect(decisionTexts.some((t) => t.includes("have not decided"))).toBe(false);
  });
});

describe("CONFLICTING_DUE_DATES", () => {
  it("flags two action items on the same subject with different dates", () => {
    const issues = conflictingDueDates(
      "M",
      topic({
        actionItems: [
          { task: "confirm the release date", owner: "Deepak", due: "2026-09-10", topic: "T", source: "a", ownerAmbiguous: false },
          { task: "lock the release date", owner: "Deepak", due: "2026-09-30", topic: "T", source: "b", ownerAmbiguous: false },
        ],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].evidence).toHaveLength(2);
  });

  it("does not flag two items on the same subject with the same date", () => {
    const issues = conflictingDueDates(
      "M",
      topic({
        actionItems: [
          { task: "confirm the release date", owner: "A", due: "2026-09-10", topic: "T", source: "a", ownerAmbiguous: false },
          { task: "publish the release notes", owner: "B", due: "2026-09-10", topic: "T", source: "b", ownerAmbiguous: false },
        ],
      }),
    );
    expect(issues).toHaveLength(0);
  });

  it("maps different phrasings of the same work to one subject", () => {
    expect(subjectKey("confirm the release date")).toBe(subjectKey("lock the release date"));
    expect(subjectKey("random chit chat")).toBeNull();
  });
});

describe("UNRESOLVED_DATE_DISCUSSION", () => {
  it("flags a go-live date discussed without a decision", () => {
    const m = distillFile(fixture(FIXTURES.speakerTh));
    const goLive = m.issues.filter((i) => i.code === "UNRESOLVED_DATE_DISCUSSION");
    expect(goLive.length).toBeGreaterThanOrEqual(1);
  });
});
