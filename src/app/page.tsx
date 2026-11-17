"use client";

import { useCallback, useRef, useState } from "react";
import type { DistillReport, Issue } from "@/lib/types";
import { ACCEPTED_EXT } from "@/lib/upload";

interface Rejected {
  name: string;
  reason: string;
}

const SEV_CLASS: Record<Issue["severity"], string> = {
  high: "sev-high",
  medium: "sev-medium",
  low: "sev-low",
};

export default function Page() {
  const [queued, setQueued] = useState<File[]>([]);
  const [report, setReport] = useState<DistillReport | null>(null);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Accumulates across multiple uploads instead of replacing (requirement 1). */
  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    setQueued((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...list.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }, []);

  async function submit() {
    if (queued.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      queued.forEach((f) => form.append("files", f));
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ประมวลผลไม่สำเร็จ");
        setRejected(data.rejected ?? []);
        return;
      }
      setReport(data.report);
      setRejected(data.rejected ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!report) return;
    setBusy(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      if (!res.ok) {
        setError("สร้างไฟล์ Word ไม่สำเร็จ / export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-notes-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setQueued([]);
    setReport(null);
    setRejected([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main>
      <h1>Meeting Notes Distiller</h1>
      <p className="sub">
        อัปโหลด transcript ของการประชุม (หลายไฟล์ / หลายครั้งได้) แล้วกด Process เพื่อถอดใจความสำคัญ
      </p>

      <section className="card">
        <div
          className={hot ? "dropzone hot" : "dropzone"}
          data-testid="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setHot(true);
          }}
          onDragLeave={() => setHot(false)}
          onDrop={(e) => {
            e.preventDefault();
            setHot(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <strong>คลิกหรือลากไฟล์มาวางที่นี่</strong>
          <div className="sub" style={{ marginTop: 6 }}>
            รองรับ {ACCEPTED_EXT.join(", ")} — เลือกได้หลายไฟล์ และอัปโหลดเพิ่มได้หลายครั้ง
          </div>
        </div>
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(",")}
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />

        {queued.length > 0 && (
          <ul className="files" data-testid="queued-list">
            {queued.map((f) => (
              <li key={`${f.name}-${f.size}`}>
                <span>{f.name}</span>
                <span className="meta">{(f.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          <button data-testid="submit" onClick={submit} disabled={busy || queued.length === 0}>
            {busy ? "กำลังประมวลผล…" : `Process ${queued.length} file(s)`}
          </button>
          <button className="ghost" onClick={reset} disabled={busy}>
            Clear
          </button>
          {report && (
            <button className="ghost" data-testid="download" onClick={download} disabled={busy}>
              Download .docx
            </button>
          )}
        </div>

        {error && (
          <p className="error" data-testid="error">
            {error}
          </p>
        )}
        {rejected.length > 0 && (
          <ul className="files" data-testid="rejected-list">
            {rejected.map((r) => (
              <li key={r.name}>
                <span>{r.name}</span>
                <span className="meta error">{r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {report && (
        <div data-testid="report">
          <h2>1. Meeting summary ต่อการประชุม</h2>
          {report.meetings.map((m) => (
            <section className="card" key={m.sourceFile} data-testid="meeting-card">
              <h3>{m.title}</h3>
              <p className="sub">
                <span className="tag">{m.format}</span> <span className="tag">{m.lang}</span>{" "}
                <span className="tag">{m.sourceFile}</span>{" "}
                <span className="tag">{m.date ?? "ไม่ระบุวันที่"}</span>
              </p>

              <h4>ผู้เข้าร่วม ({m.participants.length})</h4>
              <p>{m.participants.join(", ") || <span className="empty">ไม่พบผู้เข้าร่วม</span>}</p>

              <h4>สรุปโดยรวม</h4>
              <p>{m.overallSummary || <span className="empty">-</span>}</p>

              {m.topics.map((t) => (
                <div key={t.title} style={{ marginTop: 14 }}>
                  <h4>หัวข้อ: {t.title}</h4>
                  <p>{t.summary || <span className="empty">-</span>}</p>
                  <table>
                    <tbody>
                      <tr>
                        <th style={{ width: "18%" }}>การตัดสินใจ</th>
                        <td>
                          {t.decisions.length === 0 ? (
                            <span className="empty">ไม่มีการตัดสินใจในหัวข้อนี้</span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {t.decisions.map((d, i) => (
                                <li key={i}>{d.text}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Action items</th>
                        <td>
                          {t.actionItems.length === 0 ? (
                            <span className="empty">-</span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {t.actionItems.map((a, i) => (
                                <li key={i}>
                                  {a.task}{" "}
                                  <span className="tag">
                                    {a.owner ?? "ไม่มีผู้รับผิดชอบ"}
                                    {a.ownerAmbiguous ? " (ไม่ชัดเจน)" : ""}
                                  </span>{" "}
                                  <span className="tag">{a.due ?? "ไม่มีกำหนด"}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))}

          <h2>2. Action items จัดกลุ่มตามผู้รับผิดชอบ</h2>
          <section className="card">
            {report.byOwner.length === 0 ? (
              <p className="empty">ไม่พบ action item</p>
            ) : (
              report.byOwner.map((g) => (
                <div key={g.owner} data-testid="owner-group">
                  <h3>
                    {g.owner} <span className="tag">{g.items.length}</span>
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "45%" }}>งาน</th>
                        <th>กำหนดส่ง</th>
                        <th>การประชุม</th>
                        <th>หัวข้อ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((i, idx) => (
                        <tr key={idx}>
                          <td>{i.task}</td>
                          <td>{i.due ?? <span className="empty">-</span>}</td>
                          <td>{i.meeting}</td>
                          <td>{i.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>

          <h2>3. เรื่องที่ไม่มีผู้รับผิดชอบ / ความไม่ชัดเจน / ปัญหาที่ตรวจพบ</h2>
          <section className="card">
            <h3>Action items ที่ยังไม่ครบถ้วน</h3>
            {report.unassigned.length === 0 ? (
              <p className="empty">ไม่พบ</p>
            ) : (
              <table data-testid="unassigned-table">
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>งาน</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>กำหนดส่ง</th>
                    <th>การประชุม</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unassigned.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.task}</td>
                      <td>
                        {i.owner ?? <span className="error">ไม่ระบุ</span>}
                        {i.ownerAmbiguous && <span className="error"> (ไม่ชัดเจน)</span>}
                      </td>
                      <td>{i.due ?? <span className="error">ไม่ระบุ</span>}</td>
                      <td>{i.meeting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3>ปัญหาที่ระบบ flag ไว้ ({report.issues.length})</h3>
            {report.issues.length === 0 ? (
              <p className="empty">ไม่พบปัญหา</p>
            ) : (
              <table data-testid="issues-table">
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>ระดับ</th>
                    <th style={{ width: "22%" }}>ประเภท</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {report.issues.map((i, idx) => (
                    <tr key={idx}>
                      <td className={SEV_CLASS[i.severity]}>{i.severity}</td>
                      <td>{i.code}</td>
                      <td>
                        {i.message}
                        <code className="src">
                          {i.meeting}
                          {i.topic ? ` › ${i.topic}` : ""}
                          {i.evidence.length > 0 ? `\n${i.evidence.join("\n")}` : ""}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
