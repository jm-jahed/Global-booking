/**
 * GLOBAL BOOKING — Shared Multilingual System Types
 * Enterprise-grade Type-Safe Localization Architecture
 */

export type Locale =
  | "bn" // বাংলা (Bangla) — DEFAULT
  | "en" // English
  | "ar" // العربية (Arabic) — RTL
  | "hi" // हिन्दी (Hindi)
  | "ur" // اردو (Urdu) — RTL
  | "es" // Español (Spanish)
  | "fr" // Français (French)
  | "pt" // Português (Portuguese)
  | "zh-CN" // 中文简体 (Simplified Chinese)
  | "zh-TW" // 中文繁體 (Traditional Chinese)
  | "ja" // 日本語 (Japanese)
  | "ko" // 한국어 (Korean)
  | "ru" // Русский (Russian)
  | "de" // Deutsch (German)
  | "it" // Italiano (Italian)
  | "tr" // Türkçe (Turkish)
  | "id" // Bahasa Indonesia (Indonesian)
  | "ms" // Bahasa Melayu (Malay)
  | "th" // ไทย (Thai)
  | "fa"; // فارسی (Persian) — RTL

export type Direction = "ltr" | "rtl";

export interface LocaleInfo {
  readonly code: Locale;
  readonly name: string;
  readonly nativeName: string;
  readonly dir: Direction;
  readonly isRtl: boolean;
  readonly reviewStatus: "REVIEWED" | "PENDING_HUMAN_REVIEW" | "INCOMPLETE";
}

export type TranslationNamespace =
  | "common"
  | "nav"
  | "home"
  | "auth"
  | "portal"
  | "appointments"
  | "queue"
  | "patients"
  | "services"
  | "availability"
  | "staff"
  | "reports"
  | "admin"
  | "upload";

export type TranslationDictionary = Record<string, string>;

export type LocaleCatalogue = Record<TranslationNamespace, TranslationDictionary>;

export interface I18nContextValue {
  readonly locale: Locale;
  readonly dir: Direction;
  readonly isRtl: boolean;
  readonly setLocale: (newLocale: Locale) => void;
  readonly t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
}
