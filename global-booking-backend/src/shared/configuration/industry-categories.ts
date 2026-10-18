import { INDUSTRY_CATEGORY_IDS } from "../constants/industry-category-ids.js";
import type {
  IndustryCategoryDefinition,
  PrimaryRecipientTerm,
  RecipientLabels,
  ServiceRecipientTerminology,
} from "../types/industry-category.js";

function recipientLabels(term: PrimaryRecipientTerm): RecipientLabels {
  return {
    management: `${term} Management`,
    registration: `${term} Registration`,
    profile: `${term} Profile`,
    appointments: `${term} Appointments`,
    followUps: `${term} Follow-ups`,
    queue: `${term} Queue / Serial Number`,
    notifications: `${term} Notifications`,
    history: `${term} History`,
    records: `${term} Records`,
  };
}

function terminology(
  primarySingular: PrimaryRecipientTerm,
  options: {
    readonly allowedPrimaryTerms?: readonly PrimaryRecipientTerm[];
    readonly secondaryRole?: "Vehicle Owner";
  } = {},
): ServiceRecipientTerminology {
  const base = {
    primarySingular,
    primaryPlural: `${primarySingular}s`,
    allowedPrimaryTerms: options.allowedPrimaryTerms ?? [primarySingular],
    labels: recipientLabels(primarySingular),
  };

  return options.secondaryRole === undefined
    ? base
    : { ...base, secondaryRole: options.secondaryRole };
}

export const INDUSTRY_CATEGORIES = [
  {
    id: INDUSTRY_CATEGORY_IDS.DOCTORS_SPECIALISTS,
    displayName: "Doctors / Specialists",
    description: "Appointment and queue preparation for independent doctors and specialists.",
    enabled: true,
    serviceTypes: ["Medical consultation"],
    bookingRequirements: ["Patient selection", "Practitioner selection", "Appointment time"],
    scheduling: { appointmentScheduling: "required" },
    queue: { available: true },
    staffTerminology: { singular: "Doctor", plural: "Doctors" },
    serviceRecipientTerminology: terminology("Patient"),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Patient Records",
      sensitivity: "sensitive-medical",
    },
    publicLandingPage: {
      enabled: false,
      slug: "doctors-specialists",
      bookingEntryPointEnabled: false,
    },
  },
  {
    id: INDUSTRY_CATEGORY_IDS.HOSPITALS_CLINICS,
    displayName: "Hospitals / Clinics",
    description: "Appointment and queue preparation for hospitals and clinics.",
    enabled: true,
    serviceTypes: ["Clinical appointment"],
    bookingRequirements: ["Patient selection", "Department or practitioner selection", "Appointment time"],
    scheduling: { appointmentScheduling: "required" },
    queue: { available: true },
    staffTerminology: { singular: "Healthcare Professional", plural: "Healthcare Professionals" },
    serviceRecipientTerminology: terminology("Patient"),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Patient Records",
      sensitivity: "sensitive-medical",
    },
    publicLandingPage: {
      enabled: false,
      slug: "hospitals-clinics",
      bookingEntryPointEnabled: false,
    },
  },
  {
    id: INDUSTRY_CATEGORY_IDS.SALONS_SPAS,
    displayName: "Salons / Spas",
    description: "Booking preparation for salon and spa services.",
    enabled: true,
    serviceTypes: ["Personal care service"],
    bookingRequirements: ["Customer selection", "Service selection", "Appointment time"],
    scheduling: { appointmentScheduling: "required" },
    queue: { available: true },
    staffTerminology: { singular: "Service Professional", plural: "Service Professionals" },
    serviceRecipientTerminology: terminology("Customer"),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Customer Records",
      sensitivity: "standard",
    },
    publicLandingPage: {
      enabled: false,
      slug: "salons-spas",
      bookingEntryPointEnabled: false,
    },
  },
  {
    id: INDUSTRY_CATEGORY_IDS.MECHANICS_AUTO_SERVICE,
    displayName: "Mechanics / Auto Service",
    description: "Booking preparation for vehicle maintenance and repair services.",
    enabled: true,
    serviceTypes: ["Vehicle maintenance or repair"],
    bookingRequirements: ["Customer or vehicle owner selection", "Vehicle reference", "Service time"],
    scheduling: { appointmentScheduling: "tenant-configurable" },
    queue: { available: true },
    staffTerminology: { singular: "Technician", plural: "Technicians" },
    serviceRecipientTerminology: terminology("Customer", { secondaryRole: "Vehicle Owner" }),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Customer and Vehicle Records",
      sensitivity: "standard",
    },
    publicLandingPage: {
      enabled: false,
      slug: "mechanics-auto-service",
      bookingEntryPointEnabled: false,
    },
  },
  {
    id: INDUSTRY_CATEGORY_IDS.CONSULTANTS_PROFESSIONALS,
    displayName: "Consultants / Professionals",
    description: "Booking preparation for consultants and professional services.",
    enabled: true,
    serviceTypes: ["Professional consultation"],
    bookingRequirements: ["Client selection", "Service selection", "Appointment time"],
    scheduling: { appointmentScheduling: "required" },
    queue: { available: false },
    staffTerminology: { singular: "Consultant", plural: "Consultants" },
    serviceRecipientTerminology: terminology("Client"),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Client Records",
      sensitivity: "standard",
    },
    publicLandingPage: {
      enabled: false,
      slug: "consultants-professionals",
      bookingEntryPointEnabled: false,
    },
  },
  {
    id: INDUSTRY_CATEGORY_IDS.OTHER_BUSINESSES,
    displayName: "Other Businesses",
    description: "Configurable booking preparation for other service businesses.",
    enabled: true,
    serviceTypes: ["Tenant-defined service"],
    bookingRequirements: ["Configured recipient", "Service selection", "Configured schedule"],
    scheduling: { appointmentScheduling: "tenant-configurable" },
    queue: { available: true },
    staffTerminology: { singular: "Staff Member", plural: "Staff Members" },
    serviceRecipientTerminology: terminology("Customer", {
      allowedPrimaryTerms: ["Customer", "Client"],
    }),
    recordRequirements: {
      enabled: true,
      visibleLabel: "Customer Records",
      sensitivity: "standard",
    },
    publicLandingPage: {
      enabled: false,
      slug: "other-businesses",
      bookingEntryPointEnabled: false,
    },
  },
] as const satisfies readonly IndustryCategoryDefinition[];
