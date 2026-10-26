import type { Locale, LocaleInfo } from "./types";

export const DEFAULT_LOCALE: Locale = "bn";

export const RTL_LOCALES = new Set<Locale>(["ar", "ur", "fa"]);

export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "REVIEWED",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "REVIEWED",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
    isRtl: true,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    dir: "rtl",
    isRtl: true,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "zh-CN",
    name: "Simplified Chinese",
    nativeName: "中文简体",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "zh-TW",
    name: "Traditional Chinese",
    nativeName: "中文繁體",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "ms",
    name: "Malay",
    nativeName: "Bahasa Melayu",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "th",
    name: "Thai",
    nativeName: "ไทย",
    dir: "ltr",
    isRtl: false,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    code: "fa",
    name: "Persian",
    nativeName: "فارسی",
    dir: "rtl",
    isRtl: true,
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
] as const;

export const LOCALE_MAP = new Map<Locale, LocaleInfo>(
  SUPPORTED_LOCALES.map((l) => [l.code, l]),
);

export function isValidLocale(code: string | undefined | null): code is Locale {
  if (!code) return false;
  return LOCALE_MAP.has(code as Locale);
}

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function getLocaleInfo(locale: Locale): LocaleInfo {
  return LOCALE_MAP.get(locale) || LOCALE_MAP.get(DEFAULT_LOCALE)!;
}
