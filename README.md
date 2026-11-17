# Meeting Notes Distiller Web

เว็บถอดใจความสำคัญของการประชุม — อัปโหลด transcript ได้หลายไฟล์และหลายครั้ง
แล้วสรุปออกมาเป็นหัวข้อ ผู้เข้าร่วม สรุปรวม/สรุปรายหัวข้อ การตัดสินใจ และ
action item พร้อมชี้จุดที่เป็นปัญหา แสดงผลบน browser และดาวน์โหลดเป็นไฟล์ Word
ได้

---

## 1. Quick start (local)

ต้องมี Node.js 20 ขึ้นไป

```bash
git clone <repo-url>
cd meeting-notes-distiller
npm install

npm run dev          # เปิด http://localhost:3000
```

รันแบบ production build

```bash
npm run build
npm run start        # http://localhost:3000
```

วิธีลองใช้: กดที่กล่อง upload เลือกไฟล์จาก `tests/fixtures/` ได้เลย
(เลือกหลายไฟล์พร้อมกันได้ หรือเลือกเพิ่มอีกรอบก็ได้) แล้วกด **Process**
เมื่อผลขึ้นแล้วกด **Download .docx**

### คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run start` | รัน production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit test (Vitest) — 42 tests |
| `npm run test:watch` | unit test แบบ watch |
| `npm run test:e2e` | E2E (Playwright) — ต้องรัน `npx playwright install` ครั้งแรก |
| `npm run verify` | typecheck + unit test + build (ใช้ก่อนถือว่างานเสร็จ) |

---

## 2. Requirement coverage

| โจทย์ | สถานะ | อยู่ที่ |
| --- | --- | --- |
| 1. Upload หลายไฟล์ / หลายครั้ง ประมวลผลพร้อมกัน | เสร็จ | `src/app/page.tsx`, `src/lib/upload.ts` |
| 2. Process — รองรับ transcript ≥ 3 รูปแบบ โดยไม่ต้องบอกรูปแบบ | เสร็จ (ทำ 4 รูปแบบ) | `src/lib/parsers/` |
| 3. Extract — หัวข้อ / ผู้เข้าร่วม / สรุป / การตัดสินใจ / action item | เสร็จ | `src/lib/extract/` |
| 4. Flag problem — ไม่มีการตัดสินใจ, action item ขัดแย้ง/ไม่สอดคล้อง | เสร็จ (6 issue code) | `src/lib/flags.ts` |
| 5. Display บน browser ทั้ง 3 บล็อก | เสร็จ | `src/app/page.tsx` |
| 6. Download เป็น MS Word | เสร็จ | `src/lib/docx.ts`, `/api/export` |
| 7. Unit test extraction logic + 2 เคสที่บังคับ | เสร็จ | `tests/flags.test.ts` |
| Complexity bar — FE / BE / test suite / E2E / README | เสร็จ | ทั้ง repo |
| Part 2 — `CLAUDE.md` | เสร็จ | `CLAUDE.md` |
| Part 3 — `.claude/skills/` | เสร็จ (3 skills) | `.claude/skills/` |
| Part 4 — SRS, Unit Test Case, SIT/UAT | เสร็จ | `docs/` |

### transcript 4 รูปแบบที่รองรับ

ระบบเดารูปแบบจาก **เนื้อหาไฟล์** ไม่ได้ถามผู้ใช้ และไม่ได้ตัดสินจากนามสกุล
(นามสกุลใช้เป็นตัวตัดสินท้ายสุดเท่านั้น)

| Format id | หน้าตา | ตัวอย่าง |
| --- | --- | --- |
| `speaker-colon` | plain text `ชื่อ: ข้อความ` มี `[10:03]` หรือไม่มีก็ได้ + header block | `tests/fixtures/01-speaker-th.txt` |
| `markdown-notes` | markdown `#` ชื่อประชุม, `##` หัวข้อ, bullet | `tests/fixtures/02-markdown-en.md` |
| `vtt-timestamped` | WebVTT / SRT มี cue `00:00:01.000 --> ...` และ `<v Name>` | `tests/fixtures/03-vtt-mixed.vtt` |
| `json-export` | JSON export แบบ Zoom/Teams/Meet | `tests/fixtures/04-json-export.json` |

### 6 issue code ที่ flag ได้

| Code | Severity | เงื่อนไข |
| --- | --- | --- |
| `NO_DECISION_MEETING` | high | ประชุมนี้ไม่มีการตัดสินใจเลยทุกหัวข้อ |
| `ACTION_ITEM_NO_OWNER` | high | action item ไม่มีผู้รับผิดชอบ |
| `ACTION_ITEM_AMBIGUOUS_OWNER` | medium | ผู้รับผิดชอบเป็นคำรวม ("ทีม", "someone") ไม่ใช่คน |
| `ACTION_ITEM_NO_DUE_DATE` | medium | action item ไม่มีกำหนดเวลา |
| `CONFLICTING_DUE_DATES` | high | งานเรื่องเดียวกันมีกำหนดเวลาไม่ตรงกัน |
| `UNRESOLVED_DATE_DISCUSSION` | high | คุยเรื่องวัน go-live / release / ขึ้นระบบ มีวันที่โผล่มา แต่หัวข้อนั้นไม่มีการตัดสินใจ |

ทุก issue พ่วง `evidence` ที่เป็นบรรทัดจริงจาก transcript มาด้วย เพื่อให้ตรวจย้อนได้

---

## 3. Design decisions (Part 1)

### 3.1 เลือก rule-based ไม่ใช้ LLM ตอน runtime

extraction ทั้งหมดเป็น pure function แบบ deterministic ไม่เรียก network ไม่ใช้
API key

เหตุผล

- unit test นิ่ง — โจทย์ข้อ 7 บังคับให้ทดสอบ extraction logic ถ้าผลลัพธ์
  เปลี่ยนไปทุกครั้งที่รัน test จะกลายเป็น flaky และพิสูจน์อะไรไม่ได้
- ผู้ตรวจ clone แล้ว `npm install && npm run dev` ได้เลย ไม่ต้องหา API key
- สรุปแบบ extractive คือหยิบประโยคที่มีอยู่จริงใน transcript มาใช้
  ไม่มีการแต่งประโยคใหม่ ซึ่งสำคัญกับบันทึกการประชุมมากกว่าความสวยของภาษา

แลกกับอะไร: สรุปอ่านเหมือนตัดตอนจาก transcript ไม่ลื่นเท่า LLM และถ้อยคำที่
ไม่มีใน lexicon จะจับไม่ได้ ถ้าจะต่อยอดไปใช้ LLM จุดต่อคือแทน
`src/lib/extract/**` โดย `ParsedTranscript` → `DistilledMeeting` ยังเป็น
สัญญาเดิม ไม่ต้องแก้ UI, docx, หรือ flags

### 3.2 Next.js เดียว ไม่แยก FE/BE เป็นสอง service

โจทย์ complexity bar ต้องมีทั้ง front end และ back end — ทำด้วย Next.js App
Router ได้ทั้งคู่ในภาษาเดียว repo เดียว คำสั่งเดียว ไม่ต้องตั้ง CORS ไม่ต้องมี
test runner สองตัว ไม่ต้องมี CI สองสาย

ถ้าแยก FastAPI + React จะได้ความเป็นอิสระของ service มาแลกกับเวลา setup ที่
สูงขึ้นมาก ซึ่งไม่ได้ช่วยให้ requirement ข้อใดผ่านเพิ่ม

### 3.3 `src/lib/**` ต้องเป็น pure function ล้วน

route handler แค่แกะ request แล้วเรียก `src/lib` — ไม่มี business logic ใน
route หรือใน React component เลย ทำให้ทุกอย่างที่โจทย์บังคับให้ test ได้ ถูก
test ตรงๆ โดยไม่ต้องยิง HTTP หรือเปิด browser

### 3.4 `Topic.lines` เก็บบรรทัดดิบไว้ ไม่ให้ flag อ่านจาก summary

ตอนแรก `unresolvedCriticalDate` อ่านจาก `topic.summary` แล้ว test fail จริง
เพราะ summary เลือกแค่ 3 ประโยค ทำให้บรรทัดที่มีคำว่า "go-live" หลุดไป

บทเรียนคือ summary เป็นข้อมูลที่ **ตั้งใจให้ lossy** จะเอามาใช้ตรวจสอบไม่ได้
จึงเพิ่ม `Topic.lines` ที่เป็นบรรทัด verbatim ให้ flagging ใช้ และเขียนกฎนี้ลง
`CLAUDE.md` กับ skill `add-extraction-rule` ไม่ให้พลาดซ้ำ

### 3.5 ไฟล์ที่ไม่มีบทสนทนา ต้องคัดออก ไม่ใช่ flag ว่า "ประชุมไม่มีการตัดสินใจ"

ตอนทดสอบ API ลองยิง `package.json` เข้าไป ระบบรับเข้ามา (เพราะ `.json` อยู่ใน
allow list) แล้วรายงานเป็นการประชุมที่ไม่มีการตัดสินใจ — false positive ชัดเจน

แก้โดย `buildReport` ตัดไฟล์ที่ parse แล้วได้ 0 utterance ออกไปใส่ `skipped`
และ `/api/process` ตอบ 400 ถ้าไม่เหลือ transcript ที่อ่านได้เลย มี regression
test คุมสองเคส (ไฟล์เดียว และ batch ผสม)

### 3.6 วันที่แสดงตามที่เขียนใน transcript ไม่แปลงเป็นวันจริง

`ภายในวันศุกร์` / `by Friday` แสดงเป็น `ศุกร์` / `Friday` ไม่แปลงเป็น
`2026-08-28` เพราะ transcript ไม่ได้บอกวันประชุมเสมอไป ถ้าเดาแล้วผิดจะอันตราย
กว่าไม่เดา — เป็น requirement ที่เลือกตีความแบบแคบ และบันทึกไว้ที่หัวข้อ
Assumptions

### 3.7 flag ผิดพลาดฝั่ง "รายงานเกิน" ดีกว่า "เงียบ"

`CONFLICTING_DUE_DATES` จับกลุ่มด้วย subject keyword แบบหยาบ งานสองเรื่องที่
คนละเรื่องแต่ใช้คำเดียวกันอาจถูกรายงานได้ ยอมรับไว้ เพราะ issue ทุกตัวแนบ
`evidence` ให้คนตรวจอ่านแล้วปิดเองได้ แต่ conflict ที่หลุดไปเงียบๆ ไม่มีใครรู้

### 3.8 lexicon รวมศูนย์ที่ไฟล์เดียว

cue ภาษาไทยและอังกฤษทั้งหมดอยู่ใน `src/lib/extract/lexicon.ts` เท่านั้น
ห้าม inline keyword ที่อื่น เพราะความผิดพลาดที่เกิดซ้ำที่สุดคือเพิ่ม cue
อังกฤษแล้วลืมไทย การรวมไว้ที่เดียวทำให้เห็นคู่ของมันในบรรทัดข้างกัน

### 3.9 ไม่มี persistence ไม่มี database

ประมวลผลใน memory ต่อ request เดียว โจทย์ไม่ได้ขอ history หรือ multi-user
การเพิ่ม DB จะเพิ่ม migration + fixture + teardown ให้ test โดยไม่ทำให้
requirement ข้อไหนผ่านเพิ่ม

### 3.10 ไม่ใช้ CSS framework

เขียน CSS ธรรมดาใน `src/app/globals.css` ไฟล์เดียว งานนี้เป็นหน้าเดียว
เน้นตารางกับผลลัพธ์ การเพิ่ม Tailwind toolchain เข้ามาไม่ได้ทำให้เร็วขึ้นและ
เพิ่มจุดพังตอน build

---

## 4. Claude instructions — `CLAUDE.md` (Part 2)

`CLAUDE.md` อยู่ที่ repo root และถูกเขียน **ก่อน** โค้ดบรรทัดแรก มีเนื้อหา
ครบตามที่โจทย์กำหนด: tech stack, coding style, directory layout, command สำหรับ
run test/lint และ rules ที่ต้องทำเสมอ / ห้ามทำ

rule ที่ตั้งไว้แล้วช่วยจริงระหว่างทำงาน

| Rule | ช่วยอะไร |
| --- | --- |
| business logic ต้องอยู่ใน `src/lib/**` เป็น pure function | ทำให้เขียน unit test ได้โดยไม่ต้อง mock HTTP หรือ browser เลย |
| cue อยู่ใน `lexicon.ts` ที่เดียว รองรับไทย+อังกฤษคู่กัน | กัน bug "เพิ่มอังกฤษลืมไทย" ที่เกิดขึ้นได้ง่ายมาก |
| เพิ่ม format ใหม่ต้องมี fixture + detection test | กันการเพิ่ม parser แล้วลืมต่อ detector |
| ห้ามแก้ fixture ให้ test ผ่าน | บังคับให้ไปแก้ parser จริง |
| requirement กำกวมให้ตีความแบบแคบ แล้วจดไว้ที่ README | เป็นที่มาของหัวข้อ Assumptions ข้างล่าง |
| `npm run verify` ก่อนถือว่าเสร็จ | จับ bug regex non-global กับ flag ที่อ่าน summary ได้ทันที |

### การแก้ `CLAUDE.md` ระหว่างทำ assignment

แก้ 1 ครั้ง หลังจากเจอบั๊กในหัวข้อ 3.4 — เพิ่มบรรทัดว่า flagging ต้องอ่าน
`Topic.lines` (verbatim) ไม่ใช่ `Topic.summary` ที่ lossy

เหตุผลที่แก้: เป็นข้อจำกัดของ design ที่เพิ่งค้นพบจาก test ที่ fail จริง ไม่ใช่
การผ่อนกฎให้ตัวเองทำงานง่ายขึ้น ถ้าไม่เขียนลงไป คนที่มาแก้ทีหลัง (หรือ Claude
รอบถัดไป) จะพลาดซ้ำแบบเดียวกัน

---

## 5. Skills ที่สร้าง (Part 3)

skill ทั้งสามตัวสร้างขึ้นจากงานซ้ำที่ **เกิดขึ้นจริง** ระหว่างทำ assignment นี้
ไม่ได้เดาไว้ล่วงหน้า

### 5.1 `.claude/skills/add-transcript-format/`

เหตุผล: การเพิ่ม transcript format หนึ่งรูปแบบต้องแตะ 4 จุดทุกครั้ง — fixture,
parser, `FormatId`, branch ใน `detectFormat` และ `parseTranscript` บวก test
อีก 3 แบบ ทำซ้ำ 4 รอบระหว่างทำ requirement ข้อ 2 และรอบที่พลาดคือลืมต่อ
detector ทำให้ parser ที่เขียนเสร็จแล้วไม่มีอะไรเรียกใช้

skill นี้มีลำดับขั้น + checklist และย้ำเรื่อง **ลำดับความสำคัญของ branch**
ใน detector (signature ที่เฉพาะเจาะจงต้องมาก่อน heuristic แบบ ratio เสมอ)

จะได้ใช้ต่อทันทีเมื่อได้ sample data จริงจากโจทย์ ซึ่งรูปแบบอาจไม่ตรงกับ
fixture 4 ตัวที่ทำไว้

### 5.2 `.claude/skills/add-extraction-rule/`

เหตุผล: การจูน cue เกิดขึ้นหลายรอบ และมีกับดักเดิมซ้ำ 2 อย่าง — เพิ่ม cue
อังกฤษแล้วลืมไทย, และขยาย decision cue แล้วทำให้ประโยคปฏิเสธ
("ยังไม่ได้ข้อสรุป") กลายเป็น decision

skill นี้บอกว่าแต่ละอย่างแก้ที่ไฟล์ไหน บังคับให้เขียน test ที่ fail ก่อน และ
บังคับให้มี test ทั้งเคสบวกและเคสลบ เพราะ rule ที่ยิงทุกครั้งก็ทำให้ test ผ่าน
ได้เหมือนกัน พร้อมย้ำว่า `DUE_PATTERNS` เรียงลำดับสำคัญ และ flagging อ่าน
`Topic.lines` ไม่ใช่ summary

### 5.3 `.claude/skills/spec-doc/`

เหตุผล: Part 4 ต้องสร้างเอกสาร 3 ชุด (SRS, Unit Test Case, SIT/UAT) ที่อ้าง
requirement id, ชื่อ test และ issue code ชุดเดียวกัน เขียนจากความจำแล้วเอกสาร
จะไม่ตรงกับโค้ด ซึ่งแย่กว่าไม่มีเอกสาร

skill นี้ระบุ "source of truth" ของเนื้อหาแต่ละส่วนว่าให้ไป `grep` จากไฟล์ไหน
บังคับให้ทุกแถวของตาราง test case อ้างชื่อ test ที่มีอยู่จริง และถ้า
requirement ไหนไม่มี test คุม ให้ใส่แถวว่า `NOT COVERED` ไม่ใช่ตัดแถวออกเงียบๆ
(ดูผลได้ที่ `docs/UnitTestCases.md` §10 ซึ่งมีแถว "Partially covered" จริง)

---

## 6. Assumptions

ข้อที่ต้องยืนยันกับผู้ออกโจทย์ หรือที่ตีความแบบแคบไว้

| # | เรื่อง | สิ่งที่ทำ |
| --- | --- | --- |
| 1 | **ไฟล์ sample data ที่โจทย์แนบไว้ยังไม่ได้รับ** | ออกแบบ 4 format จากตัว brief และสร้าง fixture ขึ้นเองใน `tests/fixtures/` (ไทย / อังกฤษ / ผสม) — สถาปัตยกรรมทำเป็น pluggable ไว้แล้ว เมื่อได้ไฟล์จริงมาให้ทำตาม skill `add-transcript-format` คือเพิ่ม fixture + parser + detector branch ไม่ต้องรื้อ |
| 2 | โจทย์บอก "อย่างน้อย 3 รูปแบบ" | ทำ 4 รูปแบบ เพื่อกันกรณีที่ sample จริงมีรูปแบบที่ไม่ตรงกับที่เดาไว้ |
| 3 | รูปแบบเอกสาร Part 4 (Word หรือ Markdown) — บรรทัดในโจทย์ถูกตัด | ทำเป็น Markdown ใน `docs/` เพราะ diff ได้และ regenerate ง่าย ถ้าต้องการ `.docx` แปลงจากไฟล์เดิมได้ |
| 4 | E2E framework — โจทย์ระบุ "P..." | ใช้ Playwright ตามที่โจทย์น่าจะหมายถึง |
| 5 | นิยามของ "action item ที่ขัดแย้งหรือไม่สอดคล้องกัน" | ตีความเป็น 3 แบบแยกกัน: กำหนดเวลาชนกันบนงานเรื่องเดียวกัน, ไม่มีผู้รับผิดชอบ, ผู้รับผิดชอบไม่ชัดเจน |
| 6 | ไม่มีการกำหนด limit ของ upload | ตั้งเอง 25 ไฟล์ / 2 MB ต่อไฟล์ ปรับได้ที่ `src/lib/upload.ts` |
| 7 | ไม่มีการกำหนด authentication / persistence / deployment | ถือว่าอยู่นอก scope รันบน local ตามที่โจทย์ระบุ |
| 8 | วันประชุมไม่ได้อยู่ใน transcript ทุกไฟล์ | ไม่แปลงวันแบบ relative เป็นวันจริง (ดูหัวข้อ 3.6) |

---

## 7. Project structure

```
.
├── CLAUDE.md                       # Part 2 — คำสั่งสำหรับ Claude Code
├── README.md                       # ไฟล์นี้
├── .claude/skills/                 # Part 3 — 3 skills
│   ├── add-transcript-format/SKILL.md
│   ├── add-extraction-rule/SKILL.md
│   └── spec-doc/SKILL.md
├── docs/                           # Part 4
│   ├── SRS.md
│   ├── UnitTestCases.md
│   └── SIT-UAT-Cases.md
├── src/
│   ├── app/
│   │   ├── page.tsx                # UI ทั้งหน้า (upload / process / display / download)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── process/route.ts    # POST multipart -> DistillReport
│   │       └── export/route.ts     # POST report -> .docx
│   └── lib/
│       ├── types.ts                # data contract
│       ├── upload.ts               # validation ของไฟล์ที่อัปโหลด
│       ├── flags.ts                # requirement 4
│       ├── docx.ts                 # requirement 6
│       ├── parsers/
│       │   ├── detect.ts           # auto-detect + dispatch
│       │   ├── speaker.ts  markdown.ts  vtt.ts  json.ts
│       │   ├── header.ts  util.ts
│       └── extract/
│           ├── index.ts            # orchestrator: file -> DistillReport
│           ├── lexicon.ts          # cue ไทย+อังกฤษทั้งหมด
│           ├── topics.ts  participants.ts  decisions.ts
│           ├── actions.ts  summary.ts  text.ts
├── tests/
│   ├── fixtures/                   # transcript 5 ไฟล์ ครอบ 4 format
│   ├── detect.test.ts  extract.test.ts  flags.test.ts  docx.test.ts
└── e2e/
    └── distill.spec.ts             # Playwright 5 scenario
```

---

## 8. Data flow

```
ไฟล์ที่อัปโหลด (n ไฟล์)
   |
   |  readUploads()          ตรวจนามสกุล / ขนาด / ไฟล์ว่าง
   v
InputFile[]
   |
   |  detectFormat()         ดูจากเนื้อหาไฟล์ ไม่ถามผู้ใช้
   |  parseTranscript()
   v
ParsedTranscript            speaker / heading / time / text
   |
   |  extractTopics()  extractParticipants()
   |  extractDecisions()  extractActionItems()  summarize*()
   v
DistilledMeeting
   |
   |  flagIssues()           อ่าน Topic.lines (verbatim)
   v
DistillReport               + byOwner, unassigned, skipped
   |                \
   |                 \  buildDocx()
   v                  v
browser (3 บล็อก)      .docx download
```

---

## 9. สิ่งที่อยู่นอก scope

| เรื่อง | เหตุผล |
| --- | --- |
| Authentication / multi-user | โจทย์ไม่ได้ระบุ และรันบน local |
| Database / ประวัติการประมวลผล | ไม่มี requirement เรื่อง history |
| Audio / video → text | โจทย์ให้ transcript เป็น input |
| Deployment / Docker / CI pipeline | โจทย์ระบุแค่ให้รันบน local computer ได้ |
| PDF / Excel export | โจทย์ระบุ MS Word |
| การแปลงวัน relative เป็นวันจริง | ดูหัวข้อ 3.6 และ Assumptions ข้อ 8 |
| i18n ของตัว UI | UI เป็นไทย/อังกฤษผสมตามข้อความในโจทย์ ไม่มี requirement เรื่องสลับภาษา |

---

## 10. สถานะการทดสอบล่าสุด

| ชุด | ผล |
| --- | --- |
| `npm run typecheck` | ผ่าน |
| `npm test` | 42 tests / 4 files ผ่านทั้งหมด |
| `npm run build` | ผ่าน |
| `POST /api/process` (5 fixture + 1 ไฟล์ไม่ใช่ transcript) | 200 — 5 meetings, 1 skipped, ครบทั้ง 6 issue code |
| `POST /api/export` | 200 — `.docx` 12 KB, 8 ตาราง, ภาษาไทยไม่เพี้ยน |
| `npm run test:e2e` | ยังไม่ได้รันในสภาพแวดล้อมที่เตรียมโปรเจคนี้ เพราะ Playwright ต้องดาวน์โหลด browser binary — รันได้ด้วย `npx playwright install && npm run test:e2e` |
