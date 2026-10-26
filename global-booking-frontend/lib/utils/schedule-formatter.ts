export interface DaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
  maxPatients?: number;
}

export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekDayName = (typeof WEEK_DAYS)[number];

export const DAY_SHORT_NAMES: Record<WeekDayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/**
 * Normalizes day name or date to standard WeekDayName
 */
export function getDayOfWeekFromDate(dateStr: string): WeekDayName | "" {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return "";
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const name = dt.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  if (WEEK_DAYS.includes(name as WeekDayName)) {
    return name as WeekDayName;
  }
  return "";
}

/**
 * Formats a list of consecutive or non-consecutive day names into an abbreviated string.
 * e.g. ["Monday", "Tuesday", "Wednesday", "Thursday"] -> "Mon – Thu"
 * e.g. ["Tuesday", "Thursday"] -> "Tue, Thu"
 * e.g. ["Saturday"] -> "Sat"
 */
function formatDayGroupNames(days: WeekDayName[]): string {
  if (days.length === 0) return "";
  if (days.length === 1 && days[0]) return DAY_SHORT_NAMES[days[0]];

  // Check if days form a continuous span in WEEK_DAYS
  const indices = days.map((d) => WEEK_DAYS.indexOf(d)).sort((a, b) => a - b);
  const isContinuous =
    indices.length > 2 &&
    indices.every((val, idx) => idx === 0 || val === (indices[idx - 1] ?? 0) + 1);

  if (isContinuous) {
    const firstDay = WEEK_DAYS[indices[0] ?? 0];
    const lastDay = WEEK_DAYS[indices[indices.length - 1] ?? 0];
    if (firstDay && lastDay) {
      return `${DAY_SHORT_NAMES[firstDay]} – ${DAY_SHORT_NAMES[lastDay]}`;
    }
  }

  return days.map((d) => DAY_SHORT_NAMES[d]).join(", ");
}

/**
 * Synthesizes a human-readable visiting schedule string from a doctor's weekly schedule matrix.
 * Example 1 (User's case: Tue/Thu 5-9 PM, Sat 10-4 PM):
 *   -> "Tue, Thu: 05:00 PM – 09:00 PM, Sat: 10:00 AM – 04:00 PM"
 * Example 2 (Weekdays 9 AM - 6 PM):
 *   -> "Mon – Fri: 09:00 AM – 06:00 PM"
 * Example 3 (Daily):
 *   -> "Daily: 05:00 AM – 09:00 PM"
 * Example 4 (All closed):
 *   -> "Closed / Off-Duty"
 */
export function formatVisitingScheduleSummary(
  schedule?: Record<string, DaySchedule> | null
): string {
  if (!schedule || typeof schedule !== "object") {
    return "Daily 05:00 PM – 09:00 PM";
  }

  const openDays = WEEK_DAYS.filter((d) => schedule[d]?.isOpen);
  if (openDays.length === 0) {
    return "Closed / Off-Duty";
  }

  // Check for common patterns:
  const firstDay = openDays[0];
  const firstSchedule = firstDay ? schedule[firstDay] : undefined;
  if (!firstSchedule) return "Closed / Off-Duty";

  const allSameHours = openDays.every(
    (d) =>
      schedule[d]?.start === firstSchedule.start &&
      schedule[d]?.end === firstSchedule.end
  );

  if (openDays.length === 7 && allSameHours) {
    return `Daily: ${firstSchedule.start} – ${firstSchedule.end}`;
  }

  if (
    openDays.length === 5 &&
    openDays.join(",") === "Monday,Tuesday,Wednesday,Thursday,Friday" &&
    allSameHours
  ) {
    return `Mon – Fri: ${firstSchedule.start} – ${firstSchedule.end}`;
  }

  if (
    openDays.length === 4 &&
    openDays.join(",") === "Monday,Tuesday,Wednesday,Thursday" &&
    allSameHours
  ) {
    return `Mon – Thu: ${firstSchedule.start} – ${firstSchedule.end}`;
  }

  // Group open days by time range:
  const groupsByTime = new Map<string, WeekDayName[]>();
  for (const day of openDays) {
    const s = schedule[day];
    if (!s) continue;
    const timeKey = `${s.start || "09:00 AM"} – ${s.end || "05:00 PM"}`;
    const list = groupsByTime.get(timeKey) || [];
    list.push(day);
    groupsByTime.set(timeKey, list);
  }

  const parts: string[] = [];
  for (const [timeRange, days] of groupsByTime.entries()) {
    const dayLabel = formatDayGroupNames(days);
    parts.push(`${dayLabel}: ${timeRange}`);
  }

  return parts.join(", ");
}

/**
 * Returns structured weekly roster for visual chips / badges display.
 */
export function getWeeklyRosterList(
  schedule?: Record<string, DaySchedule> | null
): {
  day: WeekDayName;
  abbr: string;
  isOpen: boolean;
  hours: string;
  maxPatients?: number;
}[] {
  return WEEK_DAYS.map((day) => {
    const s = schedule?.[day];
    const isOpen = Boolean(s?.isOpen);
    const hours = isOpen && s ? `${s.start} – ${s.end}` : "OFF";
    return {
      day,
      abbr: DAY_SHORT_NAMES[day],
      isOpen,
      hours,
      ...(s?.maxPatients !== undefined ? { maxPatients: s.maxPatients } : {}),
    };
  });
}

/**
 * Calculates the next upcoming YYYY-MM-DD date for a given week day name.
 */
export function getNextDateForDayOfWeek(targetDayName: string, fromDateStr?: string): string {
  const dayIndexMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetIdx = dayIndexMap[targetDayName];
  if (targetIdx === undefined) return "";

  let baseDate = new Date();
  if (fromDateStr && /^\d{4}-\d{2}-\d{2}$/.test(fromDateStr)) {
    const parts = fromDateStr.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y && m && d) {
      baseDate = new Date(y, m - 1, d);
    }
  }

  const currentIdx = baseDate.getDay();
  let daysAhead = targetIdx - currentIdx;
  if (daysAhead <= 0) {
    daysAhead += 7;
  }
  const resultDate = new Date(baseDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const y = resultDate.getFullYear();
  const m = String(resultDate.getMonth() + 1).padStart(2, "0");
  const d = String(resultDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
