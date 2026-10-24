import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";
import type { AppointmentRecord } from "../src/modules/appointments/appointments.types.js";
import type { QueueTicketRecord } from "../src/modules/queue/queue.types.js";
import {
  formatBookingNumberDisplay,
  getDoctorLocalDate,
  formatVoucherId,
  formatDateDDMMYYYY,
  formatDateDisplayDDMMYYYY,
} from "../src/modules/appointments/appointments.service.js";

test("Persistent Guest Patient Appointment Engine & Secure Recovery Tests", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctorA: DoctorRecord = {
    id: "ACC-DOC-9001",
    doctorId: "DOC-9001",
    slug: "dr-rashid-al-mamun",
    fullName: "Dr. Rashid Al Mamun",
    email: "dr.rashid@example.ae",
    phone: "+971501112233",
    avatar: "https://example.com/rashid.jpg",
    specialty: "Cardiology",
    licenseNumber: "DHA-DOC-9001",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9001",
    assignedPatientCount: 10,
    totalBookingsCount: 20,
    chamberLocationsSummary: "Dubai Healthcare City",
    yearsOfExperience: 15,
    medicalDegrees: ["MBBS", "MD", "MRCP"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CHAMBER-1",
        facilityName: "Dubai Healthcare City Chamber 101",
        city: "Dubai",
        timezone: "Asia/Dubai",
        visitingSchedule: "Daily 05:00 PM – 09:00 PM",
      },
    ],
  };

  const doctorB: DoctorRecord = {
    id: "ACC-DOC-9002",
    doctorId: "DOC-9002",
    slug: "dr-sarah-khan",
    fullName: "Dr. Sarah Khan",
    email: "dr.sarah@example.ae",
    phone: "+971509998877",
    avatar: "https://example.com/sarah.jpg",
    specialty: "Neurology",
    licenseNumber: "DHA-DOC-9002",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9002",
    assignedPatientCount: 5,
    totalBookingsCount: 15,
    chamberLocationsSummary: "Medcare Dubai",
    yearsOfExperience: 10,
    medicalDegrees: ["MBBS", "FCPS"],
    consultationFee: { amountInFils: 40000, currency: "AED", formatted: "AED 400.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CHAMBER-2",
        facilityName: "Medcare Dubai Chamber 202",
        city: "Dubai",
        timezone: "Asia/Dubai",
        visitingSchedule: "Mon-Thu 06:00 PM – 10:00 PM",
      },
    ],
  };

  const doctorsStore = new Map<string, DoctorRecord>([
    [doctorA.id, doctorA],
    [doctorB.id, doctorB],
  ]);
  const appointmentsStore = new Map<string, AppointmentRecord>();
  const queueTicketsStore = new Map<string, QueueTicketRecord>();

  // Mock mongoAdapter
  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (q: any) => {
      if (q.id) return doctorsStore.get(q.id) || null;
      if (q.slug) {
        for (const doc of doctorsStore.values()) {
          if (doc.slug === q.slug) {
            if (q.isPublished && !doc.isPublished) return null;
            if (q.accountStatus && doc.accountStatus !== q.accountStatus) return null;
            return { ...doc };
          }
        }
      }
      return null;
    },
  });

  const countersStore = new Map<string, number>();

  (mongoAdapter as any).getAppointmentCounterCollection = () => ({
    findOneAndUpdate: async (q: any) => {
      const key = `${q.doctorId}:${q.appointmentDate}`;
      const current = countersStore.get(key) || 0;
      const next = current + 1;
      countersStore.set(key, next);
      return { lastSerial: next };
    },
    findOne: async (q: any) => {
      const key = `${q.doctorId}:${q.appointmentDate}`;
      const last = countersStore.get(key);
      return last ? { lastSerial: last } : null;
    },
    updateOne: async (q: any, u: any) => {
      const key = `${q.doctorId}:${q.appointmentDate}`;
      if (u.$setOnInsert && !countersStore.has(key)) {
        countersStore.set(key, u.$setOnInsert.lastSerial || 0);
      }
      return { acknowledged: true };
    },
  });

  (mongoAdapter as any).getAppointmentCollection = () => ({
    findOne: async (q: any) => {
      if (q.id) return appointmentsStore.get(q.id) || null;
      if (q.referenceNumber) {
        for (const a of appointmentsStore.values()) {
          if (a.referenceNumber === q.referenceNumber) return { ...a };
        }
      }
      if (q.$or) {
        for (const a of appointmentsStore.values()) {
          if (q.patientPhone && a.patientPhone !== q.patientPhone) continue;
          for (const sub of q.$or) {
            if (sub.referenceNumber && a.referenceNumber === sub.referenceNumber) return { ...a };
            if (typeof sub.bookingNumber === "number" && a.bookingNumber === sub.bookingNumber) return { ...a };
          }
        }
      }
      if (q.doctorId && q.idempotencyKey) {
        for (const a of appointmentsStore.values()) {
          if (a.doctorId === q.doctorId && a.idempotencyKey === q.idempotencyKey) {
            return { ...a };
          }
        }
      }
      return null;
    },
    insertOne: async (doc: AppointmentRecord) => {
      appointmentsStore.set(doc.id, { ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    countDocuments: async () => appointmentsStore.size,
    find: (q: any) => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => {
            let list = Array.from(appointmentsStore.values());
            if (q.doctorId) list = list.filter((a) => a.doctorId === q.doctorId);
            if (q.chamberId) list = list.filter((a) => a.chamberId === q.chamberId);
            if (q.appointmentDate) list = list.filter((a) => a.appointmentDate === q.appointmentDate);
            return list.sort((a, b) => (b.bookingNumber || 0) - (a.bookingNumber || 0));
          },
        }),
        toArray: async () => {
          let list = Array.from(appointmentsStore.values());
          if (q.doctorId) list = list.filter((a) => a.doctorId === q.doctorId);
          if (q.chamberId) list = list.filter((a) => a.chamberId === q.chamberId);
          if (q.appointmentDate) list = list.filter((a) => a.appointmentDate === q.appointmentDate);
          if (q.status) list = list.filter((a) => a.status === q.status);
          return list;
        },
      }),
    }),
  });

  (mongoAdapter as any).getQueueTicketCollection = () => ({
    insertOne: async (doc: QueueTicketRecord) => {
      queueTicketsStore.set(doc.id, { ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    countDocuments: async () => queueTicketsStore.size,
  });

  // Test 1: Successful guest appointment creation
  const createRes1 = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Mohammad Faruk",
      patientPhone: "+971 50 889 4432",
      chamberId: "CHAMBER-1",
      service: "Cardiology Consultation",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-001",
    },
  });

  assert.equal(createRes1.statusCode, 201);
  const body1 = JSON.parse(createRes1.body);
  assert.equal(body1.success, true);
  assert.equal(body1.isReplay, false);
  assert.ok(body1.appointment.id);
  assert.ok(body1.appointment.referenceNumber.startsWith("GB-20261023-"));
  assert.equal(body1.appointment.doctorId, "DOC-9001");
  assert.equal(body1.appointment.status, "CONFIRMED");
  assert.equal(body1.appointment.channel, "ONLINE_WEB");
  assert.equal(body1.appointment.bookingNumber, 1);
  assert.equal(body1.appointment.bookingNumberDisplay, "#01");

  const initialReference = body1.appointment.referenceNumber;

  // Test 2: APPOINTMENT AUTOMATIC LIVE QUEUE SYNC
  // Creating an appointment MUST automatically enqueue into doctor's live queue!
  assert.ok(queueTicketsStore.size >= 1, "Appointment creation must automatically create a queue ticket for live queue");

  // Test 3: Idempotent replay with same key and same payload returns same appointment
  const createReplayRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Mohammad Faruk",
      patientPhone: "+971 50 889 4432",
      chamberId: "CHAMBER-1",
      service: "Cardiology Consultation",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-001",
    },
  });

  assert.equal(createReplayRes.statusCode, 201);
  const replayBody = JSON.parse(createReplayRes.body);
  assert.equal(replayBody.success, true);
  assert.equal(replayBody.isReplay, true);
  assert.equal(replayBody.appointment.referenceNumber, initialReference);
  assert.equal(appointmentsStore.size, 1, "Replay must not duplicate appointment records");

  // Test 4: Idempotency conflict with different payload rejects with 409
  const createConflictRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Different Patient",
      patientPhone: "+971 55 999 0000",
      chamberId: "CHAMBER-1",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-001",
    },
  });
  assert.equal(createConflictRes.statusCode, 409);

  // Test 5: Input validation - invalid slug
  const invalidSlugRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/INVALID_SLUG!/appointments",
    payload: { patientName: "Test", patientPhone: "123456" },
  });
  assert.equal(invalidSlugRes.statusCode, 400);

  // Test 6: Input validation - missing patientName
  const missingNameRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: { patientName: " ", patientPhone: "+971501234567" },
  });
  assert.equal(missingNameRes.statusCode, 400);

  // Test 7: SECURE RECOVERY - Success with correct reference + complete phone
  const recoverSuccessRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/appointments/recover",
    payload: {
      referenceNumber: initialReference,
      patientPhone: "+971 50 889 4432", // Formatted phone matching stored normalized
    },
  });

  assert.equal(recoverSuccessRes.statusCode, 200);
  const recoverBody = JSON.parse(recoverSuccessRes.body);
  assert.equal(recoverBody.success, true);
  assert.equal(recoverBody.appointment.referenceNumber, initialReference);
  assert.equal(recoverBody.appointment.doctorName, "Dr. Rashid Al Mamun");
  assert.equal(recoverBody.appointment.facilityName, "Dubai Healthcare City Chamber 101");
  assert.equal(recoverBody.appointment.status, "CONFIRMED");
  // Sensitive data is masked
  assert.ok(recoverBody.appointment.patientNameMasked.includes("***"));
  assert.ok(recoverBody.appointment.patientPhoneMasked.includes("***"));

  // Test 8: SECURE RECOVERY - Failure with wrong phone returns generic 404
  const recoverWrongPhoneRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/appointments/recover",
    payload: {
      referenceNumber: initialReference,
      patientPhone: "+971 50 000 0000",
    },
  });
  assert.equal(recoverWrongPhoneRes.statusCode, 404);
  const wrongPhoneBody = JSON.parse(recoverWrongPhoneRes.body);
  assert.equal(wrongPhoneBody.message, "Invalid booking reference or verification details.");

  // Test 9: SECURE RECOVERY - Failure with unknown reference returns generic 404
  const recoverUnknownRefRes = await app.inject({
    method: "POST",
    url: "/api/v1/public/appointments/recover",
    payload: {
      referenceNumber: "GB-99999999-FAKE",
      patientPhone: "+971 50 889 4432",
    },
  });
  assert.equal(recoverUnknownRefRes.statusCode, 404);

  // Test 10: DOCTOR PORTAL ACCESS - Doctor A retrieves their genuine persisted appointments
  const doctorAToken = app.jwt.sign({
    adminId: doctorA.id,
    email: doctorA.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  const doctorAGetRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/appointments",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  assert.equal(doctorAGetRes.statusCode, 200);
  const doctorABody = JSON.parse(doctorAGetRes.body);
  assert.equal(doctorABody.count, 1);
  assert.equal(doctorABody.items[0].referenceNumber, initialReference);

  // Test 11: MULTI-DOCTOR ISOLATION - Doctor B cannot see Doctor A's appointments
  const doctorBToken = app.jwt.sign({
    adminId: doctorB.id,
    email: doctorB.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  const doctorBGetRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/appointments",
    headers: { authorization: `Bearer ${doctorBToken}` },
  });

  assert.equal(doctorBGetRes.statusCode, 200);
  const doctorBBody = JSON.parse(doctorBGetRes.body);
  assert.equal(doctorBBody.count, 0, "Doctor B must not see Doctor A appointments");

  // Test 12: Doctor portal rejects unauthenticated request
  const unauthRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/appointments",
  });
  assert.equal(unauthRes.statusCode, 401);

  // Test 13: DAILY DOCTOR SEQUENCE — 2nd and 3rd bookings for Doctor A receive #02 and #03
  const createRes2 = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Patient Two",
      patientPhone: "+971 50 111 2222",
      chamberId: "CHAMBER-2",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-002",
    },
  });
  assert.equal(createRes2.statusCode, 201);
  const body2 = JSON.parse(createRes2.body);
  assert.equal(body2.appointment.bookingNumber, 2);
  assert.equal(body2.appointment.bookingNumberDisplay, "#02");

  const createRes3 = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Patient Three",
      patientPhone: "+971 50 333 4444",
      chamberId: "CHAMBER-1",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-003",
    },
  });
  assert.equal(createRes3.statusCode, 201);
  const body3 = JSON.parse(createRes3.body);
  assert.equal(body3.appointment.bookingNumber, 3);
  assert.equal(body3.appointment.bookingNumberDisplay, "#03");

  // Test 14: MULTI-DOCTOR ISOLATION — Doctor B on the SAME day independently starts at #01
  const createResDocB = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-sarah-khan/appointments",
    payload: {
      patientName: "Sarah's Patient",
      patientPhone: "+971 52 444 5555",
      chamberId: "CHAMBER-1",
      appointmentDate: "2026-10-23",
      idempotencyKey: "IDEM-APT-DOCB-001",
    },
  });
  assert.equal(createResDocB.statusCode, 201);
  const bodyDocB = JSON.parse(createResDocB.body);
  assert.equal(bodyDocB.appointment.doctorId, "DOC-9002");
  assert.equal(bodyDocB.appointment.bookingNumber, 1, "Doctor B must start independently at #01");
  assert.equal(bodyDocB.appointment.bookingNumberDisplay, "#01");

  // Test 15: NEXT DAY RESET — Doctor A on next calendar day (2026-10-24) resets back to #01
  const createResNextDay = await app.inject({
    method: "POST",
    url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
    payload: {
      patientName: "Next Day Patient",
      patientPhone: "+971 50 777 8888",
      chamberId: "CHAMBER-1",
      appointmentDate: "2026-10-24",
      idempotencyKey: "IDEM-APT-NEXTDAY-001",
    },
  });
  assert.equal(createResNextDay.statusCode, 201);
  const bodyNextDay = JSON.parse(createResNextDay.body);
  assert.equal(bodyNextDay.appointment.bookingNumber, 1, "Doctor A must reset to #01 on a new date");
  assert.equal(bodyNextDay.appointment.bookingNumberDisplay, "#01");

  // Test 16: TIMEZONE BOUNDARIES — local date calculation determines local calendar boundary
  const fixedUtcTime = new Date("2026-10-23T21:30:00.000Z"); // 9:30 PM UTC
  // In Dubai (UTC+4), it is 2026-10-24 01:30 AM
  const dubaiDate = getDoctorLocalDate(fixedUtcTime, "Asia/Dubai");
  assert.equal(dubaiDate, "2026-10-24", "Dubai timezone should correctly roll over to next day");
  // In New York (UTC-4), it is 2026-10-23 05:30 PM
  const nyDate = getDoctorLocalDate(fixedUtcTime, "America/New_York");
  assert.equal(nyDate, "2026-10-23", "New York timezone should remain on previous day");

  // Test 17: NUMBER FORMATTING BEYOND #99
  assert.equal(formatBookingNumberDisplay(1), "#01");
  assert.equal(formatBookingNumberDisplay(9), "#09");
  assert.equal(formatBookingNumberDisplay(10), "#10");
  assert.equal(formatBookingNumberDisplay(99), "#99");
  assert.equal(formatBookingNumberDisplay(100), "#100");
  assert.equal(formatBookingNumberDisplay(105), "#105");

  // Test 18: CONCURRENT BOOKING REQUESTS — 5 simultaneous bookings never produce duplicate numbers
  const concurrentPromises = Array.from({ length: 5 }, (_, i) =>
    app.inject({
      method: "POST",
      url: "/api/v1/public/doctors/dr-rashid-al-mamun/appointments",
      payload: {
        patientName: `Concurrent Patient ${i + 1}`,
        patientPhone: `+971 50 999 000${i}`,
        chamberId: "CHAMBER-1",
        appointmentDate: "2026-10-25",
        idempotencyKey: `IDEM-APT-CONCUR-${i + 1}`,
      },
    }),
  );

  const concurrentResults = await Promise.all(concurrentPromises);
  const allocatedNumbers: number[] = [];
  for (const res of concurrentResults) {
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    allocatedNumbers.push(body.appointment.bookingNumber);
  }

  // All 5 must be unique and from 1 to 5
  assert.equal(allocatedNumbers.length, 5);
  const uniqueNumbers = new Set(allocatedNumbers);
  assert.equal(uniqueNumbers.size, 5, "Simultaneous booking requests must never receive duplicate numbers");
  assert.deepEqual(allocatedNumbers.sort((a, b) => a - b), [1, 2, 3, 4, 5]);

  // Test 19: HISTORICAL BOOKING NUMBERS & INTERNAL IDs REMAIN INTACT
  assert.ok(initialReference.startsWith("GB-20261023-"));
  assert.equal(body1.appointment.bookingNumber, 1);
  assert.equal(body1.appointment.bookingNumberDisplay, "#01");
  assert.equal(body1.appointment.voucherId, "ID-23102026");

  // Test 20: VOUCHER ID FORMATTING — ID-DDMMYYYY from appointmentDate
  // 23 October 2026 -> ID-23102026
  assert.equal(formatVoucherId("2026-10-23"), "ID-23102026");
  assert.equal(formatVoucherId("2026-01-05"), "ID-05012026");
  assert.equal(formatVoucherId("2026-12-31"), "ID-31122026");
  assert.equal(formatDateDDMMYYYY("2026-10-23"), "23102026");
  assert.equal(formatDateDisplayDDMMYYYY("2026-10-23"), "23-10-2026");
  assert.equal(bodyNextDay.appointment.voucherId, "ID-24102026");

  await app.close();
});
