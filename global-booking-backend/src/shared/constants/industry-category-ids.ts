export const INDUSTRY_CATEGORY_IDS = {
  DOCTORS_SPECIALISTS: "doctors-specialists",
  HOSPITALS_CLINICS: "hospitals-clinics",
  SALONS_SPAS: "salons-spas",
  MECHANICS_AUTO_SERVICE: "mechanics-auto-service",
  CONSULTANTS_PROFESSIONALS: "consultants-professionals",
  OTHER_BUSINESSES: "other-businesses",
} as const;

export type IndustryCategoryId =
  (typeof INDUSTRY_CATEGORY_IDS)[keyof typeof INDUSTRY_CATEGORY_IDS];
