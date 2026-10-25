import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import { hashPassword, verifyPassword } from "../src/modules/auth/auth.service.js";
import type { AdminSessionPayload, StaffRecord } from "../src/modules/auth/auth.types.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";

/* =========================================================================
   STAFF ACCOUNT CREATION, AUTHENTICATION, RBAC & TENANT ISOLATION SUITE
   ========================================================================= */

function createMockDoctor(id: string, email: string, name: string): DoctorRecord {
  return {
    id,
    doctorId: `DOC-${id}`,
    fullName: name,
    email,
    phone: "+971500000000",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Cardiologist",
    licenseNumber: "DHA-12345",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    assignedPatientCount: 10,
    totalBookingsCount: 20,
    chamberLocationsSummary: "Main Clinic",
    subscriptionId: "SUB-12345",
    yearsOfExperience: 10,
    medicalDegrees: ["MBBS", "MD"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    passwordHash: "$2b$12$dummyDoctorPasswordHashForUnitTests",
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("Staff creation: validates required fields, email format, and password length (>=8 chars)", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctor = createMockDoctor("DOC-1", "doc1@example.com", "Dr. One");
  const doctorToken = app.jwt.sign({
    adminId: doctor.id,
    email: doctor.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  } satisfies AdminSessionPayload);

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetAdminCol = mongoAdapter.getAdminCollection;
  const origGetHospitalCol = mongoAdapter.getHospitalCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => (q.id === doctor.id ? doctor : null),
    });
    (mongoAdapter as any).getStaffCollection = () => ({
      findOne: async () => null,
    });
    (mongoAdapter as any).getAdminCollection = () => ({
      findOne: async () => null,
    });
    (mongoAdapter as any).getHospitalCollection = () => ({
      findOne: async () => null,
    });

    // 1. Missing name
    const resNoName = await app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: { email: "staff@example.com", password: "Password123" },
    });
    assert.equal(resNoName.statusCode, 400);
    assert.ok(JSON.parse(resNoName.body).message.includes("Full name is required"));

    // 2. Invalid email format
    const resBadEmail = await app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: { name: "Aisha", email: "invalid-email-address", password: "Password123" },
    });
    assert.equal(resBadEmail.statusCode, 400);
    assert.ok(JSON.parse(resBadEmail.body).message.includes("valid email address"));

    // 3. Short password (< 8 chars)
    const resShortPass = await app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: { name: "Aisha", email: "aisha@example.com", password: "short" },
    });
    assert.equal(resShortPass.statusCode, 400);
    assert.ok(JSON.parse(resShortPass.body).message.includes("at least 8 characters"));
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getAdminCollection = origGetAdminCol;
    mongoAdapter.getHospitalCollection = origGetHospitalCol;
  }
});

test("Staff creation: rejects duplicate email across all account collections with 409 Conflict", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctor = createMockDoctor("DOC-1", "doc1@example.com", "Dr. One");
  const doctorToken = app.jwt.sign({
    adminId: doctor.id,
    email: doctor.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  } satisfies AdminSessionPayload);

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetAdminCol = mongoAdapter.getAdminCollection;
  const origGetHospitalCol = mongoAdapter.getHospitalCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => {
        if (q.email === "existing@example.com") return { id: "OTHER-DOC" };
        if (q.id === doctor.id) return doctor;
        return null;
      },
    });
    (mongoAdapter as any).getStaffCollection = () => ({
      findOne: async (q: any) => (q.email === "existing@example.com" ? { id: "STAFF-EXISTS" } : null),
    });
    (mongoAdapter as any).getAdminCollection = () => ({
      findOne: async () => null,
    });
    (mongoAdapter as any).getHospitalCollection = () => ({
      findOne: async () => null,
    });

    const resDuplicate = await app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: {
        name: "Aisha Staff",
        email: "existing@example.com",
        password: "SecurePassword123!",
      },
    });

    assert.equal(resDuplicate.statusCode, 409);
    const body = JSON.parse(resDuplicate.body);
    assert.equal(body.error, "Conflict");
    assert.ok(body.message.includes("already exists"));
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getAdminCollection = origGetAdminCol;
    mongoAdapter.getHospitalCollection = origGetHospitalCol;
  }
});

test("Staff creation: hashes password with bcrypt, stores securely, and never returns password/hash", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctor = createMockDoctor("DOC-1", "doc1@example.com", "Dr. One");
  const doctorToken = app.jwt.sign({
    adminId: doctor.id,
    email: doctor.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  } satisfies AdminSessionPayload);

  let insertedRecord: StaffRecord | null = null;

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetAdminCol = mongoAdapter.getAdminCollection;
  const origGetHospitalCol = mongoAdapter.getHospitalCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => (q.id === doctor.id ? doctor : null),
    });
    (mongoAdapter as any).getStaffCollection = () => ({
      findOne: async () => null,
      insertOne: async (doc: StaffRecord) => {
        insertedRecord = doc;
        return { acknowledged: true, insertedId: doc.id };
      },
    });
    (mongoAdapter as any).getAdminCollection = () => ({
      findOne: async () => null,
    });
    (mongoAdapter as any).getHospitalCollection = () => ({
      findOne: async () => null,
    });

    const plainPassword = "MyStrongStaffPassword2026!";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: {
        name: "Fatima Al Zahra",
        email: "fatima.reception@drone.ae",
        password: plainPassword,
        role: "Receptionist / Front Desk",
        phone: "+971501234567",
        chamberLocation: "Chamber A",
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.staff.name, "Fatima Al Zahra");
    assert.equal(body.staff.email, "fatima.reception@drone.ae");
    assert.equal(body.staff.role, "STAFF");
    assert.equal(body.staff.staffRole, "Receptionist / Front Desk");

    // 1. Verify response NEVER exposes password or passwordHash
    assert.equal(body.staff.password, undefined);
    assert.equal(body.staff.passwordHash, undefined);
    assert.equal("password" in body.staff, false);
    assert.equal("passwordHash" in body.staff, false);

    // 2. Verify database inserted record contains a real bcrypt hash, not plaintext
    assert.ok(insertedRecord !== null);
    assert.notEqual((insertedRecord as StaffRecord).passwordHash, plainPassword);
    assert.ok((insertedRecord as StaffRecord).passwordHash.startsWith("$2"));

    // 3. Verify password verifies successfully against stored hash
    const isValid = await verifyPassword(plainPassword, (insertedRecord as StaffRecord).passwordHash);
    assert.equal(isValid, true);
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getAdminCollection = origGetAdminCol;
    mongoAdapter.getHospitalCollection = origGetHospitalCol;
  }
});

test("Staff login: authenticates with email/password, issues JWT with role STAFF, and /me returns profile", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctor = createMockDoctor("DOC-1", "doc1@example.com", "Dr. One");
  const plainPassword = "StaffPassword123!";
  const passwordHash = await hashPassword(plainPassword);

  const mockStaff: StaffRecord = {
    id: "STAFF-100",
    name: "Zainab Rashid",
    email: "zainab@example.com",
    passwordHash,
    role: "STAFF",
    staffRole: "Receptionist / Front Desk",
    tenantType: "DOCTOR",
    doctorId: doctor.id,
    chamberLocation: "Main Practice Chamber",
    phone: "+971509998888",
    permissions: {
      canManageQueue: true,
      canBookPhoneAppointments: true,
      canViewPatientHistory: true,
      canCollectPayments: false,
    },
    accountStatus: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetAdminCol = mongoAdapter.getAdminCollection;
  const origGetHospitalCol = mongoAdapter.getHospitalCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => (q.id === doctor.id ? doctor : null),
    });
    (mongoAdapter as any).getStaffCollection = () => ({
      findOne: async (q: any) => {
        if (q.email === mockStaff.email || q.id === mockStaff.id) return { ...mockStaff };
        return null;
      },
      updateOne: async () => ({ acknowledged: true }),
    });
    (mongoAdapter as any).getAdminCollection = () => ({
      findOne: async () => null,
    });
    (mongoAdapter as any).getHospitalCollection = () => ({
      findOne: async () => null,
    });

    // 1. Success login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/admin/login",
      payload: {
        email: "zainab@example.com",
        password: plainPassword,
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.body);
    assert.ok(loginBody.token);
    assert.equal(loginBody.user.role, "STAFF");
    assert.equal(loginBody.user.staffRole, "Receptionist / Front Desk");
    assert.equal(loginBody.user.doctorId, doctor.id);
    assert.equal(loginBody.user.parentDoctorName, doctor.fullName);
    assert.equal(loginBody.user.passwordHash, undefined);

    // 2. GET /api/v1/auth/admin/me returns staff profile
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/admin/me",
      headers: { authorization: `Bearer ${loginBody.token}` },
    });

    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.body);
    assert.equal(meBody.user.id, mockStaff.id);
    assert.equal(meBody.user.role, "STAFF");
    assert.equal(meBody.user.doctorId, doctor.id);
    assert.equal(meBody.user.parentDoctorName, doctor.fullName);
    assert.equal(meBody.user.passwordHash, undefined);

    // 3. Login with wrong password fails with 401
    const badLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/admin/login",
      payload: {
        email: "zainab@example.com",
        password: "WrongPassword!",
      },
    });
    assert.equal(badLoginRes.statusCode, 401);

    // 4. Suspended staff member cannot log in
    mockStaff.accountStatus = "SUSPENDED";
    const suspendedLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/admin/login",
      payload: {
        email: "zainab@example.com",
        password: plainPassword,
      },
    });
    assert.equal(suspendedLoginRes.statusCode, 403);
    assert.ok(JSON.parse(suspendedLoginRes.body).message.includes("suspended"));
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getAdminCollection = origGetAdminCol;
    mongoAdapter.getHospitalCollection = origGetHospitalCol;
  }
});

test("RBAC & scoping: Staff cannot access Doctor-only / Admin-only endpoints, but can access Queue", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctor = createMockDoctor("DOC-1", "doc1@example.com", "Dr. One");
  const staffToken = app.jwt.sign({
    adminId: "STAFF-100",
    email: "staff@example.com",
    role: "STAFF",
    doctorId: doctor.id,
    permissions: [],
  } satisfies AdminSessionPayload);

  const mockStaff: StaffRecord = {
    id: "STAFF-100",
    name: "Staff Person",
    email: "staff@example.com",
    passwordHash: "hash",
    role: "STAFF",
    staffRole: "Receptionist / Front Desk",
    tenantType: "DOCTOR",
    doctorId: doctor.id,
    permissions: {
      canManageQueue: true,
      canBookPhoneAppointments: true,
      canViewPatientHistory: true,
      canCollectPayments: false,
    },
    accountStatus: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetQueueCol = mongoAdapter.getQueueTicketCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => {
        if (q.id === doctor.id || q.doctorId === doctor.doctorId) return doctor;
        if (Array.isArray(q.$or)) {
          const match = q.$or.some((item: any) => item.id === doctor.id || item.doctorId === doctor.doctorId);
          if (match) return doctor;
        }
        return null;
      },
    });
    (mongoAdapter as any).getStaffCollection = () => ({
      findOne: async (q: any) => (q.id === mockStaff.id ? mockStaff : null),
    });
    (mongoAdapter as any).getQueueTicketCollection = () => ({
      find: () => ({
        sort: () => ({
          toArray: async () => [],
        }),
      }),
    });

    // 1. Staff CANNOT update Doctor profile (403 Forbidden)
    const resPatchProfile = await app.inject({
      method: "PATCH",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { fullName: "Hacked Doctor Name" },
    });
    assert.equal(resPatchProfile.statusCode, 403);

    // 2. Staff CANNOT access Staff Management CRUD (403 Forbidden)
    const resGetStaff = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    assert.equal(resGetStaff.statusCode, 403);

    // 3. Staff CANNOT access Super Admin routes (403 Forbidden)
    const resAdminUsers = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    assert.equal(resAdminUsers.statusCode, 403);

    // 4. Staff CAN read doctor profile for portal branding/header (200 OK)
    const resGetProfile = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/profile",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    assert.equal(resGetProfile.statusCode, 200);
    const profileBody = JSON.parse(resGetProfile.body);
    assert.equal(profileBody.doctor.id, doctor.id);

    // 5. Staff CAN access assigned Doctor's live queue (200 OK)
    const resGetQueue = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/queue",
      headers: { authorization: `Bearer ${staffToken}` },
    });
    assert.equal(resGetQueue.statusCode, 200);
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getQueueTicketCollection = origGetQueueCol;
  }
});

test("Tenant isolation: Doctor A and Doctor B have completely isolated staff directories", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctorA = createMockDoctor("DOC-A", "docA@example.com", "Dr. A");
  const doctorB = createMockDoctor("DOC-B", "docB@example.com", "Dr. B");

  const tokenA = app.jwt.sign({
    adminId: doctorA.id,
    email: doctorA.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  } satisfies AdminSessionPayload);

  const tokenB = app.jwt.sign({
    adminId: doctorB.id,
    email: doctorB.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  } satisfies AdminSessionPayload);

  const staffOfA: StaffRecord = {
    id: "STAFF-A-1",
    name: "Staff A Member",
    email: "staffA@example.com",
    passwordHash: "hashA",
    role: "STAFF",
    staffRole: "Clinical Nurse",
    tenantType: "DOCTOR",
    doctorId: doctorA.id,
    permissions: {
      canManageQueue: true,
      canBookPhoneAppointments: true,
      canViewPatientHistory: true,
      canCollectPayments: false,
    },
    accountStatus: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const origIsConnected = mongoAdapter.isConnected;
  const origGetDoctorCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;

  try {
    mongoAdapter.isConnected = () => true;
    (mongoAdapter as any).getDoctorCollection = () => ({
      findOne: async (q: any) => {
        if (q.id === doctorA.id) return doctorA;
        if (q.id === doctorB.id) return doctorB;
        return null;
      },
    });

    (mongoAdapter as any).getStaffCollection = () => ({
      find: (q: any) => ({
        sort: () => ({
          toArray: async () => {
            if (q.doctorId === doctorA.id) return [staffOfA];
            return []; // Doctor B has no staff
          },
        }),
      }),
      findOne: async (q: any) => {
        if (q.id === staffOfA.id && q.doctorId === doctorA.id) return staffOfA;
        return null;
      },
      deleteOne: async (q: any) => {
        if (q.id === staffOfA.id && q.doctorId === doctorA.id) {
          return { acknowledged: true, deletedCount: 1 };
        }
        return { acknowledged: true, deletedCount: 0 };
      },
    });

    // Doctor A sees Staff A
    const resA = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resA.statusCode, 200);
    const bodyA = JSON.parse(resA.body);
    assert.equal(bodyA.staff.length, 1);
    assert.equal(bodyA.staff[0].id, "STAFF-A-1");

    // Doctor B sees 0 staff
    const resB = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/staff",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resB.statusCode, 200);
    const bodyB = JSON.parse(resB.body);
    assert.equal(bodyB.staff.length, 0);

    // Doctor B cannot delete Doctor A's staff (returns 404 Not Found)
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/portal/doctor/staff/${staffOfA.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(deleteRes.statusCode, 404);
  } finally {
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDoctorCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
  }
});
