export type AccessControlPrinciple =
  | "least-privilege"
  | "tenant-isolation"
  | "role-based-access"
  | "auditable-access";

export interface ProtectedResourcePolicy {
  readonly resource: "patient-records" | "business-records" | "administrative-audit-log";
  readonly principles: readonly AccessControlPrinciple[];
  readonly requirements: readonly string[];
}
