import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CHAMBER_TIMEZONE,
  isValidIanaTimezone,
  resolveChamberTimezone,
  getChamberLocalHour,
  formatChamberClock,
  getChamberBusinessDate,
  formatIsoToDDMMYYYY,
  parseDDMMYYYYToIso,
  shiftDateIso,
} from "../lib/utils/timezone";

/* =========================================================================
   CHAMBER TIMEZONE & LOCAL DATE SUITE
   ========================================================================= */

test("DEFAULT_CHAMBER_TIMEZONE is Asia/Dubai", () => {
  assert.equal(DEFAULT_CHAMBER_TIMEZONE, "Asia/Dubai");
});

test("isValidIanaTimezone validates real-world IANA identifiers", () => {
  assert.equal(isValidIanaTimezone("Asia/Dubai"), true);
  assert.equal(isValidIanaTimezone("Asia/Dhaka"), true);
  assert.equal(isValidIanaTimezone("America/New_York"), true);
  assert.equal(isValidIanaTimezone("Europe/London"), true);
  assert.equal(isValidIanaTimezone("UTC"), true);

  // Invalid candidates
  assert.equal(isValidIanaTimezone(""), false);
  assert.equal(isValidIanaTimezone("   "), false);
  assert.equal(isValidIanaTimezone("Invalid/Timezone"), false);
  assert.equal(isValidIanaTimezone("GMT+4"), false);
  assert.equal(isValidIanaTimezone(null), false);
  assert.equal(isValidIanaTimezone(undefined), false);
  assert.equal(isValidIanaTimezone(12345), false);
});

test("resolveChamberTimezone defaults safely to Asia/Dubai on invalid or missing input", () => {
  assert.equal(resolveChamberTimezone("Asia/Dubai"), "Asia/Dubai");
  assert.equal(resolveChamberTimezone("Asia/Dhaka"), "Asia/Dhaka");
  assert.equal(resolveChamberTimezone("  Asia/Dhaka  "), "Asia/Dhaka");

  // Fallbacks
  assert.equal(resolveChamberTimezone(undefined), "Asia/Dubai");
  assert.equal(resolveChamberTimezone(null), "Asia/Dubai");
  assert.equal(resolveChamberTimezone(""), "Asia/Dubai");
  assert.equal(resolveChamberTimezone("Fake/Timezone"), "Asia/Dubai");
  assert.equal(resolveChamberTimezone(999), "Asia/Dubai");
});

test("getChamberLocalHour distinguishes Asia/Dubai (UTC+4) and Asia/Dhaka (UTC+6) correctly", () => {
  // Reference: 2026-10-23 12:00:00 UTC
  const fixedUtc = new Date("2026-10-23T12:00:00.000Z");

  const dubaiHour = getChamberLocalHour(fixedUtc, "Asia/Dubai");
  const dhakaHour = getChamberLocalHour(fixedUtc, "Asia/Dhaka");

  // 12:00 UTC + 4h = 16 (4 PM in Dubai)
  assert.equal(dubaiHour, 16);

  // 12:00 UTC + 6h = 18 (6 PM in Dhaka)
  assert.equal(dhakaHour, 18);

  // Assert exactly 2 hours difference between Dubai and Dhaka
  assert.equal((dhakaHour ?? 0) - (dubaiHour ?? 0), 2);
});

test("getChamberLocalHour handles midnight rollover in chamber timezone", () => {
  // Reference: 2026-10-23 20:00:00 UTC
  // In Asia/Dubai (UTC+4): 20 + 4 = 24 -> 00:00:00 (midnight of next day)
  const midnightUtc = new Date("2026-10-23T20:00:00.000Z");
  const dubaiMidnightHour = getChamberLocalHour(midnightUtc, "Asia/Dubai");
  assert.equal(dubaiMidnightHour, 0);

  // In Asia/Dhaka (UTC+6): 20 + 6 = 26 -> 02:00:00 (2 AM of next day)
  const dhakaEarlyHour = getChamberLocalHour(midnightUtc, "Asia/Dhaka");
  assert.equal(dhakaEarlyHour, 2);
});

test("getChamberLocalHour returns null safely on missing, empty, or invalid timestamps without throwing", () => {
  assert.equal(getChamberLocalHour(null, "Asia/Dubai"), null);
  assert.equal(getChamberLocalHour(undefined, "Asia/Dubai"), null);
  assert.equal(getChamberLocalHour("", "Asia/Dubai"), null);
  assert.equal(getChamberLocalHour("not-a-valid-date", "Asia/Dubai"), null);
});

test("formatChamberClock formats chamber clock accurately in 12-hour format", () => {
  const fixedUtc = new Date("2026-10-23T12:00:00.000Z");

  const dubaiClock = formatChamberClock("Asia/Dubai", fixedUtc);
  const dhakaClock = formatChamberClock("Asia/Dhaka", fixedUtc);

  assert.equal(dubaiClock.includes("04:00:00 PM") || dubaiClock.includes("4:00:00 PM"), true);
  assert.equal(dhakaClock.includes("06:00:00 PM") || dhakaClock.includes("6:00:00 PM"), true);
});

test("getChamberBusinessDate calculates chamber-local date boundary across timezones", () => {
  // 2026-10-23 21:00:00 UTC
  // In Asia/Dubai (UTC+4): 2026-10-24 01:00:00 -> "2026-10-24"
  // In America/New_York (UTC-4): 2026-10-23 17:00:00 -> "2026-10-23"
  const lateUtc = new Date("2026-10-23T21:00:00.000Z");

  assert.equal(getChamberBusinessDate("Asia/Dubai", lateUtc), "2026-10-24");
  assert.equal(getChamberBusinessDate("America/New_York", lateUtc), "2026-10-23");
});

test("formatIsoToDDMMYYYY converts ISO YYYY-MM-DD to DD-MM-YYYY display", () => {
  assert.equal(formatIsoToDDMMYYYY("2026-10-24"), "24-10-2026");
  assert.equal(formatIsoToDDMMYYYY("20261024"), "24-10-2026");
  assert.equal(formatIsoToDDMMYYYY(""), "");
  assert.equal(formatIsoToDDMMYYYY(null), "");
  assert.equal(formatIsoToDDMMYYYY(undefined), "");
});

test("parseDDMMYYYYToIso parses DD-MM-YYYY display to ISO YYYY-MM-DD", () => {
  assert.equal(parseDDMMYYYYToIso("24-10-2026"), "2026-10-24");
  assert.equal(parseDDMMYYYYToIso("01-01-2026"), "2026-01-01");
  assert.equal(parseDDMMYYYYToIso("2026-10-24"), "2026-10-24");
  assert.equal(parseDDMMYYYYToIso("invalid"), "");
  assert.equal(parseDDMMYYYYToIso(""), "");
  assert.equal(parseDDMMYYYYToIso(null), "");
});

test("shiftDateIso adds and subtracts days correctly across month boundaries", () => {
  assert.equal(shiftDateIso("2026-10-24", 1), "2026-10-25");
  assert.equal(shiftDateIso("2026-10-24", -1), "2026-10-23");
  assert.equal(shiftDateIso("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftDateIso("2026-11-01", -1), "2026-10-31");
});
