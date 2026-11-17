/** All keyword cues live here. Never inline a cue anywhere else (CLAUDE.md). */

export const DECISION_CUES = [
  // Thai
  "สรุปว่า",
  "สรุปคือ",
  "ตกลง",
  "ได้ข้อสรุป",
  "มีมติ",
  "เคาะ",
  "อนุมัติ",
  "ยืนยันว่า",
  "เลือกใช้",
  "ตัดสินใจ",
  // English
  "we decided",
  "decision:",
  "decided to",
  "we agreed",
  "agreed to",
  "approved",
  "we will go with",
  "final decision",
  "sign off",
  "signed off",
];

export const ACTION_CUES = [
  // Thai
  "มอบหมาย",
  "รับไป",
  "ฝากช่วย",
  "ช่วยทำ",
  "จะทำ",
  "จะส่ง",
  "จะเตรียม",
  "จะแก้",
  "จะตรวจ",
  "ต้องทำ",
  "ต้องส่ง",
  "การบ้าน",
  "งานที่ต้องทำ",
  // English
  "action item",
  "action:",
  "ai:",
  "todo",
  "to-do",
  "will send",
  "will prepare",
  "will fix",
  "will check",
  "will follow up",
  "needs to",
  "responsible for",
  "assigned to",
  "take care of",
];

/** Lines starting with these are treated as an explicit topic boundary. */
export const TOPIC_CUES = [
  "หัวข้อถัดไป",
  "หัวข้อต่อไป",
  "เรื่องต่อไป",
  "วาระที่",
  "วาระถัดไป",
  "ประเด็นถัดไป",
  "next topic",
  "next item",
  "agenda item",
  "moving on to",
  "let's talk about",
  "topic:",
];

/** Owner tokens that look like an assignment but name no individual. */
export const AMBIGUOUS_OWNERS = [
  "ทีม",
  "ทุกคน",
  "ใครก็ได้",
  "ใครสะดวก",
  "ฝ่ายที่เกี่ยวข้อง",
  "someone",
  "anyone",
  "the team",
  "team",
  "everyone",
  "somebody",
  "tbd",
  "n/a",
];

/** Subjects whose scheduling matters; used by UNRESOLVED_DATE_DISCUSSION. */
export const CRITICAL_SUBJECTS = [
  "go-live",
  "go live",
  "golive",
  "cutover",
  "release",
  "deploy",
  "launch",
  "deadline",
  "ขึ้นระบบ",
  "โกลไลฟ์",
  "ปล่อยระบบ",
  "ส่งมอบ",
  "กำหนดส่ง",
];

export const PARTICIPANT_HEADER_KEYS = [
  "attendees",
  "participants",
  "present",
  "ผู้เข้าร่วม",
  "ผู้เข้าประชุม",
  "เข้าร่วม",
];

export const TITLE_HEADER_KEYS = [
  "meeting",
  "title",
  "subject",
  "การประชุม",
  "หัวข้อการประชุม",
  "ชื่อการประชุม",
  "เรื่อง",
];

export const DATE_HEADER_KEYS = ["date", "when", "วันที่", "วัน"];

/** Patterns for a due date written inside a sentence. Order matters:
 *  the most specific pattern is tried first. */
export const DUE_PATTERNS: RegExp[] = [
  /ภายในวันที่\s*([0-9]{1,2}[\/\-. ][0-9]{1,2}(?:[\/\-. ][0-9]{2,4})?)/i,
  /ภายใน(?:วัน)?(จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์|อาทิตย์)(?:นี้|หน้า)?/i,
  /ภายใน\s*(สิ้น(?:เดือน|สัปดาห์|ปี)(?:นี้)?)/i,
  /ภายใน\s*([0-9]+\s*(?:วัน|สัปดาห์|เดือน))/i,
  /กำหนดส่ง\s*([^\s,;]+)/i,
  /\bdue\s*(?:date)?\s*[:\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
  /\bdue\s*(?:date)?\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}(?:[\/\-][0-9]{2,4})?)/i,
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /\bby\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
  /\bby\s+([0-9]{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i,
  /\bby\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+[0-9]{1,2})/i,
  /\b(eod|eow|end of (?:day|week|month|sprint))\b/i,
  /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/,
];

export const THAI_CHAR_G = /[\u0E00-\u0E7F]/g;
