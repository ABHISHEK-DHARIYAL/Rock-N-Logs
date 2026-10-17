/**
 * Booking date helpers.
 *
 * Customers pick a wall-clock date/time ("2026-10-20" + "19:30"). We store that exact text as
 * `requestedLocal` next to the UTC instant, and show it back unchanged, so a booking never
 * appears on a different day/time because of a timezone difference.
 */
const pad = (n: number) => String(n).padStart(2, "0");

export const MIN_LEAD_MINUTES = 30; // mirrors the server's rule

/** "YYYY-MM-DD" and "HH:mm" in the browser's local time. */
export function toInputParts(date: Date) {
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** The earliest bookable moment (now + lead time, rounded up to the minute). */
export function earliestBooking(now = new Date()) {
  const d = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);
  if (d.getSeconds() > 0 || d.getMilliseconds() > 0) d.setMinutes(d.getMinutes() + 1, 0, 0);
  return d;
}

export const MAX_ADVANCE_DAYS = 180; // mirrors the server's rule

/** Opening hours as parsed by the server from /admin/settings (see backend lib/openingHours). */
export interface HoursWindow {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** Minutes after midnight. `end` above 1440 means it closes after midnight. */
  start: number;
  end: number;
}
export interface BookingSchedule {
  windows: HoursWindow[];
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const minutesToTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return toInputParts(new Date(y, m - 1, d + days)).date;
}

/** Spans (minutes after midnight) in which the restaurant is open on `date`, earliest first. */
export function openSpans(schedule: BookingSchedule, date: string) {
  const day = weekdayOf(date);
  return schedule.windows
    .flatMap((w) => {
      const spans: { start: number; end: number }[] = [];
      if (w.day === day) spans.push({ start: w.start, end: Math.min(w.end, 1440) });
      // A late close from the previous night (e.g. open until 2am) also covers the start of today.
      if (w.day === (day + 6) % 7 && w.end > 1440) spans.push({ start: 0, end: w.end - 1440 });
      return spans;
    })
    .sort((a, b) => a.start - b.start);
}

export function isOpenAt(schedule: BookingSchedule, date: string, time: string) {
  const minutes = toMinutes(time);
  return openSpans(schedule, date).some((span) => minutes >= span.start && minutes < span.end);
}

export function maxBookingDate(now = new Date()) {
  return addDays(toInputParts(now).date, MAX_ADVANCE_DAYS);
}

/**
 * Pre-filled slot: the earliest moment that is both far enough ahead and inside opening hours,
 * rounded up to the next quarter hour. With no (understood) hours it is simply the earliest slot.
 */
export function defaultBookingSlot(now = new Date(), schedule?: BookingSchedule | null) {
  const earliest = earliestBooking(now);
  if (schedule) {
    const start = toInputParts(earliest);
    const startMinutes = toMinutes(start.time);
    for (let i = 0; i <= 14; i++) {
      const date = addDays(start.date, i);
      for (const span of openSpans(schedule, date)) {
        const from = Math.ceil(Math.max(span.start, i === 0 ? startMinutes : 0) / 15) * 15;
        if (from < span.end) return { date, time: minutesToTime(from) };
      }
    }
  }
  const d = new Date(earliest);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toInputParts(d);
}

/** Returns why the chosen date/time can't be booked, or null if it's fine. */
export function validateBookingWhen(
  date: string,
  time: string,
  schedule: BookingSchedule | null,
  openingHours: string | null,
  now = new Date()
): string | null {
  if (!date || !time) return null; // the browser's "required" check handles empty fields
  const when = new Date(`${date}T${time}`);
  if (Number.isNaN(when.getTime())) return "Please choose a valid date and time.";
  if (date < toInputParts(now).date) return "That date has already passed. Please choose today or a later date.";
  if (when.getTime() < earliestBooking(now).getTime()) return `Please choose a time at least ${MIN_LEAD_MINUTES} minutes from now.`;
  if (date > maxBookingDate(now)) return `Bookings can be made up to ${MAX_ADVANCE_DAYS} days in advance.`;
  if (schedule && !isOpenAt(schedule, date, time)) {
    return `We're closed at that time.${openingHours ? ` Our opening hours: ${openingHours}.` : ""} Please choose a time within them.`;
  }
  return null;
}

/** Shows the booking time as the customer typed it; falls back to the stored instant for old bookings. */
export function formatBookingWhen(requestedLocal: string | null | undefined, requestedDate: string): string {
  const match = requestedLocal?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]))
    : new Date(requestedDate);
  return date.toLocaleString();
}
