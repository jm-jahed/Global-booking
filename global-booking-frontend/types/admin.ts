/**
 * GLOBAL BOOKING — Super Admin & Subscription Architecture Contracts
 * 
 * DISCLAIMER:
 * These TypeScript contracts define the domain boundaries and data structures
 * for the Super Admin management platform and subscription system.
 * In Phase 1, these contracts are used with client-side mock fixtures only.
 * They do NOT provide authentication, authorization, durable persistence,
 * or live financial/payment processing.
 */

/* =========================================================================
   1. SUPER ADMIN IDENTITY & ROLE-BASED ACCESS CONTROL (RBAC)
   ========================================================================= */

export type SuperAdminRole =
  | "SUPER_ADMIN"
  | "OPERATIONS_ADMIN"
  | "BILLING_ADMIN"
  | "AUDIT_VIEWER";

export type AdminPermission =
  | "MANAGE_REGISTRATIONS"
  | "APPROVE_ACCOUNTS"
  | "REJECT_ACCOUNTS"
  | "VIEW_DOCTORS"
  | "MANAGE_DOCTORS"
  | "VIEW_HOSPITALS"
  | "MANAGE_HOSPITALS"
  | "MANAGE_SUBSCRIPTIONS"
  | "SUSPEND_ACCOUNTS"
  | "REACTIVATE_ACCOUNTS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_ADMIN_USERS"
  | "MANAGE_PLATFORM_SETTINGS";

export interface SuperAdminUser {
  readonly id: string; // e.g. "ADM-1001"
  readonly email: string;
  readonly name: string;
  readonly role: SuperAdminRole;
  readonly permissions: readonly AdminPermission[];
  readonly avatar: string;
  readonly isActive: boolean;
  readonly lastLoginAt?: string; // ISO 8601
  readonly createdAt: string;     // ISO 8601
}

/* =========================================================================
   2. ACCOUNT TYPES & REGISTRATION LIFECYCLE
   ========================================================================= */

export type AccountType = "DOCTOR" | "HOSPITAL";

export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AccountStatus =
  | "PENDING_APPROVAL"
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export interface SubmittedDocument {
  readonly id: string;
  readonly documentType: "MEDICAL_LICENSE" | "FACILITY_ACCREDITATION" | "TAX_CERTIFICATE" | "ID_DOCUMENT";
  readonly title: string;
  readonly documentNumber: string;
  readonly issuedBy: string;
  readonly expiryDate: string; // YYYY-MM-DD
  readonly fileUrl: string;
  readonly isVerified: boolean;
}

export interface DoctorPracticeDetails {
  readonly medicalDegrees: readonly string[];
  readonly primarySpecialty: string;
  readonly subSpecialties?: readonly string[];
  readonly yearsOfExperience: number;
  readonly chamberLocations: readonly {
    readonly facilityName: string;
    readonly city: string;
    readonly roomNumber: string;
    readonly scheduleSummary: string;
  }[];
  readonly consultationModes: readonly ("IN_CHAMBER" | "VIDEO_TELEHEALTH")[];
}

export interface HospitalFacilityDetails {
  readonly facilityType: "GENERAL_HOSPITAL" | "SPECIALTY_CLINIC" | "POLYCLINIC" | "DAY_SURGERY_CENTER";
  readonly bedCapacity?: number;
  readonly departments: readonly string[];
  readonly emergencyUnitAvailable: boolean;
  readonly affiliatedSpecialistCount: number;
  readonly location: {
    readonly addressLine1: string;
    readonly city: string;
    readonly stateOrEmirate: string;
    readonly country: string;
  };
}

export interface BaseRegistrationApplication {
  readonly id: string; // e.g. "REG-DOC-2025-01" or "REG-HSP-2025-01"
  readonly accountType: AccountType;
  readonly applicantName: string;
  readonly applicantEmail: string;
  readonly applicantPhone: string;
  readonly submittedAt: string; // ISO 8601
  readonly status: RegistrationStatus;
  readonly documents: readonly SubmittedDocument[];
  readonly reviewedAt?: string;
  readonly reviewedByAdminId?: string;
  readonly reviewedByAdminName?: string;
  readonly rejectionReason?: string;
  readonly notes?: string;
}

export interface DoctorRegistrationApplication extends BaseRegistrationApplication {
  readonly accountType: "DOCTOR";
  readonly practiceDetails: DoctorPracticeDetails;
}

export interface HospitalRegistrationApplication extends BaseRegistrationApplication {
  readonly accountType: "HOSPITAL";
  readonly institutionName: string;
  readonly facilityDetails: HospitalFacilityDetails;
}

export type RegistrationApplication =
  | DoctorRegistrationApplication
  | HospitalRegistrationApplication;

/* =========================================================================
   3. MANAGED ACCOUNT ENTITIES (SUPER ADMIN MANAGEMENT VIEWS)
   ========================================================================= */

export interface ManagedDoctorAccount {
  readonly id: string;           // Global Account ID e.g. "ACC-DOC-1001"
  readonly doctorId: string;     // Doctor Entity Identifier e.g. "DOC-701"
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly avatar: string;
  readonly specialty: string;
  readonly licenseNumber: string;
  readonly accountStatus: AccountStatus;
  readonly approvedAt: string;   // ISO 8601
  readonly subscriptionId: string; // Links strictly to this doctor's subscription
  // Patient & appointment metrics are scoped strictly to this doctor
  readonly assignedPatientCount: number;
  readonly totalBookingsCount: number;
  readonly chamberLocationsSummary: string;
  readonly createdAt: string;
}

export interface ManagedHospitalAccount {
  readonly id: string;           // Global Account ID e.g. "ACC-HSP-2001"
  readonly hospitalId: string;   // Hospital Entity Identifier e.g. "HSP-401"
  readonly institutionName: string;
  readonly email: string;
  readonly phone: string;
  readonly avatar: string;
  readonly facilityType: string;
  readonly licenseNumber: string;
  readonly accountStatus: AccountStatus;
  readonly approvedAt: string;   // ISO 8601
  readonly subscriptionId: string; // Links strictly to this hospital's subscription
  // Scoped institutional capacity
  readonly departmentCount: number;
  readonly affiliatedDoctorCount: number;
  readonly outpatientPatientCount: number;
  readonly totalAppointmentsCount: number;
  readonly city: string;
  readonly emirateOrState: string;
  readonly createdAt: string;
}

/* =========================================================================
   4. SUBSCRIPTION & SAFE FINANCIAL CONTRACTS
   ========================================================================= */

export type SubscriptionBillingPeriod =
  | "MONTHLY"       // 1 Month
  | "SIX_MONTHS"    // 6 Months
  | "YEARLY";       // 12 Months

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

export type SubscriptionPaymentStatus =
  | "PAID"
  | "PENDING"
  | "OVERDUE"
  | "REFUNDED";

export type PaymentMethodType =
  | "BANK_TRANSFER"
  | "CORPORATE_CARD"
  | "MANUAL_ADMIN_OVERRIDE"
  | "DIRECT_DEBIT";

/**
 * Safe monetary representation to avoid floating-point arithmetic errors.
 * amountInFils represents the value in the currency's smallest minor unit (1 AED = 100 Fils).
 * Example: AED 1,890.00 is stored as 189000 fils.
 */
export interface MoneyAmount {
  readonly amountInFils: number; // Integer minor unit: 100 fils = 1 AED
  readonly currency: "AED";
  readonly formatted: string;   // e.g. "AED 1,890.00"
}

export interface SubscriptionPaymentRecord {
  readonly id: string; // e.g. "PAY-501"
  readonly subscriptionId: string;
  readonly invoiceNumber: string; // e.g. "INV-GB-2025-014"
  readonly amount: MoneyAmount;
  readonly paymentDate: string; // ISO 8601
  readonly paymentMethod: PaymentMethodType;
  readonly transactionReference: string;
  readonly status: SubscriptionPaymentStatus;
  readonly receiptUrl?: string;
  readonly recordedByAdminName?: string;
}

export interface SubscriptionLifecycleEvent {
  readonly id: string;
  readonly timestamp: string; // ISO 8601
  readonly eventType:
    | "TRIAL_ACTIVATED"
    | "ACTIVATED"
    | "RENEWED"
    | "EXTENDED"
    | "SUSPENDED"
    | "CANCELLED"
    | "REACTIVATED";
  readonly actorAdminName: string;
  readonly note: string;
  readonly previousExpiryDate?: string;
  readonly newExpiryDate?: string;
}

export interface AccountSubscriptionDetails {
  readonly id: string; // e.g. "SUB-DOC-701"
  readonly accountId: string;
  readonly accountType: AccountType;
  readonly accountHolderName: string;
  readonly planId: string; // e.g. "PLAN-DOCTOR-PRACTICE" or "PLAN-HOSPITAL-ENTERPRISE"
  readonly planName: string;
  readonly billingPeriod: SubscriptionBillingPeriod;
  readonly status: SubscriptionStatus;
  readonly isTrialActive: boolean;
  readonly trialDaysAllocated?: number;
  readonly trialDaysRemaining?: number;
  readonly price: MoneyAmount;
  readonly startDate: string;       // YYYY-MM-DD
  readonly expiryDate: string;      // YYYY-MM-DD
  readonly renewalDate: string;     // YYYY-MM-DD
  readonly autoRenew: boolean;
  readonly renewalStatus: "RENEWAL_DUE" | "RENEWED" | "MANUAL_REQUIRED" | "OVERDUE";
  readonly paymentStatus: SubscriptionPaymentStatus;
  readonly paymentHistory: readonly SubscriptionPaymentRecord[];
  readonly lifecycleHistory: readonly SubscriptionLifecycleEvent[];
}

/* =========================================================================
   5. SECURITY & ADMINISTRATIVE AUDIT TRAIL CONTRACTS
   ========================================================================= */

export type AuditCategory =
  | "REGISTRATION_REVIEW"
  | "ACCOUNT_LIFECYCLE"
  | "SUBSCRIPTION_MANAGEMENT"
  | "SECURITY_EVENT"
  | "PERMISSIONS_UPDATE"
  | "PLATFORM_CONFIGURATION";

export type AuditActionType =
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_REACTIVATED"
  | "TRIAL_GRANTED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_EXTENDED"
  | "SUBSCRIPTION_SUSPENDED"
  | "SUBSCRIPTION_CANCELLED"
  | "PAYMENT_RECORDED"
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "SENSITIVE_ACCOUNT_ACCESSED"
  | "PERMISSIONS_MODIFIED"
  | "SETTINGS_UPDATED";

export interface AuditActor {
  readonly adminId: string;
  readonly adminName: string;
  readonly adminEmail: string;
  readonly adminRole: SuperAdminRole;
}

export interface AuditLogEntry {
  readonly id: string; // e.g. "AUD-9001"
  readonly timestamp: string; // ISO 8601
  readonly category: AuditCategory;
  readonly action: AuditActionType;
  readonly actor: AuditActor;
  readonly targetType: "DOCTOR" | "HOSPITAL" | "ADMIN_USER" | "SUBSCRIPTION" | "PLATFORM_SETTING";
  readonly targetId: string;
  readonly targetName: string;
  readonly summary: string;
  readonly reason?: string;
  readonly ipAddress: string;
  readonly metadata?: Record<string, unknown>;
}
