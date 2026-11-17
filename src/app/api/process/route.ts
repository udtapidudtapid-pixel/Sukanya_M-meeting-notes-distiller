import { NextResponse } from "next/server";
import { buildReport } from "@/lib/extract";
import { readUploads } from "@/lib/upload";

export const runtime = "nodejs";

/** POST multipart/form-data with one or more `files` entries. */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "ต้องส่งเป็น multipart/form-data / multipart/form-data required" },
      { status: 400 },
    );
  }

  try {
    const form = await request.formData();
    const entries = form.getAll("files").filter((v): v is File => v instanceof File);

    if (entries.length === 0) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด / no files uploaded" }, { status: 400 });
    }

    const { files, rejected } = await readUploads(entries);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "ไม่มีไฟล์ที่ประมวลผลได้ / no processable files", rejected },
        { status: 400 },
      );
    }

    const report = buildReport(files);
    if (report.meetings.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบ transcript ที่อ่านได้ / no readable transcript", rejected: [...rejected, ...report.skipped] },
        { status: 400 },
      );
    }
    return NextResponse.json({ report, rejected: [...rejected, ...report.skipped] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: `ประมวลผลไม่สำเร็จ / processing failed: ${message}` }, { status: 500 });
  }
}
