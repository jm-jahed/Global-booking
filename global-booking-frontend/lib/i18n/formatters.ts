import type { Locale } from "./types";
import { DEFAULT_LOCALE } from "./locales";

/**
 * Standard IANA timezones and defaults
 */
export const DEFAULT_TIMEZONE = "Asia/Dubai";

/**
 * Normalizes input date to a valid Date instance
 */
function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Force noon to avoid UTC midnight timezone rollover
    const [y, m, d] = input.split("-").map((v) => parseInt(v, 10));
    return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  }
  return new Date(input);
}

/**
 * Locale-aware calendar date formatter (e.g. "২৬ অক্টোবর ২০২৬" or "26 Oct 2026")
 */
export function formatLocaleDate(
  dateInput: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = toDate(dateInput);
    if (Number.isNaN(d.getTime())) return String(dateInput);
    const resolvedOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    };
    return new Intl.DateTimeFormat(locale, resolvedOptions).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Locale-aware time formatter with explicit chamber timezone preservation
 */
export function formatLocaleTime(
  dateInput: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = toDate(dateInput);
    if (Number.isNaN(d.getTime())) return String(dateInput);
    const resolvedOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
      ...options,
    };
    return new Intl.DateTimeFormat(locale, resolvedOptions).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Locale-aware number formatter (e.g. 1,250 or ১২৫০)
 */
export function formatLocaleNumber(
  num: number | string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    if (typeof num === "string" && num.trim() === "") return "";
    const parsed = typeof num === "number" ? num : Number(num);
    if (typeof parsed !== "number" || Number.isNaN(parsed)) return String(num ?? "");
    return new Intl.NumberFormat(locale, options).format(parsed);
  } catch {
    return String(num ?? "");
  }
}


/**
 * Safe currency formatter preserving exact numeric value
 * Note: Does not perform exchange conversion.
 */
export function formatLocaleCurrency(
  amount: number,
  locale: Locale = DEFAULT_LOCALE,
  currencyCode: string = "AED",
): string {
  try {
    if (typeof amount !== "number" || Number.isNaN(amount)) return `0 ${currencyCode}`;
    const formattedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

    // Native Bangla symbol placement
    if (locale === "bn") {
      return `${formattedNum} ${currencyCode}`;
    }
    return `${currencyCode} ${formattedNum}`;
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

/**
 * Returns localized weekday name for a given ISO date (YYYY-MM-DD)
 */
export function getLocalizedWeekday(
  dateStr: string,
  locale: Locale = DEFAULT_LOCALE,
  weekdayFormat: "long" | "short" | "narrow" = "long",
): string {
  try {
    const d = toDate(dateStr);
    return new Intl.DateTimeFormat(locale, { weekday: weekdayFormat }).format(d);
  } catch {
    return "";
  }
}
