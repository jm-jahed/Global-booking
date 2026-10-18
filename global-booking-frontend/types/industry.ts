export type RecipientTerm = "Patient" | "Customer" | "Client";

export interface IndustryDefinition {
  readonly slug: string;
  readonly name: string;
  readonly shortName: string;
  readonly recipientTerm: RecipientTerm;
  readonly secondaryRole?: "Vehicle Owner";
  readonly description: string;
  readonly serviceExamples: readonly string[];
}
