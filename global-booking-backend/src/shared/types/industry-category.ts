import type { IndustryCategoryId } from "../constants/industry-category-ids.js";

export type PrimaryRecipientTerm = "Patient" | "Customer" | "Client";

export interface RecipientLabels {
  readonly management: string;
  readonly registration: string;
  readonly profile: string;
  readonly appointments: string;
  readonly followUps: string;
  readonly queue: string;
  readonly notifications: string;
  readonly history: string;
  readonly records: string;
}

export interface ServiceRecipientTerminology {
  readonly primarySingular: PrimaryRecipientTerm;
  readonly primaryPlural: string;
  readonly allowedPrimaryTerms: readonly PrimaryRecipientTerm[];
  readonly secondaryRole?: "Vehicle Owner";
  readonly labels: RecipientLabels;
}

export interface IndustryCategoryDefinition {
  readonly id: IndustryCategoryId;
  readonly displayName: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly serviceTypes: readonly string[];
  readonly bookingRequirements: readonly string[];
  readonly scheduling: {
    readonly appointmentScheduling: "required" | "optional" | "tenant-configurable";
  };
  readonly queue: {
    readonly available: boolean;
  };
  readonly staffTerminology: {
    readonly singular: string;
    readonly plural: string;
  };
  readonly serviceRecipientTerminology: ServiceRecipientTerminology;
  readonly recordRequirements: {
    readonly enabled: boolean;
    readonly visibleLabel: string;
    readonly sensitivity: "standard" | "sensitive-medical";
  };
  readonly publicLandingPage: {
    readonly enabled: boolean;
    readonly slug: string;
    readonly bookingEntryPointEnabled: boolean;
  };
}
