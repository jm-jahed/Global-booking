import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import {
  generateSafeDoctorSlug,
  isValidDoctorSlug,
} from "../src/modules/portal/doctor-portal.routes.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import type { AdminSessionPayload } from "../src/modules/auth/auth.types.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";

/* =========================================================================
   1. DOCTOR SLUG NORMALIZATION & VALIDATION TESTS
   ========================================================================= */

test("generateSafeDoctorSlug creates clean kebab-case URL slugs", () => {
  assert.equal(generateSafeDoctorSlug("Dr. Sarah Khan", "DOC-701"), "dr-sarah-khan");
  assert.equal(generateSafeDoctorSlug("Dr. Tariq Al-Hashimi, M.D.", "DOC-802"), "dr-tariq-al-hashimi-md");
  assert.equal(generateSafeDoctorSlug("   Prof. Dr. Ahmed   Al-Mansoor   ", "DOC-903"), "prof-dr-ahmed-al-mansoor");
  assert.equal(generateSafeDoctorSlug("!@#$%", "DOC-1004"), "doc1004");
});

test("isValidDoctorSlug validates slug format strictly", () => {
  assert.equal(isValidDoctorSlug("dr-sarah-khan"), true);
  assert.equal(isValidDoctorSlug("dr-tariq-al-hashimi"), true);
  assert.equal(isValidDoctorSlug("doc-701"), true);

  // Invalid: uppercase, spaces, special chars, leading/trailing hyphens
  assert.equal(isValidDoctorSlug("Dr-Sarah-Khan"), false);
  assert.equal(isValidDoctorSlug("dr sarah khan"), false);
  assert.equal(isValidDoctorSlug("-dr-sarah-khan"), false);
  assert.equal(isValidDoctorSlug("dr-sarah-khan-"), false);
  assert.equal(isValidDoctorSlug("d"), false); // too short (< 2)
  assert.equal(isValidDoctorSlug("dr_sarah"), false); // underscore not allowed
});

/* =========================================================================
   2. DOCTOR PORTAL ENDPOINT AUTHORIZATION & DATA PERSISTENCE TESTS
   ========================================================================= */

test("GET /api/v1/portal/doctor/profile rejects unauthenticated request with 401", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/profile",
  });

  assert.equal(response.statusCode, 401);
  const body = JSON.parse(response.body);
  assert.equal(body.error, "Unauthorized");
});

test("GET /api/v1/portal/doctor/profile rejects non-Doctor role with 403 Forbidden", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  // Create token for SUPER_ADMIN
  const adminSession: AdminSessionPayload = {
    adminId: "ADM-1001",
    email: "admin@globalbooking.ae",
    role: "SUPER_ADMIN",
    permissions: ["VIEW_DOCTORS"],
  };
  const token = app.jwt.sign(adminSession);

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/profile",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.statusCode, 403);
  const body = JSON.parse(response.body);
  assert.equal(body.error, "Forbidden");
  assert.ok(body.message.includes("restricted to verified Doctor accounts"));
});

test("GET and PATCH /api/v1/portal/doctor/profile enforces ownership and updates profile", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  // Mock doctor record
  const mockDoctor: DoctorRecord = {
    id: "ACC-DOC-7001",
    doctorId: "DOC-7001",
    fullName: "Dr. Sarah Khan",
    email: "dr.sarah@globalbooking.ae",
    phone: "+971501234567",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Consultant Cardiologist",
    licenseNumber: "DHA-DOC-12345",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-123",
    assignedPatientCount: 15,
    totalBookingsCount: 42,
    chamberLocationsSummary: "Mediclinic City Hospital, Dubai",
    yearsOfExperience: 14,
    medicalDegrees: ["MBBS", "MD", "FRCP"],
    consultationFee: {
      amountInFils: 50000,
      currency: "AED",
      formatted: "AED 500.00",
    },
    passwordHash: "$2b$12$super_secret_hash_value_never_expose",
    invitationTokenHash: "sha256_invitation_hash_never_expose",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  // Mock in-memory database store
  let storedDoctor = { ...mockDoctor };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  // Override connection and collection for isolated unit testing
  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) {
        return { ...storedDoctor };
      }
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some(
          (clause: any) =>
            (clause.id && clause.id === storedDoctor.id) ||
            (clause.doctorId && clause.doctorId === storedDoctor.doctorId),
        );
        if (matches) return { ...storedDoctor };
      }
      if (query.slug && query.slug === storedDoctor.slug && query.id?.$ne !== storedDoctor.id) {
        return { ...storedDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, update: any) => {
      if (filter.id === storedDoctor.id) {
        storedDoctor = { ...storedDoctor, ...update.$set };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    // Generate valid Doctor session JWT
    const doctorSession: AdminSessionPayload = {
      adminId: "ACC-DOC-7001",
      email: "dr.sarah@globalbooking.ae",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    };
    const token = app.jwt.sign(doctorSession);

    // 1. Test GET profile
    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.equal(getBody.doctor.fullName, "Dr. Sarah Khan");
    assert.equal(getBody.doctor.specialty, "Consultant Cardiologist");
    assert.equal(getBody.doctor.slug, "dr-sarah-khan");
    assert.equal(getBody.doctor.consultationFee.formatted, "AED 500.00");

    // CRITICAL PRIVACY CHECK: passwordHash and invitationTokenHash MUST NEVER BE PRESENT
    assert.equal(getBody.doctor.passwordHash, undefined);
    assert.equal(getBody.doctor.invitationTokenHash, undefined);

    // 2. Test PATCH profile: update bio, languages, consultationFeeAed, and chambers
    const patchRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        bio: "Specializing in advanced cardiology, preventative cardiovascular wellness, and hypertension care.",
        languages: ["English", "Arabic", "Urdu"],
        consultationFeeAed: 650,
        yearsOfExperience: 15,
        medicalDegrees: ["MBBS", "MD (Cardiology)", "FRCP (London)"],
        isPublished: true,
        chambers: [
          {
            id: "CH-1",
            facilityName: "Mediclinic City Hospital",
            city: "Dubai",
            roomNumber: "Suite 402",
            visitingSchedule: "Mon - Thu: 5:00 PM - 9:00 PM",
            contactPhone: "+971 4 435 9999",
          },
        ],
        // MALICIOUS TAMPERING ATTEMPT: try to change ID, license, or status
        id: "ACC-DOC-HACKED",
        doctorId: "DOC-HACKED",
        licenseNumber: "DHA-FAKE",
        accountStatus: "SUPER_ADMIN",
      },
    });

    assert.equal(patchRes.statusCode, 200);
    const patchBody = JSON.parse(patchRes.body);
    assert.equal(patchBody.success, true);
    assert.equal(patchBody.doctor.bio, "Specializing in advanced cardiology, preventative cardiovascular wellness, and hypertension care.");
    assert.deepEqual(patchBody.doctor.languages, ["English", "Arabic", "Urdu"]);
    assert.equal(patchBody.doctor.consultationFee.formatted, "AED 650.00");
    assert.equal(patchBody.doctor.consultationFee.amountInFils, 65000);
    assert.equal(patchBody.doctor.isPublished, true);
    assert.equal(patchBody.doctor.chambers.length, 1);
    assert.equal(patchBody.doctor.chambers[0].facilityName, "Mediclinic City Hospital");

    // VERIFY TAMPER RESISTANCE: Immutable identifiers MUST NOT change
    assert.equal(patchBody.doctor.id, "ACC-DOC-7001");
    assert.equal(patchBody.doctor.doctorId, "DOC-7001");
    assert.equal(patchBody.doctor.licenseNumber, "DHA-DOC-12345");
    assert.equal(patchBody.doctor.accountStatus, "ACTIVE");

    // 3. Test validation error: negative fee
    const invalidFeeRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { consultationFeeAed: -100 },
    });
    assert.equal(invalidFeeRes.statusCode, 400);

    // 4. Test validation error: invalid slug format
    const invalidSlugRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { slug: "INVALID SLUG WITH SPACES!" },
    });
    assert.equal(invalidSlugRes.statusCode, 400);

  } finally {
    // Restore mocks
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

/* =========================================================================
   3. MULTI-DOCTOR SESSION ISOLATION & CROSS-LEAKAGE REGRESSION TESTS
   ========================================================================= */

test("MULTI-DOCTOR SESSION ISOLATION: Doctor A and Doctor B receive strictly isolated profiles with zero cross-leakage", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctorA: DoctorRecord = {
    id: "ACC-DOC-AAA",
    doctorId: "DOC-AAA",
    fullName: "Dr. Tariq Al-Hashimi",
    email: "dr.tariq@example.ae",
    phone: "+971501111111",
    avatar: "https://example.com/tariq.jpg",
    specialty: "Consultant Neurologist",
    licenseNumber: "LIC-AAA-111",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-AAA",
    assignedPatientCount: 10,
    totalBookingsCount: 20,
    chamberLocationsSummary: "Neurology Center, Dubai",
    yearsOfExperience: 12,
    medicalDegrees: ["MBBS", "MD (Neurology)"],
    consultationFee: { amountInFils: 60000, currency: "AED", formatted: "AED 600.00" },
    slug: "dr-tariq-al-hashimi",
    isPublished: true,
    chambers: [{ id: "CH-1", facilityName: "Dubai Neuroscience Clinic", city: "Dubai", visitingSchedule: "Daily" }],
    passwordHash: "secret_hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const doctorB: DoctorRecord = {
    id: "ACC-DOC-BBB",
    doctorId: "DOC-BBB",
    fullName: "Dr. Rashid Al Mamun",
    email: "dr.rashid@booking.com",
    phone: "+971502222222",
    avatar: "https://example.com/rashid.jpg",
    specialty: "Consultant Orthopedic Surgeon",
    licenseNumber: "LIC-BBB-222",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-BBB",
    assignedPatientCount: 15,
    totalBookingsCount: 30,
    chamberLocationsSummary: "Bone & Joint Center, Dubai",
    yearsOfExperience: 16,
    medicalDegrees: ["MBBS", "MS (Ortho)", "FRCS"],
    consultationFee: { amountInFils: 70000, currency: "AED", formatted: "AED 700.00" },
    slug: "dr-rashid-al-mamun",
    isPublished: true,
    chambers: [{ id: "CH-2", facilityName: "Emirates Orthopedic Hospital", city: "Dubai", visitingSchedule: "Daily" }],
    passwordHash: "secret_hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      const matchDoc = (doc: DoctorRecord) => {
        if (query.id === doc.id || query.doctorId === doc.doctorId) return true;
        if (Array.isArray(query.$or)) {
          return query.$or.some(
            (c: any) => (c.id && c.id === doc.id) || (c.doctorId && c.doctorId === doc.doctorId),
          );
        }
        return false;
      };
      if (matchDoc(doctorA)) return { ...doctorA };
      if (matchDoc(doctorB)) return { ...doctorB };
      return null;
    },
    updateOne: async (_filter: any, _update: any) => {
      return { matchedCount: 1, modifiedCount: 1 };
    },
  });

  try {
    const tokenA = app.jwt.sign({
      adminId: "ACC-DOC-AAA",
      email: "dr.tariq@example.ae",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    const tokenB = app.jwt.sign({
      adminId: "ACC-DOC-BBB",
      email: "dr.rashid@booking.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    // 1. Doctor A fetches profile
    const resA = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resA.statusCode, 200);
    const bodyA = JSON.parse(resA.body);
    assert.equal(bodyA.doctor.fullName, "Dr. Tariq Al-Hashimi");
    assert.equal(bodyA.doctor.slug, "dr-tariq-al-hashimi");
    assert.equal(bodyA.doctor.specialty, "Consultant Neurologist");
    assert.notEqual(bodyA.doctor.fullName, "Dr. Rashid Al Mamun");

    // 2. Doctor B fetches profile
    const resB = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resB.statusCode, 200);
    const bodyB = JSON.parse(resB.body);
    assert.equal(bodyB.doctor.fullName, "Dr. Rashid Al Mamun");
    assert.equal(bodyB.doctor.slug, "dr-rashid-al-mamun");
    assert.equal(bodyB.doctor.specialty, "Consultant Orthopedic Surgeon");
    assert.notEqual(bodyB.doctor.fullName, "Dr. Tariq Al-Hashimi");

    // 3. /api/v1/auth/admin/me session isolation
    const meA = await app.inject({
      method: "GET",
      url: "/api/v1/auth/admin/me",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(meA.statusCode, 200);
    const meBodyA = JSON.parse(meA.body);
    assert.equal(meBodyA.user.name, "Dr. Tariq Al-Hashimi");
    assert.equal(meBodyA.user.slug, "dr-tariq-al-hashimi");

    const meB = await app.inject({
      method: "GET",
      url: "/api/v1/auth/admin/me",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(meB.statusCode, 200);
    const meBodyB = JSON.parse(meB.body);
    assert.equal(meBodyB.user.name, "Dr. Rashid Al Mamun");
    assert.equal(meBodyB.user.slug, "dr-rashid-al-mamun");

    // 4. Tamper resistance: Doctor B attempting to pass doctor A's ID in PATCH payload cannot overwrite doctor A
    const tamperRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        id: "ACC-DOC-AAA",
        fullName: "Hacked Name",
      },
    });
    assert.equal(tamperRes.statusCode, 200);
    const tamperBody = JSON.parse(tamperRes.body);
    assert.equal(tamperBody.doctor.id, "ACC-DOC-BBB");
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

/* =========================================================================
   4. DOCTOR PROFILE PERSISTENCE & DATA-LOSS PROTECTION REGRESSION TESTS
   ========================================================================= */

test("REGRESSION: Consultation fee of 0 is preserved accurately without defaulting", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  let storedDoctor: DoctorRecord = {
    id: "ACC-DOC-ZERO",
    doctorId: "DOC-ZERO",
    fullName: "Dr. Zero Fee",
    email: "dr.zero@example.com",
    phone: "+971500000000",
    avatar: "https://example.com/avatar.jpg",
    specialty: "General Medicine",
    licenseNumber: "LIC-ZERO-000",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-ZERO",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Free Clinic",
    yearsOfExperience: 5,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    slug: "dr-zero-fee",
    isPublished: true,
    passwordHash: "hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) return { ...storedDoctor };
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some((c: any) => c.id === storedDoctor.id || c.doctorId === storedDoctor.doctorId);
        if (matches) return { ...storedDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, update: any) => {
      if (filter.id === storedDoctor.id) {
        storedDoctor = { ...storedDoctor, ...update.$set };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    const token = app.jwt.sign({
      adminId: "ACC-DOC-ZERO",
      email: "dr.zero@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    // 1. Update consultationFeeAed to 0
    const patchRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { consultationFeeAed: 0 },
    });
    assert.equal(patchRes.statusCode, 200);
    const patchBody = JSON.parse(patchRes.body);
    assert.equal(patchBody.doctor.consultationFee.amountInFils, 0);
    assert.equal(patchBody.doctor.consultationFee.formatted, "AED 0.00");

    // 2. Fetch profile and verify 0 remains 0
    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.equal(getBody.doctor.consultationFee.amountInFils, 0);
    assert.equal(getBody.doctor.consultationFee.formatted, "AED 0.00");
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

test("REGRESSION: Chamber timezone is preserved on edits and invalid timezones are rejected", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  let storedDoctor: DoctorRecord = {
    id: "ACC-DOC-TZ",
    doctorId: "DOC-TZ",
    fullName: "Dr. Timezone Preserved",
    email: "dr.tz@example.com",
    phone: "+971501112233",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Endocrinology",
    licenseNumber: "LIC-TZ-100",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-TZ",
    assignedPatientCount: 1,
    totalBookingsCount: 1,
    chamberLocationsSummary: "Dhaka & Dubai clinics",
    yearsOfExperience: 8,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 30000, currency: "AED", formatted: "AED 300.00" },
    slug: "dr-timezone-preserved",
    isPublished: true,
    chambers: [
      {
        id: "CH-DHAKA",
        facilityName: "Dhaka Specialized Hospital",
        city: "Dhaka",
        visitingSchedule: "Fri - Sat",
        timezone: "Asia/Dhaka",
      },
      {
        id: "CH-DUBAI",
        facilityName: "Dubai Healthcare Center",
        city: "Dubai",
        visitingSchedule: "Mon - Wed",
        timezone: "Asia/Dubai",
      },
    ],
    passwordHash: "hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) return { ...storedDoctor };
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some((c: any) => c.id === storedDoctor.id || c.doctorId === storedDoctor.doctorId);
        if (matches) return { ...storedDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, update: any) => {
      if (filter.id === storedDoctor.id) {
        storedDoctor = { ...storedDoctor, ...update.$set };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    const token = app.jwt.sign({
      adminId: "ACC-DOC-TZ",
      email: "dr.tz@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    // 1. Edit roomNumber and schedule WITHOUT sending timezone for CH-DHAKA
    const patchRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        chambers: [
          {
            id: "CH-DHAKA",
            facilityName: "Dhaka Specialized Hospital",
            city: "Dhaka",
            roomNumber: "Room 501",
            visitingSchedule: "Updated Schedule",
            // timezone omitted intentionally
          },
          {
            id: "CH-DUBAI",
            facilityName: "Dubai Healthcare Center",
            city: "Dubai",
            timezone: "Asia/Dubai",
          },
        ],
      },
    });

    assert.equal(patchRes.statusCode, 200);
    const patchBody = JSON.parse(patchRes.body);
    const dhakaChamber = patchBody.doctor.chambers.find((c: any) => c.id === "CH-DHAKA");
    assert.equal(dhakaChamber.roomNumber, "Room 501");
    // Verify existing chamber timezone was NOT wiped or replaced with default
    assert.equal(dhakaChamber.timezone, "Asia/Dhaka");

    // 2. Reject invalid IANA timezone
    const invalidTzRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        chambers: [
          {
            id: "CH-DHAKA",
            facilityName: "Dhaka Specialized Hospital",
            city: "Dhaka",
            timezone: "Mars/Invalid_Timezone",
          },
        ],
      },
    });
    assert.equal(invalidTzRes.statusCode, 400);
    const errBody = JSON.parse(invalidTzRes.body);
    assert.ok(errBody.message.includes("Invalid IANA timezone"));
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

test("REGRESSION: Doctor identity resolves accurately with either account id or entity doctorId", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const storedDoctor: DoctorRecord = {
    id: "ACC-DOC-DUAL",
    doctorId: "DOC-DUAL-777",
    fullName: "Dr. Dual Identity",
    email: "dr.dual@example.com",
    phone: "+971509998877",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Dermatology",
    licenseNumber: "LIC-DUAL-777",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-DUAL",
    assignedPatientCount: 3,
    totalBookingsCount: 5,
    chamberLocationsSummary: "Dual Clinic",
    yearsOfExperience: 7,
    medicalDegrees: ["MBBS", "DDV"],
    consultationFee: { amountInFils: 40000, currency: "AED", formatted: "AED 400.00" },
    slug: "dr-dual-identity",
    isPublished: true,
    passwordHash: "hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) return { ...storedDoctor };
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some((c: any) => c.id === storedDoctor.id || c.doctorId === storedDoctor.doctorId);
        if (matches) return { ...storedDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, _update: any) => {
      if (filter.id === storedDoctor.id) {
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    // 1. Session using account id "ACC-DOC-DUAL"
    const tokenById = app.jwt.sign({
      adminId: "ACC-DOC-DUAL",
      email: "dr.dual@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    const resById = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${tokenById}` },
    });
    assert.equal(resById.statusCode, 200);
    const bodyById = JSON.parse(resById.body);
    assert.equal(bodyById.doctor.fullName, "Dr. Dual Identity");
    assert.equal(bodyById.doctor.id, "ACC-DOC-DUAL");
    assert.equal(bodyById.doctor.doctorId, "DOC-DUAL-777");

    // 2. Session using entity doctorId "DOC-DUAL-777"
    const tokenByDoctorId = app.jwt.sign({
      adminId: "DOC-DUAL-777",
      email: "dr.dual@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    const resByDocId = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${tokenByDoctorId}` },
    });
    assert.equal(resByDocId.statusCode, 200);
    const bodyByDocId = JSON.parse(resByDocId.body);
    assert.equal(bodyByDocId.doctor.fullName, "Dr. Dual Identity");
    assert.equal(bodyByDocId.doctor.id, "ACC-DOC-DUAL");
    assert.equal(bodyByDocId.doctor.doctorId, "DOC-DUAL-777");
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

test("REGRESSION: Safe slug fallback generation and conflict rejection", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  let storedDoctor: DoctorRecord = {
    id: "ACC-DOC-SLUG",
    doctorId: "DOC-SLUG-99",
    fullName: "Dr. Amina Rahman",
    email: "dr.amina@example.com",
    phone: "+971507778899",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Pediatrics",
    licenseNumber: "LIC-SLUG-99",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-SLUG",
    assignedPatientCount: 2,
    totalBookingsCount: 4,
    chamberLocationsSummary: "Pediatric Wing",
    yearsOfExperience: 9,
    medicalDegrees: ["MBBS", "FCPS"],
    consultationFee: { amountInFils: 35000, currency: "AED", formatted: "AED 350.00" },
    slug: "dr-amina-rahman",
    isPublished: true,
    passwordHash: "hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const otherDoctor: DoctorRecord = {
    ...storedDoctor,
    id: "ACC-DOC-OTHER",
    doctorId: "DOC-OTHER-101",
    fullName: "Dr. Other Doctor",
    slug: "already-taken-slug",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) return { ...storedDoctor };
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some((c: any) => c.id === storedDoctor.id || c.doctorId === storedDoctor.doctorId);
        if (matches) return { ...storedDoctor };
      }
      if (query.slug === "already-taken-slug" && query.id?.$ne === storedDoctor.id) {
        return { ...otherDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, update: any) => {
      if (filter.id === storedDoctor.id) {
        storedDoctor = { ...storedDoctor, ...update.$set };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    const token = app.jwt.sign({
      adminId: "ACC-DOC-SLUG",
      email: "dr.amina@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    // 1. Sending an explicitly empty slug generates a safe slug from doctor name
    const emptySlugRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { slug: "" },
    });
    assert.equal(emptySlugRes.statusCode, 200);
    const emptySlugBody = JSON.parse(emptySlugRes.body);
    assert.equal(emptySlugBody.doctor.slug, "dr-amina-rahman");

    // 2. Attempting to claim an already taken slug returns 409 Conflict
    const conflictRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { slug: "already-taken-slug" },
    });
    assert.equal(conflictRes.statusCode, 409);
    const conflictBody = JSON.parse(conflictRes.body);
    assert.equal(conflictBody.error, "Conflict");
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

test("REGRESSION: Legitimate intentional field clearing succeeds after load", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  let storedDoctor: DoctorRecord = {
    id: "ACC-DOC-CLEAR",
    doctorId: "DOC-CLEAR-01",
    fullName: "Dr. Clear Fields",
    email: "dr.clear@example.com",
    phone: "+971501239876",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Oncology",
    customTitle: "Senior Consultant Oncologist",
    bio: "Detailed bio before clearing.",
    chamberLocationsSummary: "Main Hospital Wing",
    licenseNumber: "LIC-CLEAR-01",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-CLEAR",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    yearsOfExperience: 10,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    slug: "dr-clear-fields",
    isPublished: true,
    services: [{ id: "SRV-1", title: "Cancer Screening" }],
    passwordHash: "hash",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const originalIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const originalGetDoctorCollection = mongoAdapter.getDoctorCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;
  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      if (query.id === storedDoctor.id || query.doctorId === storedDoctor.doctorId) return { ...storedDoctor };
      if (Array.isArray(query.$or)) {
        const matches = query.$or.some((c: any) => c.id === storedDoctor.id || c.doctorId === storedDoctor.doctorId);
        if (matches) return { ...storedDoctor };
      }
      return null;
    },
    updateOne: async (filter: any, update: any) => {
      if (filter.id === storedDoctor.id) {
        storedDoctor = { ...storedDoctor, ...update.$set };
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  try {
    const token = app.jwt.sign({
      adminId: "ACC-DOC-CLEAR",
      email: "dr.clear@example.com",
      role: "DOCTOR",
      permissions: ["VIEW_DOCTORS"],
    });

    // Intentionally clear bio, customTitle, and chamberLocationsSummary
    const clearRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        bio: "",
        customTitle: "",
        chamberLocationsSummary: "",
        services: [],
      },
    });

    assert.equal(clearRes.statusCode, 200);
    const clearBody = JSON.parse(clearRes.body);
    assert.equal(clearBody.doctor.bio, "");
    assert.equal(clearBody.doctor.customTitle, "");
    assert.equal(clearBody.doctor.chamberLocationsSummary, "");
    assert.deepEqual(clearBody.doctor.services, []);
    // Core identity was preserved
    assert.equal(clearBody.doctor.fullName, "Dr. Clear Fields");
    assert.equal(clearBody.doctor.specialty, "Oncology");
  } finally {
    mongoAdapter.isConnected = originalIsConnected;
    mongoAdapter.getDoctorCollection = originalGetDoctorCollection;
  }
});

