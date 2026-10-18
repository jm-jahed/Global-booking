export const MANAGEMENT_CAPABILITIES = [
  "platform-overview",
  "tenant-registration-and-management",
  "industry-category-management",
  "business-status-management",
  "branch-management",
  "staff-roles-and-permissions",
  "booking-platform-settings",
  "subscription-and-plan-management",
  "platform-notification-configuration",
  "audit-logs-and-administrative-security",
] as const;

export type ManagementCapability = (typeof MANAGEMENT_CAPABILITIES)[number];

export const MANAGEMENT_IMPLEMENTATION_STATUS = "specification-only" as const;
