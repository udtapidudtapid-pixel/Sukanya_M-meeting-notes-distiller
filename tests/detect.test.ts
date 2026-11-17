import { describe, expect, it } from "vitest";
import { detectFormat, parseTranscript } from "@/lib/parsers/detect";
import { FIXTURES, fixture } from "./helpers";

describe("format auto-detection", () => {
  it.each([
    [FIXTURES.speakerTh, "speaker-colon"],
    [FIXTURES.markdownEn, "markdown-notes"],
    [FIXTURES.vttMixed, "vtt-timestamped"],
    [FIXTURES.jsonExport, "json-export"],
  ])("detects %s as %s without being told", (file, expected) => {
    const f = fixture(file);
    expect(detectFormat(f.content, f.name)).toBe(expected);
  });

  it("returns unknown for empty input instead of throwing", () => {
    expect(detectFormat("", "empty.txt")).toBe("unknown");
  });

  it("does not treat malformed JSON as a JSON export", () => {
    expect(detectFormat('{ "title": broken', "x.json")).not.toBe("json-export");
  });
});

describe("parsers", () => {
  it("reads the header block of a Thai speaker transcript", () => {
    const f = fixture(FIXTURES.speakerTh);
    const parsed = parseTranscript(f.content, f.name);
    expect(parsed.title).toContain("Go-live");
    expect(parsed.date).toBe("2026-08-20");
    expect(parsed.declaredParticipants).toContain("Nattapong");
    expect(parsed.utterances.length).toBeGreaterThan(5);
    expect(parsed.utterances[0].time).toBe("10:00");
  });

  it("reads markdown headings as topic boundaries", () => {
    const f = fixture(FIXTURES.markdownEn);
    const parsed = parseTranscript(f.content, f.name);
    const headings = new Set(parsed.utterances.map((u) => u.heading));
    expect(headings.has("Billing service migration")).toBe(true);
    expect(headings.has("Release scope")).toBe(true);
    expect(parsed.declaredParticipants).toEqual(
      expect.arrayContaining(["Alice Chen", "Bob Martin", "Priya Nair"]),
    );
  });

  it("reads WebVTT voice spans with timestamps", () => {
    const f = fixture(FIXTURES.vttMixed);
    const parsed = parseTranscript(f.content, f.name);
    expect(parsed.title).toBe("Weekly Ops Sync");
    expect(parsed.utterances[0].speaker).toBe("Somchai");
    expect(parsed.utterances[0].time).toBe("00:00:01");
  });

  it("reads a JSON export with per-entry topics", () => {
    const f = fixture(FIXTURES.jsonExport);
    const parsed = parseTranscript(f.content, f.name);
    expect(parsed.title).toBe("Vendor Contract Review");
    expect(parsed.utterances[0].heading).toBe("Pricing");
    expect(parsed.declaredParticipants).toHaveLength(3);
  });
});
