import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURES = path.join(process.cwd(), "tests", "fixtures");
const f = (name: string) => path.join(FIXTURES, name);

test.describe("Meeting Notes Distiller", () => {
  test("uploads several files at once, processes, and shows all three result blocks", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Meeting Notes Distiller" })).toBeVisible();

    await page.getByTestId("file-input").setInputFiles([
      f("01-speaker-th.txt"),
      f("02-markdown-en.md"),
      f("03-vtt-mixed.vtt"),
      f("04-json-export.json"),
    ]);
    await expect(page.getByTestId("queued-list").locator("li")).toHaveCount(4);

    await page.getByTestId("submit").click();
    await expect(page.getByTestId("report")).toBeVisible({ timeout: 30_000 });

    // 5.a.i one summary per meeting
    await expect(page.getByTestId("meeting-card")).toHaveCount(4);
    // 5.a.ii action items grouped by owner
    await expect(page.getByTestId("owner-group").first()).toBeVisible();
    // 5.a.iii unowned / unclear items and flagged problems
    await expect(page.getByTestId("unassigned-table")).toBeVisible();
    await expect(page.getByTestId("issues-table")).toBeVisible();
  });

  test("accumulates files across two separate uploads", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles([f("01-speaker-th.txt")]);
    await expect(page.getByTestId("queued-list").locator("li")).toHaveCount(1);

    await page.getByTestId("file-input").setInputFiles([f("04-json-export.json")]);
    await expect(page.getByTestId("queued-list").locator("li")).toHaveCount(2);

    await page.getByTestId("submit").click();
    await expect(page.getByTestId("meeting-card")).toHaveCount(2, { timeout: 30_000 });
  });

  test("flags a meeting that recorded no decision", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles([f("05-no-decision.txt")]);
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("issues-table")).toContainText("NO_DECISION_MEETING", {
      timeout: 30_000,
    });
  });

  test("downloads the report as a .docx file", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles([f("01-speaker-th.txt")]);
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("download")).toBeVisible({ timeout: 30_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("download").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    expect(buffer.byteLength).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  test("rejects a file that holds no dialogue", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("file-input").setInputFiles([f("../../package.json")]);
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error")).toBeVisible({ timeout: 30_000 });
  });
});
