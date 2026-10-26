"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale, Direction, I18nContextValue, TranslationNamespace } from "./types";
import { DEFAULT_LOCALE, isRtlLocale, isValidLocale } from "./locales";
import { getStoredLocale, setStoredLocale, LOCALE_CHANGE_EVENT } from "./storage";
import { getTranslation } from "./catalogues";

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  readonly children: ReactNode;
  readonly initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);

  // Initialize from storage on mount (preserving SSR initial render)
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored !== locale) {
      setLocaleState(stored);
    }

    const handleLocaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<Locale>;
      if (customEvent.detail && isValidLocale(customEvent.detail)) {
        setLocaleState(customEvent.detail);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, [locale]);

  // Sync DOM attributes whenever locale changes
  const dir: Direction = useMemo(() => (isRtlLocale(locale) ? "rtl" : "ltr"), [locale]);
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      // Also apply a CSS class for conditional styling
      document.documentElement.classList.toggle("rtl-layout", isRtl);
    }
  }, [locale, dir, isRtl]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!isValidLocale(newLocale)) return;
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>, fallback?: string) => {
      // Allows namespace:key or plain key (defaults to common)
      let ns: TranslationNamespace = "common";
      let resolvedKey = key;

      if (key.includes(":")) {
        const [rawNs, ...rest] = key.split(":");
        ns = (rawNs as TranslationNamespace) || "common";
        resolvedKey = rest.join(":");
      }

      return getTranslation(locale, ns, resolvedKey, params, fallback);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      isRtl,
      setLocale,
      t,
    }),
    [locale, dir, isRtl, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback if used outside provider
    const fallbackDir: Direction = isRtlLocale(DEFAULT_LOCALE) ? "rtl" : "ltr";
    return {
      locale: DEFAULT_LOCALE,
      dir: fallbackDir,
      isRtl: fallbackDir === "rtl",
      setLocale: () => {},
      t: (key: string, _p?: any, fallback?: string) => fallback || key,
    };
  }
  return context;
}

export function useTranslation(defaultNamespace?: TranslationNamespace) {
  const { locale, dir, isRtl, setLocale, t: globalT } = useI18n();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>, fallback?: string) => {
      if (defaultNamespace && !key.includes(":")) {
        return globalT(`${defaultNamespace}:${key}`, params, fallback);
      }
      return globalT(key, params, fallback);
    },
    [defaultNamespace, globalT],
  );

  return {
    t,
    locale,
    dir,
    isRtl,
    setLocale,
  };
}

export function useLocale(): Locale {
  const { locale } = useI18n();
  return locale;
}
