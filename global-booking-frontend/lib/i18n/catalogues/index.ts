import type { Locale, LocaleCatalogue, TranslationNamespace } from "../types";
import { bnCatalogue } from "./bn";
import { enCatalogue } from "./en";
import { arCatalogue } from "./ar";

export const CATALOGUES: Partial<Record<Locale, LocaleCatalogue>> = {
  bn: bnCatalogue,
  en: enCatalogue,
  ar: arCatalogue,
};

/**
 * Resolves a translation string with parameter interpolation and fallback to Bangla.
 */
export function getTranslation(
  locale: Locale,
  namespace: TranslationNamespace,
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
): string {
  const currentCat = CATALOGUES[locale] || bnCatalogue;
  const fallbackCat = bnCatalogue;

  let message = currentCat[namespace]?.[key];

  if (!message && currentCat !== fallbackCat) {
    message = fallbackCat[namespace]?.[key];
  }

  if (!message) {
    return fallback || key;
  }

  // Parameter interpolation: {param}
  if (params && typeof params === "object") {
    return Object.entries(params).reduce((str, [pKey, pVal]) => {
      return str.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }, message);
  }

  return message;
}
