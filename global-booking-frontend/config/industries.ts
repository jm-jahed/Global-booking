import type { IndustryDefinition } from "@/types/industry";

export const INDUSTRIES = [
  {
    slug: "doctors",
    name: "Doctors / Specialists",
    shortName: "Doctors",
    recipientTerm: "Patient",
    description: "Clear appointment and queue journeys for independent doctors and specialists.",
    serviceExamples: ["Consultation", "Follow-up", "Queue preparation"],
  },
  {
    slug: "hospitals",
    name: "Hospitals / Clinics",
    shortName: "Hospitals",
    recipientTerm: "Patient",
    description: "Patient-first scheduling across clinics, departments, and care teams.",
    serviceExamples: ["Clinical appointment", "Department selection", "Patient queue"],
  },
] as const satisfies readonly IndustryDefinition[];

/**
 * Archived categories for future phases
 */
export const ARCHIVED_FUTURE_INDUSTRIES = [
  {
    slug: "salons",
    name: "Salons / Spas",
    shortName: "Salons",
    recipientTerm: "Customer",
    description: "A refined service discovery and appointment flow for personal care businesses.",
    serviceExamples: ["Personal care", "Stylist selection", "Scheduled visit"],
  },
  {
    slug: "mechanics",
    name: "Mechanics / Auto Service",
    shortName: "Mechanics",
    recipientTerm: "Customer",
    secondaryRole: "Vehicle Owner",
    description: "Service scheduling shaped around customers, vehicle owners, and vehicle needs.",
    serviceExamples: ["Vehicle service", "Technician scheduling", "Service queue"],
  },
  {
    slug: "consultants",
    name: "Consultants / Professionals",
    shortName: "Consultants",
    recipientTerm: "Client",
    description: "Focused consultation booking for professional and advisory services.",
    serviceExamples: ["Consultation", "Professional service", "Scheduled session"],
  },
  {
    slug: "other-businesses",
    name: "Other Businesses",
    shortName: "Other businesses",
    recipientTerm: "Customer",
    description: "A configurable foundation for service businesses with Customer or Client terminology.",
    serviceExamples: ["Configured service", "Flexible schedule", "Optional queue"],
  },
] as const satisfies readonly IndustryDefinition[];

export type IndustrySlug = (typeof INDUSTRIES)[number]["slug"];

export function getIndustry(slug: string): IndustryDefinition | undefined {
  return (
    INDUSTRIES.find((industry) => industry.slug === slug) ??
    ARCHIVED_FUTURE_INDUSTRIES.find((industry) => industry.slug === slug)
  );
}
