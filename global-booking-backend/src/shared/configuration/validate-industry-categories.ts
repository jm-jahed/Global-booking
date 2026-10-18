import { INDUSTRY_CATEGORY_IDS } from "../constants/industry-category-ids.js";
import type { IndustryCategoryId } from "../constants/industry-category-ids.js";
import type { IndustryCategoryDefinition } from "../types/industry-category.js";

const MEDICAL_CATEGORY_IDS = new Set<IndustryCategoryId>([
  INDUSTRY_CATEGORY_IDS.DOCTORS_SPECIALISTS,
  INDUSTRY_CATEGORY_IDS.HOSPITALS_CLINICS,
]);

export function validateIndustryCategories(
  categories: readonly IndustryCategoryDefinition[],
): void {
  const identifiers = new Set(categories.map((category) => category.id));

  if (categories.length !== 6 || identifiers.size !== 6) {
    throw new Error("Industry configuration must contain six unique categories.");
  }

  for (const category of categories) {
    if (!MEDICAL_CATEGORY_IDS.has(category.id)) {
      continue;
    }

    const terminology = category.serviceRecipientTerminology;
    const serializedLabels = JSON.stringify(terminology.labels);

    if (
      terminology.primarySingular !== "Patient" ||
      terminology.primaryPlural !== "Patients" ||
      terminology.allowedPrimaryTerms.some((term) => term !== "Patient") ||
      /customer|client/i.test(serializedLabels) ||
      category.recordRequirements.visibleLabel !== "Patient Records" ||
      category.recordRequirements.sensitivity !== "sensitive-medical"
    ) {
      throw new Error(
        `Medical category ${category.id} must use protected Patient terminology exclusively.`,
      );
    }
  }
}
