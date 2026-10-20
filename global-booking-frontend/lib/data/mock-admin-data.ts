/**
 * GLOBAL BOOKING — Super Admin & Subscription Mock Data Fixtures
 * 
 * ============================================================================
 * ARCHITECTURAL NOTICE & DISCLAIMER:
 * 
 * 1. This file contains FICTIONAL MOCK DATA for Phase 1 frontend integration
 *    and client-side UI testing only.
 * 2. This mock data does NOT represent production records.
 * 3. It does NOT provide server-side authentication, role authorization,
 *    durable persistence, or live payment/subscription transaction processing.
 * 4. Monetary amounts are represented safely in integer minor units (fils)
 *    to prevent floating-point rounding errors (100 fils = 1 AED).
 * 5. Terminology strictly adheres to "Patient" for all healthcare relationships.
 * ============================================================================
 */

import {
  SuperAdminUser,
  DoctorRegistrationApplication,
  HospitalRegistrationApplication,
  ManagedDoctorAccount,
  ManagedHospitalAccount,
  AccountSubscriptionDetails,
  AuditLogEntry,
  MoneyAmount,
} from "@/types/admin";

/* =========================================================================
   HELPER UTILITY: SAFE MONETARY VALUE CREATION (INTEGER MINOR UNITS)
   ========================================================================= */

/**
 * Creates a safe MoneyAmount object using integer fils (100 fils = 1 AED).
 * Prevents floating-point precision issues during accounting and billing.
 */
export function createSafeAEDAmount(aedValue: number): MoneyAmount {
  const integerFils = Math.round(aedValue * 100);
  const formatted = new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(integerFils / 100);

  return {
    amountInFils: integerFils,
    currency: "AED",
    formatted,
  };
}

/* =========================================================================
   1. SUPER ADMIN USERS & AUTHORIZED ROLES
   ========================================================================= */

export const MOCK_SUPER_ADMIN_USERS: SuperAdminUser[] = [
  {
    id: "ADM-1001",
    email: "superadmin@globalbooking.ae",
    name: "Dr. Tariq Al-Hashimi",
    role: "SUPER_ADMIN",
    avatar: "/avatars/daniel-carter.jpg",
    permissions: [
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
    ],
    isActive: true,
    lastLoginAt: "2025-04-18T08:15:20Z",
    createdAt: "2024-01-10T09:00:00Z",
  },
  {
    id: "ADM-1002",
    email: "compliance@globalbooking.ae",
    name: "Elena Rostova",
    role: "OPERATIONS_ADMIN",
    avatar: "/avatars/emma-davis.jpg",
    permissions: [
      "MANAGE_REGISTRATIONS",
      "APPROVE_ACCOUNTS",
      "REJECT_ACCOUNTS",
      "VIEW_DOCTORS",
      "VIEW_HOSPITALS",
      "VIEW_AUDIT_LOGS",
    ],
    isActive: true,
    lastLoginAt: "2025-04-17T14:40:00Z",
    createdAt: "2024-03-15T11:30:00Z",
  },
  {
    id: "ADM-1003",
    email: "billing@globalbooking.ae",
    name: "Karim Benali",
    role: "BILLING_ADMIN",
    avatar: "/avatars/noah-bennett.jpg",
    permissions: [
      "VIEW_DOCTORS",
      "VIEW_HOSPITALS",
      "MANAGE_SUBSCRIPTIONS",
      "VIEW_AUDIT_LOGS",
    ],
    isActive: true,
    lastLoginAt: "2025-04-16T10:12:00Z",
    createdAt: "2024-06-01T08:00:00Z",
  },
];

/* =========================================================================
   2. NEW REGISTRATION REQUESTS — DOCTOR APPLICATIONS
   ========================================================================= */

export const MOCK_PENDING_DOCTOR_APPLICATIONS: DoctorRegistrationApplication[] = [
  {
    id: "REG-DOC-2025-01",
    accountType: "DOCTOR",
    applicantName: "Dr. Farhan Al-Mansoor",
    applicantEmail: "dr.farhan@neurohealth.ae",
    applicantPhone: "+971 50 112 3344",
    submittedAt: "2025-04-16T09:20:00Z",
    status: "PENDING",
    practiceDetails: {
      medicalDegrees: ["MBBS (King's College London)", "FRCS (Neurosurgery, Edinburgh)"],
      primarySpecialty: "Neurosurgery & Spine Care",
      subSpecialties: ["Minimally Invasive Spine", "Cranial Base Surgery"],
      yearsOfExperience: 14,
      chamberLocations: [
        {
          facilityName: "Al Zahra International Pavilion",
          city: "Dubai",
          roomNumber: "Consultation Suite 408",
          scheduleSummary: "Mon, Wed (09:00 AM – 02:00 PM)",
        },
        {
          facilityName: "Emirates Specialty Medical Centre",
          city: "Abu Dhabi",
          roomNumber: "Room 12",
          scheduleSummary: "Sat (10:00 AM – 04:00 PM)",
        },
      ],
      consultationModes: ["IN_CHAMBER", "VIDEO_TELEHEALTH"],
    },
    documents: [
      {
        id: "DOC-MED-901",
        documentType: "MEDICAL_LICENSE",
        title: "DHA Consultant Neurosurgeon License",
        documentNumber: "DHA-LIC-2024-88391",
        issuedBy: "Dubai Health Authority",
        expiryDate: "2026-08-30",
        fileUrl: "/mock-docs/dha-license-farhan.pdf",
        isVerified: true,
      },
      {
        id: "DOC-MED-902",
        documentType: "ID_DOCUMENT",
        title: "Emirates ID Card",
        documentNumber: "784-1982-1234567-1",
        issuedBy: "Federal Authority for Identity and Citizenship",
        expiryDate: "2028-02-14",
        fileUrl: "/mock-docs/eid-farhan.pdf",
        isVerified: true,
      },
    ],
    notes: "Applicant is requesting fast-track onboarding for hospital chamber sync.",
  },
  {
    id: "REG-DOC-2025-02",
    accountType: "DOCTOR",
    applicantName: "Dr. Layla Kassam",
    applicantEmail: "dr.layla@derma-prestige.ae",
    applicantPhone: "+971 52 889 0011",
    submittedAt: "2025-04-17T11:45:00Z",
    status: "PENDING",
    practiceDetails: {
      medicalDegrees: ["MD (Sorbonne University)", "Fellowship in Aesthetic Dermatology (Paris)"],
      primarySpecialty: "Dermatology & Aesthetic Medicine",
      subSpecialties: ["Laser Therapy", "Pediatric Dermatology"],
      yearsOfExperience: 11,
      chamberLocations: [
        {
          facilityName: "Prestige Aesthetics Clinic",
          city: "Dubai",
          roomNumber: "Suite 104",
          scheduleSummary: "Tue, Thu, Sun (11:00 AM – 06:00 PM)",
        },
      ],
      consultationModes: ["IN_CHAMBER"],
    },
    documents: [
      {
        id: "DOC-MED-903",
        documentType: "MEDICAL_LICENSE",
        title: "DOH Specialist Dermatology License",
        documentNumber: "DOH-SPEC-449102",
        issuedBy: "Department of Health Abu Dhabi",
        expiryDate: "2026-11-15",
        fileUrl: "/mock-docs/doh-license-layla.pdf",
        isVerified: false,
      },
    ],
    notes: "Awaiting secondary verification of French fellowship board certificate.",
  },
];

/* =========================================================================
   3. NEW REGISTRATION REQUESTS — HOSPITAL / CLINIC APPLICATIONS
   ========================================================================= */

export const MOCK_PENDING_HOSPITAL_APPLICATIONS: HospitalRegistrationApplication[] = [
  {
    id: "REG-HSP-2025-01",
    accountType: "HOSPITAL",
    institutionName: "Emirates Royal Polyclinic",
    applicantName: "Eng. Saeed Al-Nuaimi (Operations Director)",
    applicantEmail: "saeed.nuaimi@emiratesroyal.ae",
    applicantPhone: "+971 4 330 9900",
    submittedAt: "2025-04-15T15:10:00Z",
    status: "PENDING",
    facilityDetails: {
      facilityType: "POLYCLINIC",
      departments: [
        "Cardiology",
        "Orthopedics",
        "Pediatrics",
        "Obstetrics & Gynecology",
        "Clinical Pathology",
      ],
      emergencyUnitAvailable: false,
      affiliatedSpecialistCount: 18,
      location: {
        addressLine1: "Jumeirah Beach Road, Villa 24",
        city: "Dubai",
        stateOrEmirate: "Dubai",
        country: "United Arab Emirates",
      },
    },
    documents: [
      {
        id: "DOC-HSP-801",
        documentType: "FACILITY_ACCREDITATION",
        title: "DHA Outpatient Facility Operational License",
        documentNumber: "DHA-FAC-2023-01994",
        issuedBy: "Dubai Health Authority",
        expiryDate: "2027-01-20",
        fileUrl: "/mock-docs/dha-facility-emiratesroyal.pdf",
        isVerified: true,
      },
      {
        id: "DOC-HSP-802",
        documentType: "TAX_CERTIFICATE",
        title: "Federal Tax Authority VAT Registration",
        documentNumber: "100293847500003",
        issuedBy: "Federal Tax Authority UAE",
        expiryDate: "2029-12-31",
        fileUrl: "/mock-docs/vat-emiratesroyal.pdf",
        isVerified: true,
      },
    ],
    notes: "Requesting onboarding for 5 specialized departments with 18 consultant chambers.",
  },
  {
    id: "REG-HSP-2025-02",
    accountType: "HOSPITAL",
    institutionName: "Gulf Specialty Surgical Hospital",
    applicantName: "Dr. Arthur Vance (Chief of Surgery)",
    applicantEmail: "admin@gulfsurgery.ae",
    applicantPhone: "+971 2 449 8811",
    submittedAt: "2025-04-17T08:30:00Z",
    status: "PENDING",
    facilityDetails: {
      facilityType: "DAY_SURGERY_CENTER",
      bedCapacity: 35,
      departments: [
        "Day Surgery & Laparoscopy",
        "Orthopedic Reconstruction",
        "Ophthalmology & Retina",
        "Anesthesiology & Pain Management",
      ],
      emergencyUnitAvailable: true,
      affiliatedSpecialistCount: 26,
      location: {
        addressLine1: "Corniche Sector, Building 14",
        city: "Abu Dhabi",
        stateOrEmirate: "Abu Dhabi",
        country: "United Arab Emirates",
      },
    },
    documents: [
      {
        id: "DOC-HSP-803",
        documentType: "FACILITY_ACCREDITATION",
        title: "DOH Ambulatory & Surgical Center Accreditation",
        documentNumber: "DOH-SURG-5512-2024",
        issuedBy: "Department of Health Abu Dhabi",
        expiryDate: "2026-12-15",
        fileUrl: "/mock-docs/doh-gulfsurgery.pdf",
        isVerified: true,
      },
    ],
    notes: "Requires institutional front-desk synchronization and multi-suite token booking.",
  },
];

/* =========================================================================
   4. REGISTERED & APPROVED DOCTOR ACCOUNTS (MANAGED ENTITIES)
   ========================================================================= */

export const MOCK_MANAGED_DOCTOR_ACCOUNTS: ManagedDoctorAccount[] = [
  {
    id: "ACC-DOC-1001",
    doctorId: "DOC-701",
    fullName: "Dr. Sarah Khan",
    email: "dr.sarah@globalbooking.ae",
    phone: "+971 50 234 5678",
    avatar: "/avatars/dr-sarah-khan.jpg",
    specialty: "Cardiology Specialist",
    licenseNumber: "DHA-CONS-2021-0941",
    accountStatus: "ACTIVE",
    approvedAt: "2024-02-10T10:00:00Z",
    subscriptionId: "SUB-DOC-701",
    assignedPatientCount: 142,
    totalBookingsCount: 388,
    chamberLocationsSummary: "Al Zahra Pavilion (Dubai) & Executive Clinic (Abu Dhabi)",
    createdAt: "2024-02-08T09:30:00Z",
  },
  {
    id: "ACC-DOC-1002",
    doctorId: "DOC-702",
    fullName: "Dr. Daniel Carter",
    email: "dr.carter@globalbooking.ae",
    phone: "+971 55 987 6543",
    avatar: "/avatars/daniel-carter.jpg",
    specialty: "Dental & Maxillofacial Surgeon",
    licenseNumber: "DHA-SURG-2022-4412",
    accountStatus: "ACTIVE",
    approvedAt: "2024-05-14T11:20:00Z",
    subscriptionId: "SUB-DOC-702",
    assignedPatientCount: 98,
    totalBookingsCount: 246,
    chamberLocationsSummary: "Carter Oral Care Studio, Business Bay",
    createdAt: "2024-05-12T14:15:00Z",
  },
  {
    id: "ACC-DOC-1003",
    doctorId: "DOC-703",
    fullName: "Dr. Sophia Wilson",
    email: "dr.sophia@pediatricwellness.ae",
    phone: "+971 54 321 7890",
    avatar: "/avatars/sophia-wilson.jpg",
    specialty: "Consultant Pediatrician",
    licenseNumber: "DOH-PEDI-2023-8821",
    accountStatus: "TRIAL",
    approvedAt: "2025-04-12T16:00:00Z",
    subscriptionId: "SUB-DOC-703",
    assignedPatientCount: 19,
    totalBookingsCount: 34,
    chamberLocationsSummary: "Kids First Health Pavilion, Al Barsha",
    createdAt: "2025-04-10T10:45:00Z",
  },
  {
    id: "ACC-DOC-1004",
    doctorId: "DOC-704",
    fullName: "Dr. Noah Bennett",
    email: "dr.noah@orthocare.ae",
    phone: "+971 52 456 7890",
    avatar: "/avatars/noah-bennett.jpg",
    specialty: "Orthopedic & Sports Medicine Specialist",
    licenseNumber: "MOH-ORTH-2020-5109",
    accountStatus: "SUSPENDED",
    approvedAt: "2024-01-15T09:00:00Z",
    subscriptionId: "SUB-DOC-704",
    assignedPatientCount: 84,
    totalBookingsCount: 190,
    chamberLocationsSummary: "Sports Medicine Tower, Sharjah",
    createdAt: "2024-01-12T08:00:00Z",
  },
];

/* =========================================================================
   5. REGISTERED & APPROVED HOSPITAL / CLINIC ACCOUNTS
   ========================================================================= */

export const MOCK_MANAGED_HOSPITAL_ACCOUNTS: ManagedHospitalAccount[] = [
  {
    id: "ACC-HSP-2001",
    hospitalId: "HSP-401",
    institutionName: "Al Zahra International Medical Pavilion",
    email: "admissions@alzahrapavilion.ae",
    phone: "+971 4 338 8800",
    avatar: "/images/luxury-lounge.jpg",
    facilityType: "GENERAL_HOSPITAL",
    licenseNumber: "DHA-HOSP-2018-0012",
    accountStatus: "ACTIVE",
    approvedAt: "2024-01-05T09:00:00Z",
    subscriptionId: "SUB-HSP-401",
    departmentCount: 12,
    affiliatedDoctorCount: 48,
    outpatientPatientCount: 1240,
    totalAppointmentsCount: 3820,
    city: "Dubai",
    emirateOrState: "Dubai",
    createdAt: "2024-01-02T10:00:00Z",
  },
  {
    id: "ACC-HSP-2002",
    hospitalId: "HSP-402",
    institutionName: "Prime Care Diagnostic & Specialty Polyclinic",
    email: "reception@primecarepoly.ae",
    phone: "+971 2 660 7711",
    avatar: "/images/luxury-login-bg.jpg",
    facilityType: "POLYCLINIC",
    licenseNumber: "DOH-POLY-2020-0441",
    accountStatus: "ACTIVE",
    approvedAt: "2024-04-18T14:00:00Z",
    subscriptionId: "SUB-HSP-402",
    departmentCount: 6,
    affiliatedDoctorCount: 19,
    outpatientPatientCount: 520,
    totalAppointmentsCount: 1410,
    city: "Abu Dhabi",
    emirateOrState: "Abu Dhabi",
    createdAt: "2024-04-15T09:30:00Z",
  },
  {
    id: "ACC-HSP-2003",
    hospitalId: "HSP-403",
    institutionName: "Crescent Bay Day Surgery Hospital",
    email: "info@crescentbayhospital.ae",
    phone: "+971 6 550 4422",
    avatar: "/images/doctor-hero.jpg",
    facilityType: "DAY_SURGERY_CENTER",
    licenseNumber: "MOH-SURG-2022-1188",
    accountStatus: "TRIAL",
    approvedAt: "2025-04-14T11:00:00Z",
    subscriptionId: "SUB-HSP-403",
    departmentCount: 4,
    affiliatedDoctorCount: 12,
    outpatientPatientCount: 88,
    totalAppointmentsCount: 165,
    city: "Sharjah",
    emirateOrState: "Sharjah",
    createdAt: "2025-04-12T13:20:00Z",
  },
];

/* =========================================================================
   6. ACCOUNT SUBSCRIPTIONS (MONTHLY, SIX_MONTHS, YEARLY EXAMPLES)
   ========================================================================= */

export const MOCK_SUBSCRIPTIONS: Record<string, AccountSubscriptionDetails> = {
  // 1. Doctor Subscription — SIX MONTHS (Active)
  "SUB-DOC-701": {
    id: "SUB-DOC-701",
    accountId: "ACC-DOC-1001",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Sarah Khan",
    planId: "PLAN-DOC-PRACTICE-6M",
    planName: "Specialist Physician Practice Plan",
    billingPeriod: "SIX_MONTHS",
    status: "ACTIVE",
    isTrialActive: false,
    price: createSafeAEDAmount(1890), // AED 1,890.00 for 6 months (stored as 189000 fils)
    startDate: "2024-08-10",
    expiryDate: "2025-08-10",
    renewalDate: "2025-08-10",
    autoRenew: true,
    renewalStatus: "RENEWED",
    paymentStatus: "PAID",
    paymentHistory: [
      {
        id: "PAY-2001",
        subscriptionId: "SUB-DOC-701",
        invoiceNumber: "INV-GB-2025-0012",
        amount: createSafeAEDAmount(1890),
        paymentDate: "2025-02-10T10:14:00Z",
        paymentMethod: "CORPORATE_CARD",
        transactionReference: "TXN-AED-8819401",
        status: "PAID",
        recordedByAdminName: "System Automated Gateway",
      },
      {
        id: "PAY-2002",
        subscriptionId: "SUB-DOC-701",
        invoiceNumber: "INV-GB-2024-0891",
        amount: createSafeAEDAmount(1890),
        paymentDate: "2024-08-10T09:30:00Z",
        paymentMethod: "BANK_TRANSFER",
        transactionReference: "FT-AE-2024-9102",
        status: "PAID",
        recordedByAdminName: "Karim Benali",
      },
    ],
    lifecycleHistory: [
      {
        id: "LFC-101",
        timestamp: "2025-02-10T10:14:00Z",
        eventType: "RENEWED",
        actorAdminName: "Karim Benali (Billing Admin)",
        note: "Subscription renewed for 6 months billing period via Corporate Card.",
        previousExpiryDate: "2025-02-10",
        newExpiryDate: "2025-08-10",
      },
      {
        id: "LFC-102",
        timestamp: "2024-08-10T09:30:00Z",
        eventType: "ACTIVATED",
        actorAdminName: "Dr. Tariq Al-Hashimi (Super Admin)",
        note: "Initial activation after successful verification of DHA license.",
        newExpiryDate: "2025-02-10",
      },
    ],
  },

  // 2. Doctor Subscription — MONTHLY (Active)
  "SUB-DOC-702": {
    id: "SUB-DOC-702",
    accountId: "ACC-DOC-1002",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Daniel Carter",
    planId: "PLAN-DOC-SOLO-1M",
    planName: "Solo Practitioner Monthly",
    billingPeriod: "MONTHLY",
    status: "ACTIVE",
    isTrialActive: false,
    price: createSafeAEDAmount(350), // AED 350.00 per month (35000 fils)
    startDate: "2025-04-01",
    expiryDate: "2025-05-01",
    renewalDate: "2025-05-01",
    autoRenew: true,
    renewalStatus: "RENEWAL_DUE",
    paymentStatus: "PAID",
    paymentHistory: [
      {
        id: "PAY-2003",
        subscriptionId: "SUB-DOC-702",
        invoiceNumber: "INV-GB-2025-0442",
        amount: createSafeAEDAmount(350),
        paymentDate: "2025-04-01T08:00:00Z",
        paymentMethod: "CORPORATE_CARD",
        transactionReference: "TXN-AED-1102934",
        status: "PAID",
        recordedByAdminName: "System Automated Gateway",
      },
    ],
    lifecycleHistory: [
      {
        id: "LFC-103",
        timestamp: "2025-04-01T08:00:00Z",
        eventType: "RENEWED",
        actorAdminName: "System Automated Gateway",
        note: "Monthly renewal charge processed successfully.",
        previousExpiryDate: "2025-04-01",
        newExpiryDate: "2025-05-01",
      },
    ],
  },

  // 3. Doctor Subscription — 7-DAY TRIAL (Active Trial)
  "SUB-DOC-703": {
    id: "SUB-DOC-703",
    accountId: "ACC-DOC-1003",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Sophia Wilson",
    planId: "PLAN-DOC-PRACTICE-TRIAL",
    planName: "Physician Complimentary Trial",
    billingPeriod: "MONTHLY",
    status: "TRIAL",
    isTrialActive: true,
    trialDaysAllocated: 7,
    trialDaysRemaining: 5,
    price: createSafeAEDAmount(0), // Free Trial (0 fils)
    startDate: "2025-04-12",
    expiryDate: "2025-04-19",
    renewalDate: "2025-04-19",
    autoRenew: false,
    renewalStatus: "MANUAL_REQUIRED",
    paymentStatus: "PAID",
    paymentHistory: [],
    lifecycleHistory: [
      {
        id: "LFC-104",
        timestamp: "2025-04-12T16:00:00Z",
        eventType: "TRIAL_ACTIVATED",
        actorAdminName: "Elena Rostova (Operations Admin)",
        note: "Approved 7-day complimentary trial granted upon credential sign-off.",
        newExpiryDate: "2025-04-19",
      },
    ],
  },

  // 4. Doctor Subscription — SUSPENDED (Account / Billing Suspended)
  "SUB-DOC-704": {
    id: "SUB-DOC-704",
    accountId: "ACC-DOC-1004",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Noah Bennett",
    planId: "PLAN-DOC-SOLO-1M",
    planName: "Solo Practitioner Monthly",
    billingPeriod: "MONTHLY",
    status: "SUSPENDED",
    isTrialActive: false,
    price: createSafeAEDAmount(350),
    startDate: "2025-01-15",
    expiryDate: "2025-02-15",
    renewalDate: "2025-02-15",
    autoRenew: false,
    renewalStatus: "OVERDUE",
    paymentStatus: "OVERDUE",
    paymentHistory: [],
    lifecycleHistory: [
      {
        id: "LFC-105",
        timestamp: "2025-02-20T11:00:00Z",
        eventType: "SUSPENDED",
        actorAdminName: "Dr. Tariq Al-Hashimi (Super Admin)",
        note: "Administrative suspension pending license renewal submission.",
      },
    ],
  },

  // 5. Hospital Subscription — YEARLY (Active Institutional Plan)
  "SUB-HSP-401": {
    id: "SUB-HSP-401",
    accountId: "ACC-HSP-2001",
    accountType: "HOSPITAL",
    accountHolderName: "Al Zahra International Medical Pavilion",
    planId: "PLAN-HSP-ENTERPRISE-1Y",
    planName: "Enterprise Hospital Campus Plan",
    billingPeriod: "YEARLY",
    status: "ACTIVE",
    isTrialActive: false,
    price: createSafeAEDAmount(12000), // AED 12,000.00 per year (1,200,000 fils)
    startDate: "2025-01-05",
    expiryDate: "2026-01-05",
    renewalDate: "2026-01-05",
    autoRenew: true,
    renewalStatus: "RENEWED",
    paymentStatus: "PAID",
    paymentHistory: [
      {
        id: "PAY-3001",
        subscriptionId: "SUB-HSP-401",
        invoiceNumber: "INV-HSP-2025-0001",
        amount: createSafeAEDAmount(12000),
        paymentDate: "2025-01-05T11:00:00Z",
        paymentMethod: "BANK_TRANSFER",
        transactionReference: "SWIFT-ALZAHRA-2025-88",
        status: "PAID",
        recordedByAdminName: "Karim Benali",
      },
    ],
    lifecycleHistory: [
      {
        id: "LFC-201",
        timestamp: "2025-01-05T11:00:00Z",
        eventType: "RENEWED",
        actorAdminName: "Karim Benali (Billing Admin)",
        note: "Annual hospital campus subscription renewed for 2025-2026.",
        previousExpiryDate: "2025-01-05",
        newExpiryDate: "2026-01-05",
      },
    ],
  },

  // 6. Hospital Subscription — SIX MONTHS (Active Polyclinic Plan)
  "SUB-HSP-402": {
    id: "SUB-HSP-402",
    accountId: "ACC-HSP-2002",
    accountType: "HOSPITAL",
    accountHolderName: "Prime Care Diagnostic & Specialty Polyclinic",
    planId: "PLAN-HSP-POLYCLINIC-6M",
    planName: "Polyclinic Multi-Department Plan",
    billingPeriod: "SIX_MONTHS",
    status: "ACTIVE",
    isTrialActive: false,
    price: createSafeAEDAmount(4200), // AED 4,200.00 for 6 months (420,000 fils)
    startDate: "2024-10-18",
    expiryDate: "2025-04-18",
    renewalDate: "2025-04-18",
    autoRenew: false,
    renewalStatus: "RENEWAL_DUE",
    paymentStatus: "PENDING",
    paymentHistory: [
      {
        id: "PAY-3002",
        subscriptionId: "SUB-HSP-402",
        invoiceNumber: "INV-HSP-2024-0499",
        amount: createSafeAEDAmount(4200),
        paymentDate: "2024-10-18T09:00:00Z",
        paymentMethod: "CORPORATE_CARD",
        transactionReference: "TXN-PRIME-7788",
        status: "PAID",
        recordedByAdminName: "Karim Benali",
      },
    ],
    lifecycleHistory: [
      {
        id: "LFC-202",
        timestamp: "2024-10-18T09:00:00Z",
        eventType: "ACTIVATED",
        actorAdminName: "Dr. Tariq Al-Hashimi (Super Admin)",
        note: "Bi-annual polyclinic plan activated.",
        newExpiryDate: "2025-04-18",
      },
    ],
  },

  // 7. Hospital Subscription — 7-DAY TRIAL (Active Trial)
  "SUB-HSP-403": {
    id: "SUB-HSP-403",
    accountId: "ACC-HSP-2003",
    accountType: "HOSPITAL",
    accountHolderName: "Crescent Bay Day Surgery Hospital",
    planId: "PLAN-HSP-SURGERY-TRIAL",
    planName: "Day Surgery Institutional Trial",
    billingPeriod: "MONTHLY",
    status: "TRIAL",
    isTrialActive: true,
    trialDaysAllocated: 7,
    trialDaysRemaining: 6,
    price: createSafeAEDAmount(0),
    startDate: "2025-04-14",
    expiryDate: "2025-04-21",
    renewalDate: "2025-04-21",
    autoRenew: false,
    renewalStatus: "MANUAL_REQUIRED",
    paymentStatus: "PAID",
    paymentHistory: [],
    lifecycleHistory: [
      {
        id: "LFC-203",
        timestamp: "2025-04-14T11:00:00Z",
        eventType: "TRIAL_ACTIVATED",
        actorAdminName: "Dr. Tariq Al-Hashimi (Super Admin)",
        note: "Complimentary institutional trial granted for surgical wing evaluation.",
        newExpiryDate: "2025-04-21",
      },
    ],
  },
};

/* =========================================================================
   7. SECURITY & ADMINISTRATIVE AUDIT TRAIL LOGS
   ========================================================================= */

export const MOCK_AUDIT_LOG_ENTRIES: AuditLogEntry[] = [
  {
    id: "AUD-9001",
    timestamp: "2025-04-18T08:15:20Z",
    category: "SECURITY_EVENT",
    action: "ADMIN_LOGIN",
    actor: {
      adminId: "ADM-1001",
      adminName: "Dr. Tariq Al-Hashimi",
      adminEmail: "superadmin@globalbooking.ae",
      adminRole: "SUPER_ADMIN",
    },
    targetType: "ADMIN_USER",
    targetId: "ADM-1001",
    targetName: "Dr. Tariq Al-Hashimi",
    summary: "Super Admin authenticated successfully via hardware-backed 2FA.",
    ipAddress: "194.170.82.14",
  },
  {
    id: "AUD-9002",
    timestamp: "2025-04-17T15:30:10Z",
    category: "SUBSCRIPTION_MANAGEMENT",
    action: "SUBSCRIPTION_EXTENDED",
    actor: {
      adminId: "ADM-1003",
      adminName: "Karim Benali",
      adminEmail: "billing@globalbooking.ae",
      adminRole: "BILLING_ADMIN",
    },
    targetType: "SUBSCRIPTION",
    targetId: "SUB-HSP-402",
    targetName: "Prime Care Diagnostic & Specialty Polyclinic",
    summary: "Granted 7-day administrative grace period extension pending bank wire clearance.",
    reason: "Institutional remittance transfer initiated; awaiting cross-border SWIFT settlement.",
    ipAddress: "194.170.82.19",
  },
  {
    id: "AUD-9003",
    timestamp: "2025-04-16T14:10:00Z",
    category: "REGISTRATION_REVIEW",
    action: "REGISTRATION_APPROVED",
    actor: {
      adminId: "ADM-1002",
      adminName: "Elena Rostova",
      adminEmail: "compliance@globalbooking.ae",
      adminRole: "OPERATIONS_ADMIN",
    },
    targetType: "DOCTOR",
    targetId: "REG-DOC-2025-00",
    targetName: "Dr. Sophia Wilson",
    summary: "Approved physician onboarding application following DOH credential validation.",
    ipAddress: "194.170.82.22",
  },
  {
    id: "AUD-9004",
    timestamp: "2025-04-14T09:45:00Z",
    category: "ACCOUNT_LIFECYCLE",
    action: "ACCOUNT_SUSPENDED",
    actor: {
      adminId: "ADM-1001",
      adminName: "Dr. Tariq Al-Hashimi",
      adminEmail: "superadmin@globalbooking.ae",
      adminRole: "SUPER_ADMIN",
    },
    targetType: "DOCTOR",
    targetId: "ACC-DOC-1004",
    targetName: "Dr. Noah Bennett",
    summary: "Suspended practitioner access following medical malpractice insurance lapse notification.",
    reason: "Mandatory clinical indemnity insurance document expired; access locked until updated policy is uploaded.",
    ipAddress: "194.170.82.14",
  },
  {
    id: "AUD-9005",
    timestamp: "2025-04-12T11:20:00Z",
    category: "SUBSCRIPTION_MANAGEMENT",
    action: "TRIAL_GRANTED",
    actor: {
      adminId: "ADM-1001",
      adminName: "Dr. Tariq Al-Hashimi",
      adminEmail: "superadmin@globalbooking.ae",
      adminRole: "SUPER_ADMIN",
    },
    targetType: "SUBSCRIPTION",
    targetId: "SUB-DOC-703",
    targetName: "Dr. Sophia Wilson",
    summary: "Allocated 7-day complimentary practice trial for pediatrician setup.",
    ipAddress: "194.170.82.14",
  },
];
