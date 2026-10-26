import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtlLocale, isValidLocale } from "../lib/i18n/locales";
import { bnCatalogue } from "../lib/i18n/catalogues/bn";
import { enCatalogue } from "../lib/i18n/catalogues/en";
import { arCatalogue } from "../lib/i18n/catalogues/ar";
import { getTranslation } from "../lib/i18n/catalogues/index";
import {
  formatLocaleCurrency,
  formatLocaleDate,
  formatLocaleTime,
  formatLocaleNumber,
} from "../lib/i18n/formatters";

test("1. English ('en') MUST be the default locale across the entire system", () => {
  assert.equal(DEFAULT_LOCALE, "en", "DEFAULT_LOCALE must strictly be 'en'");
  assert.equal(SUPPORTED_LOCALES[0]?.code, "bn", "Bangla must be the very first option in the supported locales list");
  assert.equal(SUPPORTED_LOCALES[0]?.nativeName, "বাংলা", "Native name must be বাংলা");
});

test("2. Supported locales include all 20 required world languages with native names", () => {
  assert.equal(SUPPORTED_LOCALES.length, 20, "Must support exactly 20 initial world languages");

  const codes = SUPPORTED_LOCALES.map((l) => l.code);
  const expectedCodes = [
    "bn", "en", "ar", "hi", "ur", "es", "fr", "pt", "zh-CN", "zh-TW",
    "ja", "ko", "ru", "de", "it", "tr", "id", "ms", "th", "fa"
  ];

  for (const exp of expectedCodes) {
    assert.ok(codes.includes(exp as any), `Locale ${exp} must be in supported locales`);
    assert.ok(isValidLocale(exp), `isValidLocale(${exp}) must return true`);
  }
});

test("3. RTL locales identify Arabic, Urdu, and Persian strictly", () => {
  assert.equal(isRtlLocale("ar"), true, "Arabic must be RTL");
  assert.equal(isRtlLocale("ur"), true, "Urdu must be RTL");
  assert.equal(isRtlLocale("fa"), true, "Persian must be RTL");
  assert.equal(isRtlLocale("bn"), false, "Bangla must be LTR");
  assert.equal(isRtlLocale("en"), false, "English must be LTR");
});

test("4. Translation catalog parity: Exact bidirectional parity across Bangla ('bn'), English ('en'), and Arabic ('ar')", () => {
  const namespaces = Object.keys(bnCatalogue) as (keyof typeof bnCatalogue)[];
  assert.ok(namespaces.length >= 14, "Must have at least 14 translation namespaces");

  for (const ns of namespaces) {
    const bnKeys = Object.keys(bnCatalogue[ns]);
    const enKeys = Object.keys(enCatalogue[ns] || {});
    const arKeys = Object.keys(arCatalogue[ns] || {});

    assert.ok(enCatalogue[ns], `Namespace '${ns}' must exist in English catalogue`);
    assert.ok(arCatalogue[ns], `Namespace '${ns}' must exist in Arabic catalogue`);

    for (const key of bnKeys) {
      assert.ok(
        enKeys.includes(key),
        `English catalogue missing key '${ns}:${key}' which exists in Bangla catalogue`,
      );
      assert.ok(
        arKeys.includes(key),
        `Arabic catalogue missing key '${ns}:${key}' which exists in Bangla catalogue`,
      );
      assert.ok(
        typeof bnCatalogue[ns][key] === "string" && bnCatalogue[ns][key].trim().length > 0,
        `Bangla translation '${ns}:${key}' must not be empty`,
      );
      assert.ok(
        typeof arCatalogue[ns][key] === "string" && arCatalogue[ns][key].trim().length > 0,
        `Arabic translation '${ns}:${key}' must not be empty`,
      );
    }

    for (const key of enKeys) {
      assert.ok(
        bnKeys.includes(key),
        `Bangla catalogue missing key '${ns}:${key}' which exists in English catalogue`,
      );
      assert.ok(
        arKeys.includes(key),
        `Arabic catalogue missing key '${ns}:${key}' which exists in English catalogue`,
      );
      assert.ok(
        typeof enCatalogue[ns][key] === "string" && enCatalogue[ns][key].trim().length > 0,
        `English translation '${ns}:${key}' must not be empty`,
      );
    }
  }
});

test("5. Parameter interpolation in translations works cleanly", () => {
  const interpolated = getTranslation("bn", "portal", "welcomeBack", { name: "জাহেদুল ইসলাম" });
  assert.equal(interpolated, "স্বাগতম, ডা. জাহেদুল ইসলাম");

  const interpolatedEn = getTranslation("en", "portal", "welcomeBack", { name: "Jahedul Islam" });
  assert.equal(interpolatedEn, "Welcome back, Dr. Jahedul Islam");

  const interpolatedAr = getTranslation("ar", "portal", "welcomeBack", { name: "طاهر المنصور" });
  assert.equal(interpolatedAr, "مرحباً بعودتك، د. طاهر المنصور");
});

test("6. Currency formatter preserves numeric fee values without floating-point distortion", () => {
  const fee500 = formatLocaleCurrency(500, "bn", "AED");
  assert.ok(fee500.includes("500") || fee500.includes("৫০০"), "Must preserve fee value 500");
  assert.ok(fee500.includes("AED"), "Must preserve currency label AED");

  const fee0 = formatLocaleCurrency(0, "bn", "AED");
  assert.ok(fee0.includes("0") || fee0.includes("০"), "Consultation fee of 0 AED must preserve zero");
});

test("7. Date and Time formatters preserve chamber timezone and do not shift calendar dates", () => {
  const formattedBn = formatLocaleDate("2026-10-26", "bn");
  assert.ok(formattedBn.length > 0, "Formatted Bangla date should not be empty");

  const formattedEn = formatLocaleDate("2026-10-26", "en");
  assert.ok(formattedEn.includes("2026"), "Formatted English date must include year 2026");

  // Chamber time in Asia/Dubai
  const chamberTime = formatLocaleTime("2026-10-26T17:00:00.000Z", "en", "Asia/Dubai");
  assert.ok(chamberTime.includes("PM"), "17:00 UTC in Dubai (UTC+4) is 9:00 PM");
});
