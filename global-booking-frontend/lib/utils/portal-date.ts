import {
  DEFAULT_CHAMBER_TIMEZONE,
  getChamberBusinessDate,
  shiftDateIso,
  formatIsoToDDMMYYYY,
  resolveChamberTimezone,
} from "./timezone";

export interface FormattedDateInfo {
  dateKey: string; // YYYY-MM-DD
  dayNum: number; // 1-31
  formattedDate: string; // "25 Oct 2026"
  dayOfWeek: string; // "Sunday"
  shortDayOfWeek: string; // "Sun"
  displayDDMMYYYY: string; // "25-10-2026"
  isToday: boolean;
}

const STORAGE_KEY = "portal_selected_date";

/**
 * Returns the currently active portal business date (YYYY-MM-DD).
 * Reads from sessionStorage if available, falling back to chamber today.
 */
export function getStoredPortalDate(timezone: string = DEFAULT_CHAMBER_TIMEZONE): string {
  const safeTz = resolveChamberTimezone(timezone);
  const chamberToday = getChamberBusinessDate(safeTz);

  if (typeof window === "undefined") {
    return chamberToday;
  }

  // Check URL query param ?date=YYYY-MM-DD first
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
  } catch {
    // Ignore URL parsing errors
  }

  // Check sessionStorage
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return chamberToday;
}

/**
 * Broadcasts a date change to all portal components (Topbar, Dashboard, Live Queue).
 */
export function setStoredPortalDate(dateKey: string, syncUrl: boolean = true): void {
  if (typeof window === "undefined" || !dateKey) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, dateKey);
  } catch {
    // Ignore storage errors
  }

  if (syncUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("date", dateKey);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore history state errors
    }
  }

  try {
    window.dispatchEvent(new CustomEvent("portal_date_change", { detail: dateKey }));
  } catch {
    // Ignore event dispatch errors
  }
}

/**
 * Formats a YYYY-MM-DD date key into rich display details.
 */
export function formatPortalDateInfo(
  dateKey: string,
  timezone: string = DEFAULT_CHAMBER_TIMEZONE,
): FormattedDateInfo {
  const safeTz = resolveChamberTimezone(timezone);
  const chamberToday = getChamberBusinessDate(safeTz);
  const validKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : chamberToday;

  const [y, m, d] = validKey.split("-").map((v) => parseInt(v, 10));
  // Noon avoids timezone offset rollover
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);

  const dayNum = dateObj.getDate();
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const shortDayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const displayDDMMYYYY = formatIsoToDDMMYYYY(validKey);

  return {
    dateKey: validKey,
    dayNum,
    formattedDate,
    dayOfWeek,
    shortDayOfWeek,
    displayDDMMYYYY,
    isToday: validKey === chamberToday,
  };
}
