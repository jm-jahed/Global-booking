/**
 * GLOBAL BOOKING — Admin Authentication & Authorization Types
 * Reconciled with frontend types/admin.ts domain contracts.
 */

export const SUPER_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "BILLING_ADMIN",
  "AUDIT_VIEWER",
] as const;

export type SuperAdminRole = (typeof SUPER_ADMIN_ROLES)[number];

export const ALL_ADMIN_PERMISSIONS = [
  "MANAGE_REGISTRATIONS",
  "APPROVE_ACCOUNTS",
  "REJECT_ACCOUNTS",
  "VIEW_DOCTORS",
  "MANAGE_DOCTORS",
  "VIEW_HOSPITALS",
  "MANAGE_HOSPITALS",
  "MANAGE_SUBSCRIPTIONS",
  "SUSPEND_ACCOUNTS",
  "REACTIVATE_ACCOUNTS",
  "VIEW_AUDIT_LOGS",
  "MANAGE_ADMIN_USERS",
  "MANAGE_PLATFORM_SETTINGS",
] as const;

export type AdminPermission = (typeof ALL_ADMIN_PERMISSIONS)[number];

export interface AdminUserRecord {
  adminId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: SuperAdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface SafeAdminProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: SuperAdminRole;
  readonly permissions: readonly AdminPermission[];
  readonly isActive: boolean;
  readonly lastLoginAt?: string | undefined;
  readonly createdAt: string;
}

export type UserRole = SuperAdminRole | "DOCTOR" | "HOSPITAL";

export interface AdminSessionPayload {
  readonly adminId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: readonly AdminPermission[];
}

export interface LoginRequestBody {
  readonly email?: string;
  readonly password?: string;
}
