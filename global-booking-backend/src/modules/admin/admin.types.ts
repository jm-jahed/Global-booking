/**
 * GLOBAL BOOKING — Admin Domain Types & Contracts
 * Fully reconciled with frontend contracts (types/admin.ts)
 * Enforces AED currency, Patient healthcare terminology, and strict entity isolation.
 */

import type { SuperAdminRole, UserRole } from "../auth/auth.types.js";

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
  readonly subSpecialties?: readonly string[] | undefined;
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
  readonly bedCapacity?: number | undefined;
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

export interface BaseRegistrationRecord {
  id: string; // e.g. "REG-DOC-2025-01" or "REG-HSP-2025-01"
  accountType: AccountType;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  submittedAt: string; // ISO 8601
  status: RegistrationStatus;
  documents: SubmittedDocument[];
  reviewedAt?: string | undefined;
  reviewedByAdminId?: string | undefined;
  reviewedByAdminName?: string | undefined;
  rejectionReason?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorRegistrationRecord extends BaseRegistrationRecord {
  accountType: "DOCTOR";
  practiceDetails: DoctorPracticeDetails;
}

export interface HospitalRegistrationRecord extends BaseRegistrationRecord {
  accountType: "HOSPITAL";
  institutionName: string;
  facilityDetails: HospitalFacilityDetails;
}

export type RegistrationRecord = DoctorRegistrationRecord | HospitalRegistrationRecord;

export interface DoctorChamberDetail {
  readonly id: string;
  readonly facilityName: string;
  readonly city: string;
  readonly address?: string | undefined;
  readonly roomNumber?: string | undefined;
  readonly visitingSchedule?: string | undefined;
  readonly contactPhone?: string | undefined;
  readonly timezone?: string | undefined;
}

export interface DoctorEducationItem {
  readonly id: string;
  readonly degree: string;
  readonly institution: string;
  readonly graduationYear?: string | undefined;
  readonly fieldOfStudy?: string | undefined;
}

export interface DoctorExperienceItem {
  readonly id: string;
  readonly role: string;
  readonly organization: string;
  readonly department?: string | undefined;
  readonly startYear: string;
  readonly endYear?: string | undefined;
  readonly isCurrent?: boolean | undefined;
}

export interface DoctorServiceItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly category?: string | undefined;
}

export interface DoctorAwardItem {
  readonly id: string;
  readonly title: string;
  readonly issuingBody: string;
  readonly year?: string | undefined;
  readonly description?: string | undefined;
}

export interface DoctorPublicationItem {
  readonly id: string;
  readonly title: string;
  readonly journal?: string | undefined;
  readonly year?: string | undefined;
  readonly url?: string | undefined;
  readonly abstract?: string | undefined;
}

export interface DoctorMembershipItem {
  readonly id: string;
  readonly organizationName: string;
  readonly role?: string | undefined;
  readonly sinceYear?: string | undefined;
}

export interface DoctorPublicContact {
  readonly clinicPhone?: string | undefined;
  readonly inquiryWhatsApp?: string | undefined;
  readonly publicEmail?: string | undefined;
}

export interface DoctorPortfolioSectionSetting {
  readonly isVisible: boolean;
  readonly order?: number | undefined;
  readonly customTitle?: string | undefined;
}

export type DoctorPortfolioSections = Record<string, DoctorPortfolioSectionSetting>;

export interface DoctorPublicDocumentRef {
  readonly id: string;
  readonly title: string;
  readonly documentType: string;
  readonly url: string;
}

/* Managed Doctor Account */
export interface DoctorRecord {
  id: string;              // Account ID e.g. "ACC-DOC-1001"
  doctorId: string;        // Entity Identifier e.g. "DOC-701"
  fullName: string;
  email: string;           // Normalized lowercase
  phone: string;
  avatar: string;
  specialty: string;
  licenseNumber: string;
  accountStatus: AccountStatus;
  approvedAt: string;      // ISO 8601
  subscriptionId: string;
  assignedPatientCount: number;
  totalBookingsCount: number;
  chamberLocationsSummary: string;
  yearsOfExperience: number;
  medicalDegrees: string[];
  consultationFee: MoneyAmount;
  slug?: string | undefined;
  bio?: string | undefined;
  languages?: string[] | undefined;
  chambers?: DoctorChamberDetail[] | undefined;
  education?: DoctorEducationItem[] | undefined;
  experience?: DoctorExperienceItem[] | undefined;
  services?: DoctorServiceItem[] | undefined;
  awards?: DoctorAwardItem[] | undefined;
  publications?: DoctorPublicationItem[] | undefined;
  memberships?: DoctorMembershipItem[] | undefined;
  publicContact?: DoctorPublicContact | undefined;
  portfolioSections?: DoctorPortfolioSections | undefined;
  publicDocuments?: DoctorPublicDocumentRef[] | undefined;
  isPublished?: boolean | undefined;
  customTitle?: string | undefined;
  passwordHash?: string | undefined;
  invitationTokenHash?: string | undefined;
  invitationTokenExpiresAt?: string | undefined;
  isActivated: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-facing safe doctor profile with internal token hashes and password hashes stripped.
 */
export type SafeDoctorProfile = Omit<DoctorRecord, "invitationTokenHash" | "passwordHash">;

/* Managed Hospital Account */
export interface HospitalRecord {
  id: string;              // Account ID e.g. "ACC-HSP-2001"
  hospitalId: string;      // Entity Identifier e.g. "HSP-401"
  institutionName: string;
  email: string;           // Normalized lowercase
  phone: string;
  avatar: string;
  facilityType: string;
  licenseNumber: string;
  accountStatus: AccountStatus;
  approvedAt: string;      // ISO 8601
  subscriptionId: string;
  departmentCount: number;
  affiliatedDoctorCount: number;
  outpatientPatientCount: number;
  totalAppointmentsCount: number;
  city: string;
  emirateOrState: string;
  departments: string[];
  bedCapacity?: number | undefined;
  emergencyUnitAvailable: boolean;
  location: {
    addressLine1: string;
    city: string;
    stateOrEmirate: string;
    country: string;
  };
  invitationTokenHash?: string | undefined;
  invitationTokenExpiresAt?: string | undefined;
  passwordHash?: string | undefined;
  isActivated: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-facing safe hospital profile with internal token hashes and password hashes stripped.
 */
export type SafeHospitalProfile = Omit<HospitalRecord, "invitationTokenHash" | "passwordHash">;

export type SubscriptionDuration = "14_DAYS_TRIAL" | "30_DAYS" | "6_MONTHS" | "1_YEAR";
export type SubscriptionBillingPeriod = "MONTHLY" | "SIX_MONTHS" | "YEARLY" | "THIRTY_DAYS";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

export type SubscriptionPaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "REFUNDED";

export type PaymentMethodType =
  | "BANK_TRANSFER"
  | "CORPORATE_CARD"
  | "MANUAL_ADMIN_OVERRIDE"
  | "DIRECT_DEBIT";

export interface MoneyAmount {
  readonly amountInFils: number; // Integer minor units (1 AED = 100 fils)
  readonly currency: "AED";
  readonly formatted: string;    // e.g. "AED 1,500.00"
}

export interface SubscriptionPaymentRecord {
  id: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: MoneyAmount;
  paymentDate: string;
  paymentMethod: PaymentMethodType;
  transactionReference: string;
  status: SubscriptionPaymentStatus;
  receiptUrl?: string | undefined;
  recordedByAdminName?: string | undefined;
}

export interface SubscriptionLifecycleEvent {
  id: string;
  timestamp: string;
  eventType:
    | "TRIAL_ACTIVATED"
    | "ACTIVATED"
    | "RENEWED"
    | "EXTENDED"
    | "SUSPENDED"
    | "CANCELLED"
    | "REACTIVATED";
  actorAdminName: string;
  note: string;
  previousExpiryDate?: string | undefined;
  newExpiryDate?: string | undefined;
}

export interface SubscriptionRecord {
  id: string; // e.g. "SUB-DOC-701"
  accountId: string;
  accountType: AccountType;
  accountHolderName: string;
  planId: string;
  planName: string;
  billingPeriod: SubscriptionBillingPeriod;
  status: SubscriptionStatus;
  isTrialActive: boolean;
  trialDaysAllocated: number;
  trialDaysRemaining: number;
  price: MoneyAmount;
  startDate: string;   // YYYY-MM-DD
  expiryDate: string;  // YYYY-MM-DD
  renewalDate: string; // YYYY-MM-DD
  autoRenew: boolean;
  renewalStatus: "RENEWAL_DUE" | "RENEWED" | "MANUAL_REQUIRED" | "OVERDUE";
  paymentStatus: SubscriptionPaymentStatus;
  paymentHistory: SubscriptionPaymentRecord[];
  lifecycleHistory: SubscriptionLifecycleEvent[];
  createdAt: string;
  updatedAt: string;
}

/* Audit Log Contracts */
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
  | "ACCOUNT_CREATED"
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
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole: SuperAdminRole | UserRole;
}

export interface AuditLogRecord {
  id: string; // e.g. "AUD-9001"
  timestamp: string; // ISO 8601
  category: AuditCategory;
  action: AuditActionType;
  actor: AuditActor;
  targetType: "DOCTOR" | "HOSPITAL" | "ADMIN_USER" | "SUBSCRIPTION" | "PLATFORM_SETTING" | "REGISTRATION";
  targetId: string;
  targetName: string;
  summary: string;
  reason?: string | undefined;
  ipAddress: string;
  metadata?: Record<string, unknown> | undefined;
}
