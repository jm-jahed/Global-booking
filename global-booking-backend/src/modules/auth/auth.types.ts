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

export type UserRole = SuperAdminRole | "DOCTOR" | "HOSPITAL" | "STAFF";

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "STAFF";
  staffRole: "Receptionist / Front Desk" | "Clinical Nurse" | "Chamber Manager" | "Billing Coordinator";
  tenantType: "DOCTOR" | "HOSPITAL";
  doctorId?: string | undefined;
  hospitalId?: string | undefined;
  chamberLocation?: string | undefined;
  phone?: string | undefined;
  permissions: {
    canManageQueue: boolean;
    canBookPhoneAppointments: boolean;
    canViewPatientHistory: boolean;
    canCollectPayments: boolean;
  };
  accountStatus: "ACTIVE" | "SUSPENDED";
  lastLoginAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export type SafeStaffProfile = Omit<StaffRecord, "passwordHash">;

export interface AdminSessionPayload {
  readonly adminId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: readonly AdminPermission[];
  readonly doctorId?: string | undefined;
  readonly hospitalId?: string | undefined;
  readonly staffRole?: string | undefined;
}

export interface LoginRequestBody {
  readonly email?: string;
  readonly password?: string;
}
