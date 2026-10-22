import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import {
  isValidIanaTimezone,
  getChamberBusinessDate,
  formatChamberLocalTime,
} from "../src/modules/queue/queue.timezone.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";
import type { QueueTicketRecord, QueueCounterRecord } from "../src/modules/queue/queue.types.js";

/* =========================================================================
   1. TIMEZONE & BUSINESS DATE CALCULATION UNIT TESTS
   ========================================================================= */

test("isValidIanaTimezone validates real-world IANA identifiers", () => {
  assert.equal(isValidIanaTimezone("Asia/Dhaka"), true);
  assert.equal(isValidIanaTimezone("Asia/Dubai"), true);
  assert.equal(isValidIanaTimezone("America/New_York"), true);
  assert.equal(isValidIanaTimezone("Europe/London"), true);

  // Invalid identifiers
  assert.equal(isValidIanaTimezone("Fake/Timezone"), false);
  assert.equal(isValidIanaTimezone("GMT+6"), false);
  assert.equal(isValidIanaTimezone(""), false);
  assert.equal(isValidIanaTimezone(null), false);
  assert.equal(isValidIanaTimezone(undefined), false);
});

test("getChamberBusinessDate calculates correct chamber-local date boundary across timezones", () => {
  // Test reference timestamp: 2026-10-22 19:30:00 UTC
  // In Dhaka (UTC+6): 2026-10-23 01:30:00 (Next Day!)
  // In Dubai (UTC+4): 2026-10-22 23:30:00 (Same Day!)
  // In New York (UTC-4): 2026-10-22 15:30:00 (Same Day!)
  const testUtc = new Date("2026-10-22T19:30:00.000Z");

  const dhakaDate = getChamberBusinessDate("Asia/Dhaka", testUtc);
  const dubaiDate = getChamberBusinessDate("Asia/Dubai", testUtc);
  const nyDate = getChamberBusinessDate("America/New_York", testUtc);

  assert.equal(dhakaDate, "2026-10-23");
  assert.equal(dubaiDate, "2026-10-22");
  assert.equal(nyDate, "2026-10-22");
});

test("formatChamberLocalTime formats display time in chamber's local timezone", () => {
  const testUtc = new Date("2026-10-22T06:30:00.000Z");

  const dhakaTime = formatChamberLocalTime("Asia/Dhaka", testUtc); // UTC+6 -> 12:30 PM
  const dubaiTime = formatChamberLocalTime("Asia/Dubai", testUtc); // UTC+4 -> 10:30 AM

  assert.equal(dhakaTime, "12:30 PM");
  assert.equal(dubaiTime, "10:30 AM");
});

/* =========================================================================
   2. QUEUE ENDPOINT AUTHORIZATION & CHAMBER OWNERSHIP TESTS
   ========================================================================= */

test("GET /api/v1/portal/doctor/queue rejects unauthenticated request with 401", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const res = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/queue",
  });

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("GET /api/v1/portal/doctor/queue rejects non-Doctor role with 403", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const adminToken = app.jwt.sign({
    adminId: "ADM-999",
    email: "admin@globalbooking.ae",
    role: "SUPER_ADMIN",
    permissions: ["VIEW_DOCTORS"],
  });

  const res = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/queue",
    headers: { authorization: `Bearer ${adminToken}` },
  });

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Forbidden");
});

/* =========================================================================
   3. MULTI-DOCTOR ISOLATION, SERIAL SCOPING & IDEMPOTENCY INTEGRATION TESTS
   ========================================================================= */

test("Doctor Queue API: multi-doctor isolation, chamber ownership, and independent serials", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  // Doctor A: Dr. Tariq (Chamber 1 in Dubai, Chamber 2 in Dhaka)
  const doctorA: DoctorRecord = {
    id: "ACC-DOC-8001",
    doctorId: "DOC-8001",
    fullName: "Dr. Tariq Al-Hashimi",
    email: "dr.tariq@example.ae",
    phone: "+971501234567",
    avatar: "https://example.com/avatar.jpg",
    specialty: "Neurology",
    licenseNumber: "DHA-DOC-8001",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-8001",
    assignedPatientCount: 10,
    totalBookingsCount: 25,
    chamberLocationsSummary: "Dubai & Dhaka",
    yearsOfExperience: 12,
    medicalDegrees: ["MBBS", "MD"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CH-DUBAI-302",
        facilityName: "Medcare Dubai Chamber 302",
        city: "Dubai",
        timezone: "Asia/Dubai",
      },
      {
        id: "CH-DHAKA-101",
        facilityName: "Square Hospital Dhaka Chamber 101",
        city: "Dhaka",
        timezone: "Asia/Dhaka",
      },
      {
        id: "CH-NO-TZ",
        facilityName: "Unconfigured Chamber",
        city: "Unknown",
        // Notice: timezone is omitted!
      },
    ],
  };

  // Doctor B: Dr. Sarah
  const doctorB: DoctorRecord = {
    id: "ACC-DOC-8002",
    doctorId: "DOC-8002",
    fullName: "Dr. Sarah Khan",
    email: "dr.sarah@example.ae",
    phone: "+971509876543",
    avatar: "https://example.com/sarah.jpg",
    specialty: "Cardiology",
    licenseNumber: "DHA-DOC-8002",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-8002",
    assignedPatientCount: 5,
    totalBookingsCount: 15,
    chamberLocationsSummary: "City Hospital",
    yearsOfExperience: 10,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 40000, currency: "AED", formatted: "AED 400.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CH-SARAH-501",
        facilityName: "City Hospital Chamber 501",
        city: "Dubai",
        timezone: "Asia/Dubai",
      },
    ],
  };

  // In-memory data stores for unit test isolation
  const doctorsStore = new Map<string, DoctorRecord>([
    [doctorA.id, doctorA],
    [doctorB.id, doctorB],
  ]);
  const ticketsStore = new Map<string, QueueTicketRecord>();
  const countersStore = new Map<string, QueueCounterRecord>();

  // Mock mongoAdapter
  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (q: any) => doctorsStore.get(q.id) || null,
  });

  (mongoAdapter as any).getQueueCounterCollection = () => ({
    findOneAndUpdate: async (filter: any, update: any) => {
      const key = `${filter.doctorId}:${filter.chamberId}:${filter.dateKey}`;
      let record = countersStore.get(key);
      if (!record) {
        record = {
          id: key,
          doctorId: filter.doctorId,
          chamberId: filter.chamberId,
          dateKey: filter.dateKey,
          lastSerial: 0,
          updatedAt: new Date().toISOString(),
        };
      }
      record.lastSerial += update.$inc?.lastSerial || 1;
      record.updatedAt = new Date().toISOString();
      countersStore.set(key, record);
      return { ...record };
    },
  });

  (mongoAdapter as any).getQueueTicketCollection = () => ({
    findOne: async (q: any) => {
      if (q.id) return ticketsStore.get(q.id) || null;
      if (q.doctorId && q.idempotencyKey) {
        for (const t of ticketsStore.values()) {
          if (t.doctorId === q.doctorId && t.idempotencyKey === q.idempotencyKey) {
            return { ...t };
          }
        }
      }
      return null;
    },
    insertOne: async (doc: QueueTicketRecord) => {
      ticketsStore.set(doc.id, { ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    find: (q: any) => ({
      sort: () => ({
        toArray: async () => {
          let list = Array.from(ticketsStore.values());
          if (q.doctorId) list = list.filter((t) => t.doctorId === q.doctorId);
          if (q.chamberId) list = list.filter((t) => t.chamberId === q.chamberId);
          if (q.dateKey) list = list.filter((t) => t.dateKey === q.dateKey);
          if (q.status) list = list.filter((t) => t.status === q.status);
          return list.sort((a, b) => a.serialIndex - b.serialIndex);
        },
      }),
    }),
    updateOne: async (filter: any, update: any) => {
      const ticket = ticketsStore.get(filter.id);
      if (ticket) {
        Object.assign(ticket, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
  });

  const tokenDoctorA = app.jwt.sign({
    adminId: doctorA.id,
    email: doctorA.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  const tokenDoctorB = app.jwt.sign({
    adminId: doctorB.id,
    email: doctorB.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  // 1. Chamber ownership validation: Doctor A trying to issue ticket in Doctor B's chamber
  const unauthorizedChamberRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-SARAH-501", // Belongs to Doctor B!
      patientName: "Unauthorized Patient",
    },
  });
  assert.equal(unauthorizedChamberRes.statusCode, 403);
  const unauthBody = JSON.parse(unauthorizedChamberRes.body);
  assert.ok(unauthBody.message.includes("is not registered in your doctor profile"));

  // 2. Missing timezone validation: Chamber without timezone fails with 400
  const missingTzRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-NO-TZ",
      patientName: "Test Patient",
    },
  });
  assert.equal(missingTzRes.statusCode, 400);
  const missingTzBody = JSON.parse(missingTzRes.body);
  assert.ok(missingTzBody.message.includes("no valid IANA timezone configured"));

  // 3. Issue ticket 1 in Dubai Chamber (CH-DUBAI-302) -> gets #01
  const tkt1Res = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-DUBAI-302",
      patientName: "Ahmed Al Mansoori",
      service: "Neurology Consultation",
      idempotencyKey: "idem-key-001",
    },
  });
  assert.equal(tkt1Res.statusCode, 201);
  const tkt1Body = JSON.parse(tkt1Res.body);
  assert.equal(tkt1Body.ticket.serialIndex, 1);
  assert.equal(tkt1Body.ticket.ticketNumber, "#01");
  assert.equal(tkt1Body.ticket.chamberTimezone, "Asia/Dubai");
  assert.equal(tkt1Body.isReplay, false);

  // 4. Same-key Idempotent Retry: Posting with same idempotencyKey returns 200 with same ticket
  const tkt1RetryRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-DUBAI-302",
      patientName: "Ahmed Al Mansoori",
      service: "Neurology Consultation",
      idempotencyKey: "idem-key-001", // Replay!
    },
  });
  assert.equal(tkt1RetryRes.statusCode, 200);
  const tkt1RetryBody = JSON.parse(tkt1RetryRes.body);
  assert.equal(tkt1RetryBody.ticket.ticketNumber, "#01");
  assert.equal(tkt1RetryBody.isReplay, true);

  // 5. Conflicting Idempotency-Key Reuse: Same key with different patient returns 409 Conflict
  const conflictRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-DUBAI-302",
      patientName: "Different Patient Name",
      idempotencyKey: "idem-key-001",
    },
  });
  assert.equal(conflictRes.statusCode, 409);
  const conflictBody = JSON.parse(conflictRes.body);
  assert.equal(conflictBody.error, "IDEMPOTENCY_CONFLICT");

  // 6. Issue ticket 2 in Dubai Chamber -> gets #02
  const tkt2Res = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-DUBAI-302",
      patientName: "Fatima Rahman",
    },
  });
  assert.equal(tkt2Res.statusCode, 201);
  const tkt2Body = JSON.parse(tkt2Res.body);
  assert.equal(tkt2Body.ticket.serialIndex, 2);
  assert.equal(tkt2Body.ticket.ticketNumber, "#02");

  // 7. Independent Chamber Scoping: Issue ticket in Dhaka Chamber (CH-DHAKA-101) -> starts fresh at #01
  const tktDhakaRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorA}` },
    payload: {
      chamberId: "CH-DHAKA-101",
      patientName: "Rahim Chowdhury",
      service: "Stroke Assessment",
    },
  });
  assert.equal(tktDhakaRes.statusCode, 201);
  const tktDhakaBody = JSON.parse(tktDhakaRes.body);
  assert.equal(tktDhakaBody.ticket.serialIndex, 1);
  assert.equal(tktDhakaBody.ticket.ticketNumber, "#01");
  assert.equal(tktDhakaBody.ticket.chamberTimezone, "Asia/Dhaka");

  // 8. Multi-Doctor Isolation: Doctor B reads queue -> must see ZERO tickets from Doctor A
  const queueDoctorB = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/queue",
    headers: { authorization: `Bearer ${tokenDoctorB}` },
  });
  assert.equal(queueDoctorB.statusCode, 200);
  const queueBBody = JSON.parse(queueDoctorB.body);
  assert.equal(queueBBody.count, 0);
  assert.equal(queueBBody.items.length, 0);

  // 9. Doctor B issuing in own chamber -> gets #01
  const tktSarahRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/tickets",
    headers: { authorization: `Bearer ${tokenDoctorB}` },
    payload: {
      chamberId: "CH-SARAH-501",
      patientName: "Zayed Al Nahyan",
    },
  });
  assert.equal(tktSarahRes.statusCode, 201);
  const tktSarahBody = JSON.parse(tktSarahRes.body);
  assert.equal(tktSarahBody.ticket.serialIndex, 1);
  assert.equal(tktSarahBody.ticket.ticketNumber, "#01");
  assert.equal(tktSarahBody.ticket.doctorId, "DOC-8002");

  // 10. Doctor A calls ticket 1 -> status transitions to CALLED
  const callRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${tkt1Body.ticket.id}/call`,
    headers: { authorization: `Bearer ${tokenDoctorA}` },
  });
  assert.equal(callRes.statusCode, 200);
  const callBody = JSON.parse(callRes.body);
  assert.equal(callBody.ticket.status, "CALLED");
  assert.ok(callBody.ticket.calledAt);

  // 11. Doctor B tries to call Doctor A's ticket -> 404/unauthorized
  const crossDoctorCallRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${tkt1Body.ticket.id}/call`,
    headers: { authorization: `Bearer ${tokenDoctorB}` },
  });
  assert.equal(crossDoctorCallRes.statusCode, 404);

  // 12. Doctor A finishes ticket 1 -> status transitions to COMPLETED
  const finishRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${tkt1Body.ticket.id}/finish`,
    headers: { authorization: `Bearer ${tokenDoctorA}` },
  });
  assert.equal(finishRes.statusCode, 200);
  const finishBody = JSON.parse(finishRes.body);
  assert.equal(finishBody.ticket.status, "COMPLETED");
  assert.ok(finishBody.ticket.completedAt);

  // 13. Illegal Status Transition: Calling an already completed ticket returns 400 Bad Request
  const illegalCallRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${tkt1Body.ticket.id}/call`,
    headers: { authorization: `Bearer ${tokenDoctorA}` },
  });
  assert.equal(illegalCallRes.statusCode, 400);
  const illegalBody = JSON.parse(illegalCallRes.body);
  assert.equal(illegalBody.error, "INVALID_TRANSITION");
});

test("Concurrency: 10 parallel ticket creations receive sequential serials without duplicates", async () => {
  const doctor: DoctorRecord = {
    id: "ACC-DOC-9001",
    doctorId: "DOC-9001",
    fullName: "Dr. Concurrency Test",
    email: "concurrency@example.ae",
    phone: "+971500000000",
    avatar: "https://example.com/avatar.jpg",
    specialty: "General Medicine",
    licenseNumber: "DHA-DOC-9001",
    accountStatus: "ACTIVE",
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9001",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Main Chamber",
    yearsOfExperience: 5,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 20000, currency: "AED", formatted: "AED 200.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CH-PARALLEL-1",
        facilityName: "High Throughput Chamber",
        city: "Dubai",
        timezone: "Asia/Dubai",
      },
    ],
  };

  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const token = app.jwt.sign({
    adminId: doctor.id,
    email: doctor.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  const ticketsStore = new Map<string, QueueTicketRecord>();
  let atomicCounter = 0;

  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async () => doctor,
  });

  (mongoAdapter as any).getQueueCounterCollection = () => ({
    findOneAndUpdate: async (filter: any) => {
      atomicCounter++;
      return {
        id: `${filter.doctorId}:${filter.chamberId}:${filter.dateKey}`,
        lastSerial: atomicCounter,
      };
    },
  });

  (mongoAdapter as any).getQueueTicketCollection = () => ({
    findOne: async () => null,
    insertOne: async (doc: QueueTicketRecord) => {
      ticketsStore.set(doc.id, doc);
      return { acknowledged: true };
    },
  });

  // Launch 10 simultaneous ticket creations
  const promises = Array.from({ length: 10 }).map((_, idx) =>
    app.inject({
      method: "POST",
      url: "/api/v1/portal/doctor/queue/tickets",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        chamberId: "CH-PARALLEL-1",
        patientName: `Parallel Patient ${idx + 1}`,
      },
    }),
  );

  const responses = await Promise.all(promises);
  assert.equal(responses.length, 10);

  const serials: number[] = [];
  for (const res of responses) {
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    serials.push(body.ticket.serialIndex);
  }

  // Verify all 10 serials are unique: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  serials.sort((a, b) => a - b);
  assert.deepEqual(serials, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
