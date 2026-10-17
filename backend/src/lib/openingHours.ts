/**
 * Opening hours: turns the free-text "Opening hours" from /admin/settings
 * (e.g. "Tue–Sun, 5pm–11pm" or "Mon–Fri 11am–10pm; Sat–Sun 10am–midnight") into a structured
 * schedule so bookings can be limited to the times the restaurant is actually open.
 *
 * Deliberately tolerant: if the text can't be understood, parseOpeningHours returns null and
 * the caller must NOT restrict bookings (a typo in settings should never block every order).
 */

export interface HoursWindow {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** Minutes after midnight that this day's window opens. */
  start: number;
  /** Minutes after midnight that it closes. Above 1440 means it closes after midnight (next day). */
  end: number;
}

export interface BookingSchedule {
  windows: HoursWindow[];
}

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const DAY = "(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*";
const DAY_PART = `${DAY}(?:\\s*-\\s*${DAY})?`;
const DAY_SPEC = `(?:daily|every\\s*day|everyday|all\\s*days|${DAY_PART}(?:\\s*(?:,|&|and|/)\\s*${DAY_PART})*)`;
const TIME = "\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?";
const TIME_RANGE = `${TIME}\\s*-\\s*${TIME}`;
const GROUP_RE = new RegExp(`(${DAY_SPEC})\\s*[,:]?\\s*(${TIME_RANGE}(?:\\s*(?:,|&|and)\\s*${TIME_RANGE})*)`, "g");
const RANGE_CAPTURE_RE = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/\b([ap])\.m\.?/g, "$1m")
    .replace(/\bmidnight\b/g, "12am")
    .replace(/\bnoon\b/g, "12pm")
    .replace(/\b(?:to|until|till)\b/g, "-");
}

function toMinutes(hour: number, minute: number, meridiem: string | undefined): number {
  const h = meridiem ? (hour % 12) + (meridiem === "pm" ? 12 : 0) : hour;
  return h * 60 + minute;
}

function parseRange(match: RegExpMatchArray): { start: number; end: number } | null {
  const [, sh, sm = "0", sMer, eh, em = "0", eMer] = match;
  const startHour = Number(sh), endHour = Number(eh), startMin = Number(sm), endMin = Number(em);
  if (startMin > 59 || endMin > 59) return null;
  if (sMer ? startHour < 1 || startHour > 12 : startHour > 24) return null;
  if (eMer ? endHour < 1 || endHour > 12 : endHour > 24) return null;

  let start: number;
  let end: number;
  if (sMer || eMer) {
    // "5-11pm": the unmarked side borrows the other's am/pm, flipping if that would run backwards.
    const sideMer = (mer: string | undefined, other: string | undefined) => mer ?? other;
    start = toMinutes(startHour, startMin, sideMer(sMer, eMer));
    end = toMinutes(endHour, endMin, sideMer(eMer, sMer));
    if (!sMer && start >= end) start = toMinutes(startHour, startMin, eMer === "pm" ? "am" : "pm");
  } else {
    start = toMinutes(startHour, startMin, undefined);
    end = toMinutes(endHour, endMin, undefined);
  }
  if (end === start) return null;
  if (end < start) end += 1440; // closes after midnight, e.g. 6pm-2am
  return { start, end };
}

function expandDays(spec: string): number[] {
  if (/daily|every\s*day|everyday|all\s*days/.test(spec)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  for (const part of spec.split(/,|&|\band\b|\//)) {
    const names = part.match(/(mon|tue|wed|thu|fri|sat|sun)[a-z]*/g)?.map((n) => DAY_INDEX[n.slice(0, 3)]) ?? [];
    if (names.length === 2 && part.includes("-")) {
      for (let d = names[0]; ; d = (d + 1) % 7) {
        days.add(d);
        if (d === names[1]) break;
      }
    } else {
      names.forEach((d) => days.add(d));
    }
  }
  return [...days];
}

export function parseOpeningHours(text: string | null | undefined): BookingSchedule | null {
  if (!text || !text.trim()) return null;
  const input = normalise(text);
  const windows: HoursWindow[] = [];

  for (const group of input.matchAll(GROUP_RE)) {
    const days = expandDays(group[1]);
    for (const range of group[2].matchAll(RANGE_CAPTURE_RE)) {
      const parsed = parseRange(range);
      if (parsed) days.forEach((day) => windows.push({ day, ...parsed }));
    }
  }

  // No day names at all ("5pm-11pm"): the same hours every day.
  if (windows.length === 0 && !new RegExp(DAY).test(input)) {
    for (const range of input.matchAll(RANGE_CAPTURE_RE)) {
      const parsed = parseRange(range);
      if (parsed) for (let day = 0; day < 7; day++) windows.push({ day, ...parsed });
    }
  }
  return windows.length > 0 ? { windows } : null;
}

/** `local` is the wall-clock time the customer picked, "YYYY-MM-DDTHH:mm" (no timezone). */
export function isOpenAt(schedule: BookingSchedule, local: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return false;
  const [, y, mo, d, h, mi] = match.map(Number);
  const day = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const minutes = h * 60 + mi;
  return schedule.windows.some(
    (w) =>
      (w.day === day && minutes >= w.start && minutes < Math.min(w.end, 1440)) ||
      (w.day === (day + 6) % 7 && w.end > 1440 && minutes < w.end - 1440)
  );
}

function clock(minutes: number): string {
  const m = minutes % 1440;
  const h24 = Math.floor(m / 60);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m % 60).padStart(2, "0")} ${suffix}`;
}

/** Human-readable summary of what was understood, e.g. "Tue–Sun 5:00 PM–11:00 PM". */
export function describeSchedule(schedule: BookingSchedule): string {
  const byDay = DISPLAY_ORDER.map((day) =>
    schedule.windows
      .filter((w) => w.day === day)
      .sort((a, b) => a.start - b.start)
      .map((w) => `${clock(w.start)}–${clock(w.end)}`)
      .join(", ")
  );
  const parts: string[] = [];
  for (let i = 0; i < 7; ) {
    if (!byDay[i]) { i++; continue; }
    let j = i;
    while (j + 1 < 7 && byDay[j + 1] === byDay[i]) j++;
    const first = DAY_LABEL[DISPLAY_ORDER[i]];
    const last = DAY_LABEL[DISPLAY_ORDER[j]];
    parts.push(`${i === j ? first : `${first}–${last}`} ${byDay[i]}`);
    i = j + 1;
  }
  return parts.join("; ");
}
