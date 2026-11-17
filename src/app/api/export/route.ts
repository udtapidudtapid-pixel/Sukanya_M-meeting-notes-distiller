import { buildDocx } from "@/lib/docx";
import type { DistillReport } from "@/lib/types";

export const runtime = "nodejs";

/** POST a DistillReport JSON body, get a .docx back. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { report?: DistillReport };
    if (!body.report || !Array.isArray(body.report.meetings)) {
      return Response.json({ error: "ต้องส่ง report มาด้วย / report payload required" }, { status: 400 });
    }

    const buffer = await buildDocx(body.report);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="meeting-notes-${stamp}.docx"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: `สร้างไฟล์ไม่สำเร็จ / export failed: ${message}` }, { status: 500 });
  }
}
