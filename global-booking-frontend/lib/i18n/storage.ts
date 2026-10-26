import { DEFAULT_LOCALE, isValidLocale } from "./locales";
import type { Locale } from "./types";

export const LOCALE_COOKIE_NAME = "gb_locale";
export const LOCALE_STORAGE_KEY = "gb_locale_preference";
export const LOCALE_CHANGE_EVENT = "gb_locale_change";

/**
 * Retrieves the persisted user locale preference.
 * Resolution hierarchy:
 * 1. Document cookie (SSR/client unified)
 * 2. localStorage
 * 3. DEFAULT_LOCALE (Bangla 'bn')
 */
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  // 1. Read Cookie
  try {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${LOCALE_COOKIE_NAME}=`)) {
        const val = cookie.substring(LOCALE_COOKIE_NAME.length + 1).trim();
        if (isValidLocale(val)) {
          return val;
        }
      }
    }
  } catch {
    // Ignore cookie read failures in restricted environments
  }

  // 2. Read LocalStorage
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isValidLocale(stored)) {
      return stored;
    }
  } catch {
    // Ignore localStorage read failures
  }

  // 3. Fallback strictly to Bangla
  return DEFAULT_LOCALE;
}

/**
 * Persists user's explicit locale preference across cookies, localStorage, and dispatches broadcast event.
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined" || !isValidLocale(locale)) return;

  // 1. Write Cookie (1 year lifetime, Lax)
  try {
    const maxAgeSeconds = 365 * 24 * 60 * 60;
    const isSecure = window.location.protocol === "https:";
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(
      locale,
    )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  } catch {
    // Ignore cookie write failures
  }

  // 2. Write LocalStorage
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage write failures
  }

  // 3. Update DOM document element attributes synchronously
  try {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" || locale === "ur" || locale === "fa" ? "rtl" : "ltr";
  } catch {
    // Ignore DOM attribute update failures
  }

  // 4. Dispatch browser custom event for immediate reactive re-renders
  try {
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
  } catch {
    // Ignore event dispatch errors
  }
}
