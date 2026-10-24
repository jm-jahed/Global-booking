/**
 * GLOBAL BOOKING — Chamber Timezone & Local Date Utilities (Frontend)
 *
 * Enforces chamber-specific IANA timezones (e.g. "Asia/Dubai", "Asia/Dhaka").
 * Guarantees that the Doctor Dashboard clock and hourly analytics reflect the
 * chamber's authoritative local time rather than the client device's browser timezone.
 */

export const DEFAULT_CHAMBER_TIMEZONE = "Asia/Dubai";

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
 * Resolves a safe IANA timezone, falling back to DEFAULT_CHAMBER_TIMEZONE ("Asia/Dubai")
 * if the candidate is empty, undefined, or invalid.
 */
export function resolveChamberTimezone(tz: unknown): string {
  if (typeof tz === "string" && isValidIanaTimezone(tz.trim())) {
    return tz.trim();
  }
  return DEFAULT_CHAMBER_TIMEZONE;
}

/**
 * Formats a 12-hour digital clock string (e.g. "04:30:15 PM") in the chamber's IANA timezone.
 */
export function formatChamberClock(ianaTimezone?: string, referenceDate: Date = new Date()): string {
  const safeTz = resolveChamberTimezone(ianaTimezone);
  try {
    return referenceDate.toLocaleTimeString("en-US", {
      timeZone: safeTz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return referenceDate.toLocaleTimeString("en-US", {
      timeZone: DEFAULT_CHAMBER_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
}

/**
 * Extracts the 24-hour integer hour (0-23) of a given timestamp in the chamber's IANA timezone.
 * Returns null if the timestamp is missing, malformed, or invalid. Never throws.
 */
export function getChamberLocalHour(
  dateInput: string | Date | undefined | null,
  ianaTimezone?: string,
): number | null {
  if (!dateInput) return null;
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return null;

  const safeTz = resolveChamberTimezone(ianaTimezone);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return null;
    const rawHour = parseInt(hourPart.value, 10);
    return isNaN(rawHour) ? null : rawHour % 24;
  } catch {
    return null;
  }
}

/**
 * Returns the chamber's local business date formatted strictly as "YYYY-MM-DD".
 * Calculates date boundaries strictly in the chamber's configured IANA timezone.
 */
export function getChamberBusinessDate(
  ianaTimezone?: string,
  referenceDate: Date = new Date(),
): string {
  const safeTz = resolveChamberTimezone(ianaTimezone);
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(referenceDate);
  } catch {
    const fallbackFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_CHAMBER_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fallbackFormatter.format(referenceDate);
  }
}

/**
 * Formats an ISO YYYY-MM-DD date string to canonical DD-MM-YYYY display format.
 * Example: "2026-10-24" -> "24-10-2026"
 */
export function formatIsoToDDMMYYYY(isoDate?: string | null): string {
  if (!isoDate || typeof isoDate !== "string") return "";
  const trimmed = isoDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(6, 8)}-${trimmed.slice(4, 6)}-${trimmed.slice(0, 4)}`;
  }
  return trimmed;
}

/**
 * Parses a DD-MM-YYYY display date into ISO YYYY-MM-DD format.
 * Example: "24-10-2026" -> "2026-10-24"
 * Returns empty string if the input format is invalid.
 */
export function parseDDMMYYYYToIso(displayDate?: string | null): string {
  if (!displayDate || typeof displayDate !== "string") return "";
  const trimmed = displayDate.trim();
  const parts = trimmed.split("-");
  if (parts.length === 3 && parts[0]?.length === 2 && parts[1]?.length === 2 && parts[2]?.length === 4) {
    const [d, m, y] = parts;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return "";
}

/**
 * Safely adds or subtracts days from a YYYY-MM-DD date string.
 * Example: shiftDateIso("2026-10-24", 1) -> "2026-10-25"
 */
export function shiftDateIso(isoDate: string, days: number): string {
  const [y, m, d] = (isoDate || "").split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
