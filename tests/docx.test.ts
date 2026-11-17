import { describe, expect, it } from "vitest";
import { buildDocx } from "@/lib/docx";
import { buildReport } from "@/lib/extract";
import { FIXTURES, fixture } from "./helpers";

describe("docx export", () => {
  it("produces a valid, non-trivial docx buffer", async () => {
    const report = buildReport([fixture(FIXTURES.speakerTh), fixture(FIXTURES.jsonExport)]);
    const buffer = await buildDocx(report);
    expect(buffer.byteLength).toBeGreaterThan(5000);
    // A .docx is a zip archive: it must start with the PK local file header.
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("handles an empty report without throwing", async () => {
    const buffer = await buildDocx({
      generatedAt: new Date().toISOString(),
      meetings: [],
      skipped: [],
      byOwner: [],
      unassigned: [],
      issues: [],
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
