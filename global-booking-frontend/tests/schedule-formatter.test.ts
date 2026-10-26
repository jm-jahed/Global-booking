import test from "node:test";
import assert from "node:assert/strict";
import {
  formatVisitingScheduleSummary,
  getDayOfWeekFromDate,
  getNextDateForDayOfWeek,
  getWeeklyRosterList,
  type DaySchedule,
} from "../lib/utils/schedule-formatter";

test("Schedule Formatter Suite", async (t) => {
  await t.test("1. Returns 'Closed / Off-Duty' when all days are off", () => {
    const allOff: Record<string, DaySchedule> = {
      Monday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Tuesday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Wednesday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Thursday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Friday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Saturday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
      Sunday: { isOpen: false, start: "09:00 AM", end: "05:00 PM" },
    };
    assert.equal(formatVisitingScheduleSummary(allOff), "Closed / Off-Duty");
  });

  await t.test("2. Formats all 7 days with identical hours as Daily", () => {
    const daily: Record<string, DaySchedule> = {
      Monday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Tuesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Wednesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Thursday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Friday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Saturday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
      Sunday: { isOpen: true, start: "05:00 AM", end: "09:00 PM" },
    };
    assert.equal(formatVisitingScheduleSummary(daily), "Daily: 05:00 AM – 09:00 PM");
  });

  await t.test("3. Formats Mon - Thu identical hours cleanly", () => {
    const monThu: Record<string, DaySchedule> = {
      Monday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Tuesday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Wednesday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Thursday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Friday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Saturday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Sunday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
    };
    assert.equal(formatVisitingScheduleSummary(monThu), "Mon – Thu: 05:00 PM – 09:00 PM");
  });

  await t.test("4. Formats user's exact schedule (Tue/Thu 5-9 PM, Sat 10-4 PM, Mon/Wed/Fri/Sun OFF)", () => {
    const userSchedule: Record<string, DaySchedule> = {
      Monday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Tuesday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Wednesday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Thursday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Friday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Saturday: { isOpen: true, start: "10:00 AM", end: "04:00 PM" },
      Sunday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
    };
    const summary = formatVisitingScheduleSummary(userSchedule);
    assert.equal(summary, "Tue, Thu: 05:00 PM – 09:00 PM, Sat: 10:00 AM – 04:00 PM");
  });

  await t.test("5. getDayOfWeekFromDate correctly resolves day of week without UTC shift", () => {
    // 2026-10-26 is a Monday
    assert.equal(getDayOfWeekFromDate("2026-10-26"), "Monday");
    // 2026-10-27 is a Tuesday
    assert.equal(getDayOfWeekFromDate("2026-10-27"), "Tuesday");
    // 2026-10-31 is a Saturday
    assert.equal(getDayOfWeekFromDate("2026-10-31"), "Saturday");
  });

  await t.test("6. getNextDateForDayOfWeek finds upcoming dates accurately", () => {
    // From 2026-10-26 (Monday), next Tuesday should be 2026-10-27
    const nextTue = getNextDateForDayOfWeek("Tuesday", "2026-10-26");
    assert.equal(nextTue, "2026-10-27");
    // From 2026-10-26 (Monday), next Saturday should be 2026-10-31
    const nextSat = getNextDateForDayOfWeek("Saturday", "2026-10-26");
    assert.equal(nextSat, "2026-10-31");
  });

  await t.test("7. getWeeklyRosterList returns 7 days with accurate open/off status", () => {
    const sched: Record<string, DaySchedule> = {
      Monday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Tuesday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Wednesday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Thursday: { isOpen: true, start: "05:00 PM", end: "09:00 PM" },
      Friday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
      Saturday: { isOpen: true, start: "10:00 AM", end: "04:00 PM" },
      Sunday: { isOpen: false, start: "09:00 AM", end: "01:00 PM" },
    };
    const roster = getWeeklyRosterList(sched);
    assert.equal(roster.length, 7);
    assert.equal(roster[0]?.day, "Monday");
    assert.equal(roster[0]?.isOpen, false);
    assert.equal(roster[0]?.hours, "OFF");
    assert.equal(roster[1]?.day, "Tuesday");
    assert.equal(roster[1]?.isOpen, true);
    assert.equal(roster[1]?.hours, "05:00 PM – 09:00 PM");
  });
});
