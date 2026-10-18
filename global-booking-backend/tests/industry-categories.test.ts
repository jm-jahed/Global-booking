import assert from "node:assert/strict";
import { test } from "node:test";

import { INDUSTRY_CATEGORIES } from "../src/shared/configuration/industry-categories.js";
import { validateIndustryCategories } from "../src/shared/configuration/validate-industry-categories.js";
import { INDUSTRY_CATEGORY_IDS } from "../src/shared/constants/industry-category-ids.js";
import type { IndustryCategoryId } from "../src/shared/constants/industry-category-ids.js";
import type { IndustryCategoryDefinition } from "../src/shared/types/industry-category.js";

test("the six approved categories pass configuration validation", () => {
  assert.doesNotThrow(() => validateIndustryCategories(INDUSTRY_CATEGORIES));
  assert.equal(INDUSTRY_CATEGORIES.length, 6);
});

test("medical categories use Patient terminology exclusively", () => {
  const medicalIds = new Set<IndustryCategoryId>([
    INDUSTRY_CATEGORY_IDS.DOCTORS_SPECIALISTS,
    INDUSTRY_CATEGORY_IDS.HOSPITALS_CLINICS,
  ]);

  const medicalCategories = INDUSTRY_CATEGORIES.filter((category) =>
    medicalIds.has(category.id),
  );

  for (const category of medicalCategories) {
    assert.equal(category.serviceRecipientTerminology.primarySingular, "Patient");
    assert.equal(category.serviceRecipientTerminology.labels.records, "Patient Records");
    assert.doesNotMatch(
      JSON.stringify(category.serviceRecipientTerminology),
      /customer|client/i,
    );
  }
});

test("validation rejects a medical Customer or Client regression", () => {
  const unsafeCategories: readonly IndustryCategoryDefinition[] = INDUSTRY_CATEGORIES.map(
    (category) =>
      category.id === INDUSTRY_CATEGORY_IDS.DOCTORS_SPECIALISTS
        ? {
            ...category,
            serviceRecipientTerminology: {
              ...category.serviceRecipientTerminology,
              primarySingular: "Client",
              primaryPlural: "Clients",
              allowedPrimaryTerms: ["Client"],
            },
          }
        : category,
  );

  assert.throws(
    () => validateIndustryCategories(unsafeCategories),
    /must use protected Patient terminology exclusively/,
  );
});

test("other businesses allow either Customer or Client terminology", () => {
  const otherBusinesses = INDUSTRY_CATEGORIES.find(
    (category) => category.id === INDUSTRY_CATEGORY_IDS.OTHER_BUSINESSES,
  );

  assert.deepEqual(otherBusinesses?.serviceRecipientTerminology.allowedPrimaryTerms, [
    "Customer",
    "Client",
  ]);
});
