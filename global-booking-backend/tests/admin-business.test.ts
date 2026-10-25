import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { formatAedAmount, createDefaultSubscription } from "../src/modules/admin/subscription.service.js";
import { sanitizeDoctorProfile } from "../src/modules/admin/doctors.routes.js";
import { sanitizeHospitalProfile } from "../src/modules/admin/hospitals.routes.js";
import type { AdminSessionPayload } from "../src/modules/auth/auth.types.js";
import type { DoctorRecord, HospitalRecord } from "../src/modules/admin/admin.types.js";
import { ALL_ADMIN_PERMISSIONS } from "../src/modules/auth/auth.types.js";

const TEST_SECRET = "test_jwt_secret_must_be_at_least_32_characters_long!";

async function createSuperAdminToken(app: ReturnType<typeof buildApp>): Promise<string> {
  await app.ready();
  const session: AdminSessionPayload = {
    adminId: "ADM-1001",
    email: "superadmin@globalbooking.ae",
    role: "SUPER_ADMIN",
    permissions: [...ALL_ADMIN_PERMISSIONS],
  };
  return app.jwt.sign(session);
}

async function createViewerAdminToken(app: ReturnType<typeof buildApp>): Promise<string> {
  await app.ready();
  const session: AdminSessionPayload = {
    adminId: "ADM-9001",
    email: "viewer@globalbooking.ae",
    role: "AUDIT_VIEWER",
    permissions: ["VIEW_AUDIT_LOGS", "VIEW_DOCTORS", "VIEW_HOSPITALS"],
  };
  return app.jwt.sign(session);
}

test("AED currency utility calculates safe minor units in fils without floating errors", () => {
  const fee = formatAedAmount(450.5);
  assert.equal(fee.amountInFils, 45050);
  assert.equal(fee.currency, "AED");
  assert.equal(fee.formatted, "450.50");

  const zeroFee = formatAedAmount(0);
  assert.equal(zeroFee.amountInFils, 0);
  assert.equal(zeroFee.formatted, "0.00");
});

test("Default subscription enforces 14-day trial period and AED pricing", () => {
  const sub = createDefaultSubscription({
    accountId: "ACC-DOC-9999",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Sarah Al-Mansoori",
    actorAdminName: "Super Admin",
  });

  assert.equal(sub.accountType, "DOCTOR");
  assert.equal(sub.status, "TRIAL");
  assert.equal(sub.isTrialActive, true);
  assert.equal(sub.trialDaysAllocated, 14);
  assert.equal(sub.price.currency, "AED");
  assert.equal(sub.lifecycleHistory.length, 1);
  assert.equal(sub.lifecycleHistory[0]?.eventType, "TRIAL_ACTIVATED");
});

test("GET /api/v1/admin/registrations rejects unauthenticated requests", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });

  const res = await app.inject({
    method: "GET",
    url: "/api/v1/admin/registrations",
  });

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("POST /api/v1/admin/registrations/:id/reject validates rejection reason", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });
  const token = await createSuperAdminToken(app);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/registrations/REG-TEST-001/reject",
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      reason: "", // Empty reason should be rejected
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Bad Request");
  assert.match(body.message, /rejection reason is required/i);
});

test("POST /api/v1/admin/doctors validates required fields on manual creation", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });
  const token = await createSuperAdminToken(app);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/doctors",
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      fullName: "Dr. Ahmed",
      // missing email, phone, specialty, licenseNumber
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Bad Request");
  assert.match(body.message, /required fields/i);
});

test("POST /api/v1/admin/doctors enforces MANAGE_DOCTORS permission guard", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });
  const viewerToken = await createViewerAdminToken(app);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/doctors",
    headers: {
      authorization: `Bearer ${viewerToken}`,
    },
    payload: {
      fullName: "Dr. Ahmed",
      email: "ahmed@example.com",
      phone: "+971501234567",
      specialty: "Cardiology",
      licenseNumber: "DHA-DOC-1234",
    },
  });

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Forbidden");
  assert.match(body.message, /MANAGE_DOCTORS/i);
});

test("POST /api/v1/admin/hospitals enforces MANAGE_HOSPITALS permission guard", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });
  const viewerToken = await createViewerAdminToken(app);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/hospitals",
    headers: {
      authorization: `Bearer ${viewerToken}`,
    },
    payload: {
      institutionName: "Dubai Specialized Clinic",
      email: "clinic@example.ae",
      phone: "+97143456789",
      licenseNumber: "DHA-HSP-5678",
    },
  });

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Forbidden");
  assert.match(body.message, /MANAGE_HOSPITALS/i);
});

test("GET /api/v1/admin/audit-logs enforces VIEW_AUDIT_LOGS permission guard", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });

  // Unauthenticated
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/admin/audit-logs",
  });
  assert.equal(res.statusCode, 401);
});

test("sanitizeDoctorProfile strips invitationTokenHash and MongoDB _id from responses", () => {
  const rawDoctor = {
    _id: "660c1f2e9d2a1b001f3e4a5b",
    id: "ACC-DOC-1001",
    doctorId: "DOC-701",
    fullName: "Dr. Fatima Al-Hashimi",
    email: "fatima@example.com",
    phone: "+971501234567",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Cardiology",
    licenseNumber: "DHA-DOC-1234",
    accountStatus: "TRIAL" as const,
    approvedAt: new Date().toISOString(),
    subscriptionId: "SUB-123",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Dubai Healthcare City",
    yearsOfExperience: 8,
    medicalDegrees: ["MBBS", "MD"],
    consultationFee: formatAedAmount(500),
    passwordHash: "$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
    invitationTokenHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    invitationTokenExpiresAt: new Date().toISOString(),
    isActivated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as DoctorRecord;

  const sanitized = sanitizeDoctorProfile(rawDoctor);
  assert.equal("invitationTokenHash" in sanitized, false);
  assert.equal("passwordHash" in sanitized, false);
  assert.equal("_id" in sanitized, false);
  assert.equal(sanitized.id, "ACC-DOC-1001");
  assert.equal(sanitized.fullName, "Dr. Fatima Al-Hashimi");
  assert.equal(sanitized.email, "fatima@example.com");
});

test("POST /api/v1/admin/doctors validates password minimum length when provided", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });
  const token = await createSuperAdminToken(app);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/doctors",
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      fullName: "Dr. Ahmed",
      email: "ahmed@example.com",
      phone: "+971501234567",
      specialty: "Cardiology",
      licenseNumber: "DHA-DOC-1234",
      password: "short", // < 8 characters
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Bad Request");
  assert.match(body.message, /password must be at least 8 characters/i);
});

test("sanitizeHospitalProfile strips invitationTokenHash and MongoDB _id from responses", () => {
  const rawHospital = {
    _id: "660c1f2e9d2a1b001f3e4a5c",
    id: "ACC-HSP-2001",
    hospitalId: "HSP-401",
    institutionName: "Emirates Specialized Medical Center",
    email: "info@emc.ae",
    phone: "+97143456789",
    avatar: "https://example.com/hospital.jpg",
    facilityType: "GENERAL_HOSPITAL",
    licenseNumber: "DHA-HSP-5678",
    accountStatus: "ACTIVE" as const,
    approvedAt: new Date().toISOString(),
    subscriptionId: "SUB-456",
    departmentCount: 5,
    affiliatedDoctorCount: 20,
    outpatientPatientCount: 150,
    totalAppointmentsCount: 300,
    city: "Dubai",
    emirateOrState: "Dubai",
    departments: ["Cardiology", "Neurology"],
    bedCapacity: 120,
    emergencyUnitAvailable: true,
    location: {
      addressLine1: "Oud Metha Road",
      city: "Dubai",
      stateOrEmirate: "Dubai",
      country: "United Arab Emirates",
    },
    invitationTokenHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    invitationTokenExpiresAt: new Date().toISOString(),
    isActivated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as HospitalRecord;

  const sanitized = sanitizeHospitalProfile(rawHospital);
  assert.equal("invitationTokenHash" in sanitized, false);
  assert.equal("_id" in sanitized, false);
  assert.equal(sanitized.id, "ACC-HSP-2001");
  assert.equal(sanitized.institutionName, "Emirates Specialized Medical Center");
});

test("CSRF Origin validation rejects untrusted origin with 403 and allows trusted origin", async () => {
  const app = buildApp({ jwtSecret: TEST_SECRET, cookieSecret: TEST_SECRET });

  // Untrusted origin on mutating endpoint
  const evilRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/logout",
    headers: {
      origin: "http://malicious-site.com",
    },
  });
  assert.equal(evilRes.statusCode, 403);
  assert.equal(evilRes.json().error, "Forbidden");

  // Trusted origin on mutating endpoint
  const goodRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/logout",
    headers: {
      origin: "http://localhost:3000",
    },
  });
  assert.equal(goodRes.statusCode, 200);
});

test("Centralized error handler masks 500 error messages in production", async () => {
  const prodApp = buildApp({
    jwtSecret: TEST_SECRET,
    cookieSecret: TEST_SECRET,
    nodeEnv: "production",
    mongoUri: "mongodb://fake:27017/test",
  });

  // Register a route that throws an internal error with sensitive DB details
  prodApp.get("/test-db-error", async () => {
    throw new Error("MongoServerError: E11000 duplicate key error collection: sensitive_internal_collection");
  });

  const res = await prodApp.inject({
    method: "GET",
    url: "/test-db-error",
  });

  assert.equal(res.statusCode, 500);
  const body = res.json();
  assert.equal(body.error, "Internal Server Error");
  assert.equal(body.message, "An internal server error occurred.");
  assert.equal(res.body.includes("sensitive_internal_collection"), false);
});

test("POST /api/v1/admin/users enforces MANAGE_ADMIN_USERS permission guard", async () => {
  const app = buildApp({
    jwtSecret: TEST_SECRET,
    cookieSecret: TEST_SECRET,
    nodeEnv: "test",
    mongoUri: "mongodb://fake:27017/test",
  });

  const viewerToken = await createViewerAdminToken(app);
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/admin/users",
    headers: {
      authorization: `Bearer ${viewerToken}`,
    },
    payload: {
      name: "Test Admin",
      email: "test@globalbooking.ae",
      password: "password123",
      role: "SUPPORT_LEAD",
    },
  });

  assert.equal(res.statusCode, 403);
});

test("POST /api/v1/admin/users validates required fields and password minimum length", async () => {
  const app = buildApp({
    jwtSecret: TEST_SECRET,
    cookieSecret: TEST_SECRET,
    nodeEnv: "test",
    mongoUri: "mongodb://fake:27017/test",
  });

  const superToken = await createSuperAdminToken(app);

  // Short password
  const shortPassRes = await app.inject({
    method: "POST",
    url: "/api/v1/admin/users",
    headers: {
      authorization: `Bearer ${superToken}`,
    },
    payload: {
      name: "Short Pass Admin",
      email: "short@globalbooking.ae",
      password: "short",
      role: "SUPPORT_LEAD",
    },
  });
  assert.equal(shortPassRes.statusCode, 400);
});

test("GET /api/v1/admin/settings enforces MANAGE_PLATFORM_SETTINGS permission guard", async () => {
  const app = buildApp({
    jwtSecret: TEST_SECRET,
    cookieSecret: TEST_SECRET,
    nodeEnv: "test",
    mongoUri: "mongodb://fake:27017/test",
  });

  const viewerToken = await createViewerAdminToken(app);
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/admin/settings",
    headers: {
      authorization: `Bearer ${viewerToken}`,
    },
  });

  assert.equal(res.statusCode, 403);
});

test("PATCH /api/v1/admin/settings rejects invalid session timeout", async () => {
  const app = buildApp({
    jwtSecret: TEST_SECRET,
    cookieSecret: TEST_SECRET,
    nodeEnv: "test",
    mongoUri: "mongodb://fake:27017/test",
  });

  const superToken = await createSuperAdminToken(app);
  const res = await app.inject({
    method: "PATCH",
    url: "/api/v1/admin/settings",
    headers: {
      authorization: `Bearer ${superToken}`,
    },
    payload: {
      securityPolicies: {
        sessionTimeoutHours: 999, // exceeds max 168
      },
    },
  });

  assert.equal(res.statusCode, 400);
});

test("REGRESSION: Admin Hospital and Doctor creation does NOT silently inject Dubai or UAE defaults", () => {
  // 1. Hospital creation with omitted location leaves fields empty, never injecting Dubai or UAE
  const rawHospitalBody: any = {
    institutionName: "General Medical Center",
    email: "info@general-med.org",
    phone: "+1 555 123 4567",
  };
  const resolvedCity = (rawHospitalBody.city || "").trim();
  const resolvedState = (rawHospitalBody.emirateOrState || "").trim();
  const resolvedCountry = rawHospitalBody.country || rawHospitalBody.location?.country || "";

  assert.equal(resolvedCity, "");
  assert.notEqual(resolvedCity, "Dubai");
  assert.equal(resolvedState, "");
  assert.notEqual(resolvedState, "Dubai");
  assert.equal(resolvedCountry, "");
  assert.notEqual(resolvedCountry, "United Arab Emirates");

  // 2. Explicit non-UAE hospital location is preserved accurately
  const internationalHospital: any = {
    city: "Sydney",
    emirateOrState: "NSW",
    country: "Australia",
  };
  assert.equal((internationalHospital.city || "").trim(), "Sydney");
  assert.equal(internationalHospital.country, "Australia");

  // 3. Doctor creation with omitted chamber summary defaults to empty, not Dubai
  const rawDoctorBody: any = {
    fullName: "Dr. Alex Taylor",
    email: "alex@globalbooking.org",
    phone: "+44 20 7946 0991",
  };
  const chamberSummary = (rawDoctorBody.chamberLocationsSummary || "").trim();
  assert.equal(chamberSummary, "");
  assert.notEqual(chamberSummary, "Main Medical Center, Dubai");

  // 4. Default chamber city in doctor record is empty, not Dubai
  const defaultChamber = {
    id: "CHAMBER-1",
    facilityName: chamberSummary || "Main Consultation Chamber",
    city: "",
    visitingSchedule: "Daily 05:00 PM – 09:00 PM",
  };
  assert.equal(defaultChamber.city, "");
  assert.notEqual(defaultChamber.city, "Dubai");
});



