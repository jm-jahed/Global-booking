import type { ProtectedResourcePolicy } from "../types/access-control.js";

export const ACCESS_CONTROL_PRINCIPLES = [
  "least-privilege",
  "tenant-isolation",
  "role-based-access",
  "auditable-access",
] as const;

export const PROTECTED_RESOURCE_POLICIES = [
  {
    resource: "patient-records",
    principles: ACCESS_CONTROL_PRINCIPLES,
    requirements: [
      "Restrict access to explicitly authorized roles.",
      "Prevent access across tenant boundaries.",
      "Record security-relevant access and administrative changes.",
      "Collect only information required by an approved medical workflow.",
    ],
  },
  {
    resource: "business-records",
    principles: ["least-privilege", "tenant-isolation", "role-based-access"],
    requirements: ["Restrict records to the owning tenant and authorized platform roles."],
  },
  {
    resource: "administrative-audit-log",
    principles: ["least-privilege", "tenant-isolation", "auditable-access"],
    requirements: ["Protect audit integrity and limit access to authorized administrators."],
  },
] as const satisfies readonly ProtectedResourcePolicy[];
