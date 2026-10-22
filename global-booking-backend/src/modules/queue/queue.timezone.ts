/**
 * GLOBAL BOOKING — Queue Timezone & Local Date Utilities
 * Enforces real-world IANA timezones (e.g. "Asia/Dhaka", "Asia/Dubai").
 * Never falls back to server clock or browser timezone.
 */

/**
 * Validates whether a timezone identifier is a supported, valid IANA timezone.
 */
export function isValidIanaTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the chamber's local business date formatted strictly as "YYYY-MM-DD".
 * Calculates date boundaries strictly in the chamber's configured IANA timezone.
 */
export function getChamberBusinessDate(ianaTimezone: string, referenceDate: Date = new Date()): string {
  if (!isValidIanaTimezone(ianaTimezone)) {
    throw new Error(`Invalid IANA timezone: ${String(ianaTimezone)}`);
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaTimezone.trim(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(referenceDate);
}

/**
 * Formats check-in display time (e.g. "10:30 AM") in the chamber's configured IANA timezone.
 */
export function formatChamberLocalTime(ianaTimezone: string, referenceDate: Date = new Date()): string {
  if (!isValidIanaTimezone(ianaTimezone)) {
    throw new Error(`Invalid IANA timezone: ${String(ianaTimezone)}`);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone.trim(),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return formatter.format(referenceDate);
}
