import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import {
  normalizeContactNumber,
  normalizePatientName,
  arePatientNamesCompatible,
} from "../src/modules/patients/patients.service.js";
import {
  getDoctorQueueTickets,
  finishQueueTicket,
  archiveDoctorQueueDayEnd,
} from "../src/modules/queue/queue.service.js";
import { runSystemDayEndCleanup } from "../src/modules/queue/queue.scheduler.js";
import { getChamberBusinessDate } from "../src/modules/queue/queue.timezone.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";
import type { QueueTicketRecord } from "../src/modules/queue/queue.types.js";
import type { AppointmentRecord } from "../src/modules/appointments/appointments.types.js";
import type { PatientRecord } from "../src/modules/patients/patients.types.js";

test("Live Queue -> Patients Auto-Sync & Day-End Cleanup Comprehensive 12-Scenario Suite", async () => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  // Baseline Phone Normalization Unit Tests
  assert.equal(normalizeContactNumber("+971 50 123 4567"), "0501234567");
  assert.equal(normalizeContactNumber("050-123-4567"), "0501234567");
  assert.equal(normalizeContactNumber("00971501234567"), "0501234567");
  assert.equal(normalizeContactNumber("+880 1712-345678"), "01712345678");
  assert.equal(normalizeContactNumber("01712345678"), "01712345678");
  assert.equal(normalizeContactNumber(""), "");
  assert.equal(normalizeContactNumber(undefined), "");

  // Baseline Patient Name Normalization & Compatibility Unit Tests
  assert.equal(normalizePatientName("Mr. Rahim Khan"), "rahim khan");
  assert.equal(normalizePatientName("Mrs. Fatema Begum"), "fatema begum");
  assert.equal(normalizePatientName("Md. Tariq"), "tariq");
  assert.equal(arePatientNamesCompatible("Mariam Al Suwaidi", "Mariam Al Suwaidi"), true);
  assert.equal(arePatientNamesCompatible("Mrs. Mariam Al Suwaidi", "Mariam Al Suwaidi"), true);
  assert.equal(arePatientNamesCompatible("Mariam Al Suwaidi", "Rashid Al Suwaidi"), false);
  assert.equal(arePatientNamesCompatible("Rahim Khan", "Fatema Begum"), false);
  // Regressions: subset names sharing phone must NEVER be compatible
  assert.equal(arePatientNamesCompatible("Abdul Karim", "Karim"), false);
  assert.equal(arePatientNamesCompatible("Abdul Karim", "Abdul"), false);
  assert.equal(arePatientNamesCompatible("Karim", "Abdul Karim"), false);
  assert.equal(arePatientNamesCompatible("Abdul", "Abdul Karim"), false);
  assert.equal(arePatientNamesCompatible("Fatima Khan", "Fatima"), false);
  assert.equal(arePatientNamesCompatible("Mohammad Ali", "Ali"), false);
  assert.equal(arePatientNamesCompatible("Mohammad Ali", "Mohammad"), false);

  // Mock Store setup
  const doctorA: DoctorRecord = {
    id: "ACC-DOC-8001",
    doctorId: "DOC-8001",
    slug: "dr-ahmed-khan",
    fullName: "Dr. Ahmed Khan",
    email: "dr.ahmed@example.ae",
    phone: "+971501112233",
    avatar: "https://example.com/avatar-a.jpg",
    specialty: "Cardiology",
    licenseNumber: "DHA-DOC-8001",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-8001",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Dubai Main Chamber",
    yearsOfExperience: 12,
    medicalDegrees: ["MBBS", "MD"],
    consultationFee: { amountInFils: 50000, currency: "AED", formatted: "AED 500.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CHAMBER-1",
        facilityName: "Main Cardiology Chamber",
        city: "Dubai",
        timezone: "Asia/Dubai",
        visitingSchedule: "Daily 05:00 PM – 09:00 PM",
      },
    ],
  };

  const doctorB: DoctorRecord = {
    id: "ACC-DOC-8002",
    doctorId: "DOC-8002",
    slug: "dr-layla-hassan",
    fullName: "Dr. Layla Hassan",
    email: "dr.layla@example.ae",
    phone: "+971502223344",
    avatar: "https://example.com/avatar-b.jpg",
    specialty: "Pediatrics",
    licenseNumber: "DHA-DOC-8002",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-8002",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Abu Dhabi Clinic",
    yearsOfExperience: 8,
    medicalDegrees: ["MBBS"],
    consultationFee: { amountInFils: 40000, currency: "AED", formatted: "AED 400.00" },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    chambers: [
      {
        id: "CHAMBER-2",
        facilityName: "Abu Dhabi Pediatrics",
        city: "Abu Dhabi",
        timezone: "Asia/Dubai",
        visitingSchedule: "Daily 09:00 AM – 02:00 PM",
      },
    ],
  };

  const doctorsMap = new Map<string, DoctorRecord>([
    [doctorA.id, doctorA],
    [doctorB.id, doctorB],
  ]);

  const queueTicketsMap = new Map<string, QueueTicketRecord>();
  const appointmentsMap = new Map<string, AppointmentRecord>();
  const patientsMap = new Map<string, PatientRecord>();

  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (q: any) => {
      if (q.id) return doctorsMap.get(q.id) || null;
      if (q.doctorId) {
        for (const doc of doctorsMap.values()) {
          if (doc.doctorId === q.doctorId) return doc;
        }
      }
      return null;
    },
    find: (_q: any) => ({
      toArray: async () => Array.from(doctorsMap.values()),
    }),
  });

  const filterTickets = (q: any) => {
    let list = Array.from(queueTicketsMap.values());
    if (q.doctorId) list = list.filter((t) => t.doctorId === q.doctorId);
    if (q.chamberId) list = list.filter((t) => t.chamberId === q.chamberId);
    if (q.isArchived && q.isArchived.$ne === true) list = list.filter((t) => !t.isArchived);
    if (q.status) list = list.filter((t) => t.status === q.status);
    if (q.id && q.id.$ne) list = list.filter((t) => t.id !== q.id.$ne);
    if (q.dateKey) {
      if (typeof q.dateKey === "string") {
        list = list.filter((t) => t.dateKey === q.dateKey || t.dateKey.replace(/\D/g, "") === q.dateKey.replace(/\D/g, ""));
      }
    }
    if (q.$and && Array.isArray(q.$and)) {
      for (const cond of q.$and) {
        if (cond.dateKey && cond.dateKey.$lt) {
          list = list.filter((t) => t.dateKey < cond.dateKey.$lt);
        }
        if (cond.dateKey && cond.dateKey.$ne) {
          list = list.filter((t) => t.dateKey !== cond.dateKey.$ne && t.dateKey.replace(/\D/g, "") !== cond.dateKey.$ne);
        }
      }
    }
    if (q.$or && Array.isArray(q.$or)) {
      list = list.filter((t) => {
        return q.$or.some((cond: any) => {
          if (cond.dateKey) {
            return t.dateKey === cond.dateKey || t.dateKey.replace(/\D/g, "") === cond.dateKey.replace(/\D/g, "");
          }
          return false;
        });
      });
    }
    return list;
  };

  (mongoAdapter as any).getQueueTicketCollection = () => ({
    find: (q: any) => ({
      sort: () => ({
        toArray: async () => filterTickets(q),
      }),
      toArray: async () => filterTickets(q),
    }),
    findOne: async (q: any) => {
      if (q.id) return queueTicketsMap.get(q.id) || null;
      if (q.doctorId && q.idempotencyKey) {
        for (const t of queueTicketsMap.values()) {
          if (t.doctorId === q.doctorId && t.idempotencyKey === q.idempotencyKey) return t;
        }
      }
      return null;
    },
    updateOne: async (q: any, u: any, opts?: any) => {
      const ticket = queueTicketsMap.get(q.id);
      if (ticket) {
        if (u.$set) {
          Object.assign(ticket, u.$set);
          return { acknowledged: true, modifiedCount: 1, upsertedCount: 0 };
        }
        return { acknowledged: true, modifiedCount: 0, upsertedCount: 0 };
      }
      if (opts?.upsert && u.$setOnInsert) {
        queueTicketsMap.set(q.id, { ...u.$setOnInsert });
        return { acknowledged: true, modifiedCount: 0, upsertedCount: 1 };
      }
      return { acknowledged: true, modifiedCount: 0, upsertedCount: 0 };
    },
    updateMany: async (q: any, u: any) => {
      let modified = 0;
      for (const t of queueTicketsMap.values()) {
        if (q.doctorId && t.doctorId !== q.doctorId) continue;
        if (q.chamberId && t.chamberId !== q.chamberId) continue;
        if (q.id && q.id.$in && !q.id.$in.includes(t.id)) continue;
        if (u.$set) {
          Object.assign(t, u.$set);
          modified++;
        }
      }
      return { acknowledged: true, modifiedCount: modified };
    },
    countDocuments: async (q: any) => filterTickets(q).length,
  });

  (mongoAdapter as any).getAppointmentCollection = () => ({
    find: (q: any) => ({
      sort: () => ({
        toArray: async () => {
          let list = Array.from(appointmentsMap.values());
          if (q.doctorId) list = list.filter((a) => a.doctorId === q.doctorId);
          if (q.chamberId) list = list.filter((a) => a.chamberId === q.chamberId);
          if (q.appointmentDate) list = list.filter((a) => a.appointmentDate === q.appointmentDate);
          return list;
        },
      }),
      toArray: async () => {
        let list = Array.from(appointmentsMap.values());
        if (q.doctorId) list = list.filter((a) => a.doctorId === q.doctorId);
        if (q.chamberId) list = list.filter((a) => a.chamberId === q.chamberId);
        if (q.appointmentDate) list = list.filter((a) => a.appointmentDate === q.appointmentDate);
        return list;
      },
    }),
    countDocuments: async (q: any) => {
      let list = Array.from(appointmentsMap.values());
      if (q.doctorId) list = list.filter((a) => a.doctorId === q.doctorId);
      return list.length;
    },
    updateOne: async (q: any, u: any) => {
      const apt = appointmentsMap.get(q.id);
      if (apt && u.$set) {
        Object.assign(apt, u.$set);
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
  });

  const filterPatients = (q: any) => {
    let list = Array.from(patientsMap.values());
    if (q.doctorId) list = list.filter((p) => p.doctorId === q.doctorId);
    if (q.normalizedPhone) list = list.filter((p) => p.normalizedPhone === q.normalizedPhone);
    if (q.status) list = list.filter((p) => p.status === q.status);
    if (q.bloodGroup) list = list.filter((p) => p.bloodGroup === q.bloodGroup);
    if (q.$or && Array.isArray(q.$or)) {
      list = list.filter((p) => {
        return q.$or.some((cond: any) => {
          if (cond.name && cond.name.$regex) {
            return new RegExp(cond.name.$regex, "i").test(p.name);
          }
          if (cond.mrn && cond.mrn.$regex) {
            return new RegExp(cond.mrn.$regex, "i").test(p.mrn);
          }
          if (cond.phone && cond.phone.$regex) {
            return new RegExp(cond.phone.$regex, "i").test(p.phone);
          }
          if (cond.normalizedPhone && cond.normalizedPhone.$regex) {
            return new RegExp(cond.normalizedPhone.$regex, "i").test(p.normalizedPhone);
          }
          return false;
        });
      });
    }
    return list;
  };

  (mongoAdapter as any).getPatientCollection = () => ({
    countDocuments: async (q: any) => filterPatients(q).length,
    findOne: async (q: any) => {
      if (q.id) return patientsMap.get(q.id) || null;
      if (q.doctorId && q.normalizedPhone) {
        for (const p of patientsMap.values()) {
          if (p.doctorId === q.doctorId && p.normalizedPhone === q.normalizedPhone) {
            return { ...p };
          }
        }
      }
      if (q.doctorId && q["visitHistory.visitId"]) {
        const vId = q["visitHistory.visitId"];
        for (const p of patientsMap.values()) {
          if (p.doctorId === q.doctorId && p.visitHistory.some((v) => v.visitId === vId)) {
            return { ...p };
          }
        }
      }
      return null;
    },
    find: (q: any) => {
      let list = filterPatients(q);
      const cursor = {
        sort: () => cursor,
        skip: (n: number) => {
          list = list.slice(n);
          return cursor;
        },
        limit: (n: number) => {
          list = list.slice(0, n);
          return cursor;
        },
        toArray: async () => list,
      };
      return cursor;
    },
    insertOne: async (doc: PatientRecord) => {
      patientsMap.set(doc.id, { ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    updateOne: async (q: any, u: any) => {
      let target: PatientRecord | undefined;
      if (q.id) target = patientsMap.get(q.id);
      if (target && u.$set) {
        const updated = { ...target, ...u.$set };
        patientsMap.set(target.id, updated);
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
  });

  const dayEndRunsMap = new Map<string, any>();
  (mongoAdapter as any).getDb = () => ({
    collection: (name: string) => {
      if (name === "patients") return (mongoAdapter as any).getPatientCollection();
      if (name === "queue_tickets") return (mongoAdapter as any).getQueueTicketCollection();
      if (name === "appointments") return (mongoAdapter as any).getAppointmentCollection();
      if (name === "queue_day_end_runs") {
        return {
          updateOne: async (q: any, u: any, opts: any) => {
            const existing = dayEndRunsMap.get(q.id);
            if (opts?.upsert && !existing) {
              const newDoc = { id: q.id, ...(u.$setOnInsert || {}) };
              dayEndRunsMap.set(q.id, newDoc);
              return { acknowledged: true, upsertedCount: 1, modifiedCount: 0 };
            }
            if (existing) {
              if (q.$or && Array.isArray(q.$or)) {
                const matches = q.$or.some((cond: any) => {
                  if (cond.status === existing.status) {
                    if (cond.lockedAt && cond.lockedAt.$lt) {
                      return existing.lockedAt < cond.lockedAt.$lt;
                    }
                    return true;
                  }
                  return false;
                });
                if (!matches) {
                  return { acknowledged: true, upsertedCount: 0, modifiedCount: 0 };
                }
              }
              if (u.$set) {
                Object.assign(existing, u.$set);
              }
              return { acknowledged: true, upsertedCount: 0, modifiedCount: 1 };
            }
            return { acknowledged: true, upsertedCount: 0, modifiedCount: 0 };
          },
          findOne: async (q: any) => dayEndRunsMap.get(q.id) || null,
          countDocuments: async () => dayEndRunsMap.size,
        };
      }
      return {
        updateOne: async () => ({ acknowledged: true, modifiedCount: 1 }),
        countDocuments: async () => 0,
      };
    },
  });

  const doctorAToken = (app as any).jwt.sign({
    adminId: doctorA.id,
    email: doctorA.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  const doctorBToken = (app as any).jwt.sign({
    adminId: doctorB.id,
    email: doctorB.email,
    role: "DOCTOR",
    permissions: ["VIEW_DOCTORS"],
  });

  // =========================================================================
  // SCENARIO 1 & 2: QUEUE STATUS = Completed immediately adds patient without manual sync click
  // =========================================================================
  const instantTicket: QueueTicketRecord = {
    id: "TKT-AUTO-101",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 1,
    ticketNumber: "#01",
    patientName: "Mariam Al Suwaidi",
    patientPhone: "+971 50 999 8888",
    service: "Cardiac Consultation",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "10:00",
    createdAt: "2026-10-23T06:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(instantTicket.id, instantTicket);

  // Doctor marks ticket completed via PATCH /finish
  const finishRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${instantTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishRes.statusCode, 200);

  // Immediately query /patients (NO sync endpoint called!)
  const immediatePatientsRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Mariam",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(immediatePatientsRes.statusCode, 200);
  const immediateBody = JSON.parse(immediatePatientsRes.body);
  assert.equal(immediateBody.total, 1, "Patient must appear immediately in /patients upon completion without manual sync");
  const mariam = immediateBody.items[0];
  assert.equal(mariam.name, "Mariam Al Suwaidi");
  assert.equal(mariam.normalizedPhone, "0509998888");
  assert.equal(mariam.totalVisits, 1);
  assert.equal(mariam.status, "Active");

  // =========================================================================
  // SCENARIO 3: Repeated completion events do not duplicate visits
  // =========================================================================
  const repeatFinishRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${instantTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(repeatFinishRes.statusCode, 200);

  const mariamAfterRepeat = patientsMap.get(mariam.id);
  assert.equal(mariamAfterRepeat?.visitHistory.length, 1, "Repeated completion must not add duplicate visitHistory items");
  assert.equal(mariamAfterRepeat?.totalVisits, 1, "Repeated completion must not inflate totalVisits");

  // =========================================================================
  // SCENARIO 4: Repeated sync requests do not duplicate patients or visits
  // =========================================================================
  const sync1 = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(sync1.statusCode, 200);

  const sync2 = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(sync2.statusCode, 200);
  const sync2Body = JSON.parse(sync2.body);
  assert.equal(sync2Body.newPatientsCount, 0, "Repeated sync must create 0 new patients");

  // =========================================================================
  // SCENARIO 5: SKIPPED / ABSENT does NOT create a new patient record
  // =========================================================================
  const skippedNewTicket: QueueTicketRecord = {
    id: "TKT-SKIPPED-201",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 2,
    ticketNumber: "#02",
    patientName: "Mr. Skipped NoShow",
    patientPhone: "+971 50 111 0000",
    service: "General Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "SKIPPED",
    checkInTime: "10:30",
    createdAt: "2026-10-23T06:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(skippedNewTicket.id, skippedNewTicket);

  // Sync is run
  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  const noShowCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Skipped",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(JSON.parse(noShowCheck.body).total, 0, "Skipped/absent ticket must NOT create a new patient record");

  // =========================================================================
  // SCENARIO 6 & 7: Existing patient is not deleted & totalVisits NOT incremented when ticket is skipped
  // =========================================================================
  // Mariam returns another day but is skipped
  const mariamSkippedTicket: QueueTicketRecord = {
    id: "TKT-SKIPPED-202",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 3,
    ticketNumber: "#03",
    patientName: "Mariam Al Suwaidi",
    patientPhone: "+971 50 999 8888",
    service: "Followup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "SKIPPED",
    checkInTime: "11:00",
    createdAt: "2026-10-24T07:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(mariamSkippedTicket.id, mariamSkippedTicket);

  // Run sync
  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  const mariamAfterSkip = patientsMap.get(mariam.id);
  assert.ok(mariamAfterSkip, "Existing patient must NOT be deleted when a ticket is skipped");
  assert.equal(mariamAfterSkip.totalVisits, 1, "Skipped ticket must NOT increment attended visits");

  // =========================================================================
  // SCENARIO 8: Day-End Cleanup removes tickets from active queue but preserves patients & appointments
  // =========================================================================
  // Add an appointment for Doctor A
  const sampleApt: AppointmentRecord = {
    id: "APT-HIST-101",
    referenceNumber: "GB-REF-101",
    voucherId: "ID-23102026",
    bookingNumber: 1,
    bookingNumberDisplay: "#01",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-23",
    appointmentTime: "10:00",
    service: "Cardiac Consultation",
    patientName: "Mariam Al Suwaidi",
    patientPhone: "0509998888",
    status: "COMPLETED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-23T10:30:00Z",
  };
  appointmentsMap.set(sampleApt.id, sampleApt);

  // Trigger day-end cleanup for Doctor A
  const dayEndRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/day-end",
    headers: { authorization: `Bearer ${doctorAToken}` },
    payload: { forceToday: true, targetDateKey: "2026-10-23" },
  });
  assert.equal(dayEndRes.statusCode, 200);
  const dayEndBody = JSON.parse(dayEndRes.body);
  assert.equal(dayEndBody.success, true);
  assert.ok(dayEndBody.archivedCount >= 1, "Should archive today's queue tickets");

  // Active queue query must now have zero active unarchived tickets
  const activeQueueTickets = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: "2026-10-23",
  });
  assert.equal(activeQueueTickets.length, 0, "Archived tickets must not be returned in active live queue");

  // Patient record is 100% preserved
  const preservedPatient = patientsMap.get(mariam.id);
  assert.ok(preservedPatient, "Patient record must be preserved after day-end cleanup");
  assert.equal(preservedPatient.totalVisits, 1);

  // Appointment history is 100% preserved
  const preservedApt = appointmentsMap.get(sampleApt.id);
  assert.ok(preservedApt, "Appointment record must never be deleted during queue cleanup");

  // =========================================================================
  // SCENARIO 9: A different doctor's or clinic's queue remains untouched
  // =========================================================================
  const docBTicket: QueueTicketRecord = {
    id: "TKT-DOCB-301",
    doctorId: doctorB.doctorId,
    doctorAccountId: doctorB.id,
    chamberId: "CHAMBER-2",
    chamberName: "Abu Dhabi Pediatrics",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 1,
    ticketNumber: "#01",
    patientName: "Sara Hassan",
    patientPhone: "+971 50 777 6666",
    service: "Pediatrics",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "WAITING",
    checkInTime: "09:00",
    createdAt: "2026-10-23T05:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(docBTicket.id, docBTicket);

  // Verify Doctor B's queue query via HTTP endpoint with doctorBToken
  const docBHttpRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/queue?chamberId=CHAMBER-2&dateKey=2026-10-23",
    headers: { authorization: `Bearer ${doctorBToken}` },
  });
  assert.equal(docBHttpRes.statusCode, 200);

  // Doctor A ran cleanup; Doctor B's ticket must remain active and unarchived!
  const docBActiveTickets = await getDoctorQueueTickets(doctorB.doctorId, {
    chamberId: "CHAMBER-2",
    dateKey: "2026-10-23",
  });
  assert.equal(docBActiveTickets.length, 1, "Doctor B's queue must remain active and completely untouched");
  assert.equal(docBActiveTickets[0]?.isArchived, undefined);

  // =========================================================================
  // SCENARIO 10: Timezone and date-boundary behaviour is correct
  // =========================================================================
  // Boundary check: Oct 23, 2026 at 20:30 UTC
  // In Asia/Dhaka (+6), local time is Oct 24, 2026 02:30 AM -> dateKey = "2026-10-24"
  // In Asia/Dubai (+4), local time is Oct 24, 2026 00:30 AM -> dateKey = "2026-10-24"
  // In UTC (+0), local time is Oct 23, 2026 20:30 -> dateKey = "2026-10-23"
  const lateUtcDate = new Date("2026-10-23T20:30:00Z");
  assert.equal(getChamberBusinessDate("Asia/Dhaka", lateUtcDate), "2026-10-24");
  assert.equal(getChamberBusinessDate("Asia/Dubai", lateUtcDate), "2026-10-24");
  assert.equal(getChamberBusinessDate("UTC", lateUtcDate), "2026-10-23");

  // =========================================================================
  // SCENARIO 11: Cleanup retries are idempotent
  // =========================================================================
  const retryCleanup = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/queue/day-end",
    headers: { authorization: `Bearer ${doctorAToken}` },
    payload: { forceToday: true, targetDateKey: "2026-10-23" },
  });
  assert.equal(retryCleanup.statusCode, 200);
  const retryBody = JSON.parse(retryCleanup.body);
  assert.equal(retryBody.archivedCount, 0, "Retrying cleanup must archive 0 additional records and not fail");

  // =========================================================================
  // SCENARIO 12: Failed sync produces a visible error rather than a false success
  // =========================================================================
  // Temporarily simulate database disconnection
  mongoAdapter.isConnected = () => false;

  const failedSyncRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(failedSyncRes.statusCode, 503, "Sync must fail visibly with 503 when database is unavailable");

  const failedFinishRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${instantTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(failedFinishRes.statusCode, 503, "Finish ticket must fail visibly with 503 when database is unavailable");

  // Restore connection
  mongoAdapter.isConnected = () => true;

  // =========================================================================
  // SCENARIO 13: Two family members sharing one phone number are NEVER merged
  // =========================================================================
  const rashidTicket: QueueTicketRecord = {
    id: "TKT-FAMILY-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 10,
    ticketNumber: "#10",
    patientName: "Rashid Al Suwaidi",
    patientPhone: "+971 50 999 8888", // Same family contact number!
    service: "Pediatric Follow-up",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "11:30",
    createdAt: "2026-10-23T07:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(rashidTicket.id, rashidTicket);

  const finishRashidRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${rashidTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishRashidRes.statusCode, 200);

  // Both patients must exist under Doctor A with phone "0509998888"
  const familyQueryRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0509998888",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(familyQueryRes.statusCode, 200);
  const familyBody = JSON.parse(familyQueryRes.body);
  assert.equal(familyBody.total, 2, "Both family members sharing a phone must exist as distinct patient records");

  const mariamRecord = familyBody.items.find((p: any) => p.name === "Mariam Al Suwaidi");
  const rashidRecord = familyBody.items.find((p: any) => p.name === "Rashid Al Suwaidi");
  assert.ok(mariamRecord, "Mariam record must exist with its own name and identity");
  assert.ok(rashidRecord, "Rashid record must exist with its own name and identity");
  assert.notEqual(mariamRecord.id, rashidRecord.id, "Family members must have distinct patient IDs");
  assert.notEqual(mariamRecord.mrn, rashidRecord.mrn, "Family members must have distinct MRNs");
  assert.equal(mariamRecord.totalVisits, 1, "Mariam's visits must not be corrupted by Rashid's completion");
  assert.equal(rashidRecord.totalVisits, 1, "Rashid must have his own independent visit history");

  // =========================================================================
  // SCENARIO 14: Manual creation never overwrites another patient sharing a phone
  // =========================================================================
  const manualFamilyRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients",
    headers: { authorization: `Bearer ${doctorAToken}` },
    payload: {
      name: "Zainab Al Suwaidi",
      phone: "+971 50 999 8888", // Same phone number
      bloodGroup: "O+",
      status: "New",
      notes: "Family member registered manually",
    },
  });
  assert.equal(manualFamilyRes.statusCode, 201);
  const manualBody = JSON.parse(manualFamilyRes.body);
  assert.equal(manualBody.patient.name, "Zainab Al Suwaidi");

  // Verify all three distinct records exist and none were overwritten
  const allFamilyRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0509998888",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const allFamilyBody = JSON.parse(allFamilyRes.body);
  assert.equal(allFamilyBody.total, 3, "Three family members sharing one phone must all exist independently");

  // Re-submitting for same person (with slight title variation) updates instead of duplicating
  const updateSamePersonRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients",
    headers: { authorization: `Bearer ${doctorAToken}` },
    payload: {
      name: "Mrs. Zainab Al Suwaidi",
      phone: "+971 50 999 8888",
      bloodGroup: "O+",
      notes: "Updated clinical notes",
    },
  });
  assert.equal(updateSamePersonRes.statusCode, 201);
  const updatedZainab = JSON.parse(updateSamePersonRes.body).patient;
  assert.equal(updatedZainab.id, manualBody.patient.id, "Compatible name with honorific variation updates the same patient record");

  // =========================================================================
  // SCENARIO 15: Voucher ID vs Patient ID matching
  // =========================================================================
  const voucherApt: AppointmentRecord = {
    id: "APT-VOUCHER-999",
    referenceNumber: "GB-REF-999",
    voucherId: "ID-23102026",
    bookingNumber: 5,
    bookingNumberDisplay: "#05",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-23",
    appointmentTime: "12:00",
    service: "Consultation",
    patientName: "Tariq Mahmood",
    patientPhone: "+971 50 444 3333",
    status: "CONFIRMED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  };
  appointmentsMap.set(voucherApt.id, voucherApt);

  // 1. Sync appointment while status is CONFIRMED must NOT create a patient record
  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  const tariqPatientBeforeFinishRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Tariq",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(
    JSON.parse(tariqPatientBeforeFinishRes.body).total,
    0,
    "Tariq must NOT be created from appointment sync while status is CONFIRMED"
  );

  // 2. Create queue ticket referencing appointment voucherId as patientOprId
  const voucherTicket: QueueTicketRecord = {
    id: "TKT-VOUCHER-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 15,
    ticketNumber: "#15",
    patientName: "Tariq Mahmood",
    patientPhone: "+971 50 444 3333",
    patientOprId: "ID-23102026", // Voucher ID, not patient primary key!
    appointmentId: voucherApt.id,
    service: "Consultation",
    priority: "STANDARD",
    channel: "ONLINE_WEB",
    status: "CALLED",
    checkInTime: "12:00",
    createdAt: "2026-10-23T08:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(voucherTicket.id, voucherTicket);

  // Calling / waiting ticket must NOT create a patient record
  const tariqCalledRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Tariq",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(JSON.parse(tariqCalledRes.body).total, 0, "Called ticket must NOT create a patient record");

  // 3. Completing ticket resolves patient and creates record with attended visit
  const finishVoucherRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${voucherTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishVoucherRes.statusCode, 200);

  const tariqPatientRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Tariq",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const tariqPatient = JSON.parse(tariqPatientRes.body).items[0];
  assert.ok(tariqPatient, "Tariq must be created after consultation completion");
  assert.ok(tariqPatient.id.startsWith("PT-"), "Patient primary key must start with PT-");
  assert.equal(tariqPatient.totalVisits, 1, "Completed consultation must record 1 attended visit");

  // =========================================================================
  // SCENARIO 16: Safe concurrent completion / deduplication
  // =========================================================================
  // Run 3 concurrent finish calls on the same ticket
  const concurrentPromises = [1, 2, 3].map(() =>
    app.inject({
      method: "PATCH",
      url: `/api/v1/portal/doctor/queue/tickets/${voucherTicket.id}/finish`,
      headers: { authorization: `Bearer ${doctorAToken}` },
    })
  );
  const concurrentResults = await Promise.all(concurrentPromises);
  for (const res of concurrentResults) {
    assert.equal(res.statusCode, 200);
  }
  const tariqAfterConcurrent = patientsMap.get(tariqPatient.id);
  assert.equal(tariqAfterConcurrent?.totalVisits, 1, "Concurrent completions must never inflate totalVisits");

  // =========================================================================
  // SCENARIO 17: Historical (YYYYMMDD) and ISO (YYYY-MM-DD) dateKeys across Day-End Archival
  // =========================================================================
  const historicalDigitsTicket: QueueTicketRecord = {
    id: "TKT-HIST-DIGITS-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "20261021", // Historical digits-only format from 2 days ago!
    serialIndex: 20,
    ticketNumber: "#20",
    patientName: "Legacy Digits Patient",
    patientPhone: "+971 50 333 2211",
    service: "Legacy Checkup",
    priority: "STANDARD",
    channel: "ONLINE_WEB",
    status: "COMPLETED",
    checkInTime: "10:00",
    createdAt: "2026-10-21T06:00:00Z",
    createdById: "SYSTEM",
  };

  const isoPriorTicket: QueueTicketRecord = {
    id: "TKT-ISO-PRIOR-002",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-21", // ISO format from 2 days ago!
    serialIndex: 21,
    ticketNumber: "#21",
    patientName: "Legacy Iso Patient",
    patientPhone: "+971 50 333 2212",
    service: "Legacy Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "COMPLETED",
    checkInTime: "10:30",
    createdAt: "2026-10-21T06:30:00Z",
    createdById: "SYSTEM",
  };

  const todayIsoTicket: QueueTicketRecord = {
    id: "TKT-TODAY-ACTIVE-003",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: getChamberBusinessDate("Asia/Dubai", new Date()), // Today's active ticket
    serialIndex: 22,
    ticketNumber: "#22",
    patientName: "Today Active Patient",
    patientPhone: "+971 50 333 2213",
    service: "Active Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "WAITING",
    checkInTime: "11:00",
    createdAt: "2026-10-23T07:00:00Z",
    createdById: "SYSTEM",
  };

  queueTicketsMap.set(historicalDigitsTicket.id, historicalDigitsTicket);
  queueTicketsMap.set(isoPriorTicket.id, isoPriorTicket);
  queueTicketsMap.set(todayIsoTicket.id, todayIsoTicket);

  // Run automatic day-end cleanup (no targetDateKey, not forceToday: cleans up prior dates)
  const cleanupRes = await archiveDoctorQueueDayEnd(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
  });
  assert.equal(cleanupRes.success, true);

  // Both prior tickets must be archived regardless of YYYYMMDD vs YYYY-MM-DD
  assert.equal(historicalDigitsTicket.isArchived, true, "Historical digits-only YYYYMMDD ticket must be archived");
  assert.equal(isoPriorTicket.isArchived, true, "Prior ISO YYYY-MM-DD ticket must be archived");
  // Today's ticket must remain active!
  assert.equal(todayIsoTicket.isArchived, undefined, "Today's active ticket must NOT be archived");

  // =========================================================================
  // SCENARIO 18: Self-healing retry after patient sync failure on already-COMPLETED ticket
  // =========================================================================
  const unhealedTicket: QueueTicketRecord = {
    id: "TKT-UNHEALED-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 30,
    ticketNumber: "#30",
    patientName: "Self Healing Patient",
    patientPhone: "+971 50 555 1234",
    service: "Cardiac Followup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "COMPLETED", // Already COMPLETED in queue_tickets
    completedAt: "2026-10-23T08:00:00Z",
    checkInTime: "08:00",
    createdAt: "2026-10-23T07:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(unhealedTicket.id, unhealedTicket);

  // Doctor clicks Finish again (retry)
  const healRes = await finishQueueTicket(doctorA.doctorId, unhealedTicket.id);
  assert.equal(healRes.status, "COMPLETED");

  // Self-healing must have created/updated the persistent patient record!
  const healedPatient = Array.from(patientsMap.values()).find(
    (p) => p.name === "Self Healing Patient"
  );
  assert.ok(healedPatient, "Self-healing must create missing patient record on retry of COMPLETED ticket");
  assert.equal(healedPatient.totalVisits, 1);
  assert.equal(healedPatient.visitHistory[0]?.visitId, unhealedTicket.id);

  // =========================================================================
  // SCENARIO 19: Scheduler crash, expired lease takeover, and competing workers
  // =========================================================================
  const lockKeyDate = getChamberBusinessDate("Asia/Dubai", new Date());
  const lockKey = `${doctorA.doctorId}:CHAMBER-1:${lockKeyDate}`;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Simulate crashed worker 1 that died 10 minutes ago leaving status: RUNNING
  dayEndRunsMap.set(lockKey, {
    id: lockKey,
    doctorId: doctorA.doctorId,
    chamberId: "CHAMBER-1",
    dateKey: lockKeyDate,
    timezone: "Asia/Dubai",
    lockedAt: tenMinutesAgo,
    workerId: "crashed-worker-1",
    status: "RUNNING",
  });

  // Worker 2 runs cleanup: detects expired lease (> 5 mins) and takes over!
  const worker2Result = await runSystemDayEndCleanup({
    leaseDurationMs: 5 * 60 * 1000,
    workerId: "healthy-worker-2",
  });
  assert.equal(worker2Result.totalDoctorsProcessed, 2);

  const lockAfterWorker2 = dayEndRunsMap.get(lockKey);
  assert.ok(lockAfterWorker2, "Lock document must exist");
  assert.equal(lockAfterWorker2.status, "COMPLETED", "Healthy worker must complete the run and update status to COMPLETED");

  // Competing worker 3 attempts to run while already COMPLETED today: skips execution safely
  const worker3Result = await runSystemDayEndCleanup({
    leaseDurationMs: 5 * 60 * 1000,
    workerId: "competing-worker-3",
  });
  assert.equal(worker3Result.totalTicketsArchived, 0, "Competing worker must skip chambers already completed today");

  // =========================================================================
  // SCENARIO 20: Name subset safety (Abdul Karim vs Karim vs Abdul sharing a phone)
  // =========================================================================
  const sharedFamilyPhone = "+971 50 111 9999";
  const abdulKarimTicket: QueueTicketRecord = {
    id: "TKT-KARIM-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 40,
    ticketNumber: "#40",
    patientName: "Abdul Karim",
    patientPhone: sharedFamilyPhone,
    service: "General Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "14:00",
    createdAt: "2026-10-23T10:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(abdulKarimTicket.id, abdulKarimTicket);

  // Complete Abdul Karim ticket
  const finishAbdulKarimRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${abdulKarimTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishAbdulKarimRes.statusCode, 200);

  // Abdul Karim patient record exists
  const abdulKarimRecord = Array.from(patientsMap.values()).find(
    (p) => p.name === "Abdul Karim" && p.doctorId === doctorA.doctorId
  );
  assert.ok(abdulKarimRecord, "Abdul Karim record must exist");
  assert.equal(abdulKarimRecord.totalVisits, 1);

  // Now a new patient "Karim" with the EXACT SAME family phone checks in and completes
  const karimTicket: QueueTicketRecord = {
    id: "TKT-KARIM-002",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 41,
    ticketNumber: "#41",
    patientName: "Karim", // Subset name of Abdul Karim!
    patientPhone: sharedFamilyPhone,
    service: "General Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "14:30",
    createdAt: "2026-10-23T10:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(karimTicket.id, karimTicket);

  const finishKarimRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${karimTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishKarimRes.statusCode, 200);

  // MUST NOT merge into Abdul Karim! Karim must be created as a separate record!
  const karimRecord = Array.from(patientsMap.values()).find(
    (p) => p.name === "Karim" && p.doctorId === doctorA.doctorId
  );
  assert.ok(karimRecord, "Karim must be created as an independent patient record");
  assert.notEqual(karimRecord.id, abdulKarimRecord.id, "Karim and Abdul Karim must have distinct patient IDs");
  assert.notEqual(karimRecord.mrn, abdulKarimRecord.mrn, "Karim and Abdul Karim must have distinct MRNs");
  assert.equal(abdulKarimRecord.totalVisits, 1, "Abdul Karim visit count must not be incremented by Karim's visit");
  assert.equal(karimRecord.totalVisits, 1, "Karim must have his own independent visit count");

  // Third family member "Abdul" registered manually with the same phone
  const manualAbdulRes = await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients",
    headers: { authorization: `Bearer ${doctorAToken}` },
    payload: {
      name: "Abdul",
      phone: sharedFamilyPhone,
      bloodGroup: "B+",
      notes: "Family member Abdul",
    },
  });
  assert.equal(manualAbdulRes.statusCode, 201);
  const abdulPatientId = JSON.parse(manualAbdulRes.body).patient.id;
  assert.notEqual(abdulPatientId, abdulKarimRecord.id, "Abdul must not merge with Abdul Karim");
  assert.notEqual(abdulPatientId, karimRecord.id, "Abdul must not merge with Karim");

  // Verify all 3 distinct family members are listed under the shared phone
  const familyListRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0501119999",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const familyListBody = JSON.parse(familyListRes.body);
  assert.equal(familyListBody.total, 3, "Three family members (Abdul Karim, Karim, Abdul) must exist independently");

  // Repeated completion of Abdul Karim ticket is idempotent
  const repeatFinishKarimTicket = await finishQueueTicket(doctorA.doctorId, abdulKarimTicket.id);
  assert.equal(repeatFinishKarimTicket.status, "COMPLETED");
  const abdulKarimAfterRepeat = patientsMap.get(abdulKarimRecord.id);
  assert.equal(abdulKarimAfterRepeat?.totalVisits, 1, "Repeated completion must not inflate visits");

  // Valid explicit appointment relationship links correctly to existing Karim
  const karimApt: AppointmentRecord = {
    id: "APT-KARIM-001",
    referenceNumber: "GB-REF-KARIM-01",
    voucherId: "ID-KARIM-01",
    bookingNumber: 6,
    bookingNumberDisplay: "#06",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-23",
    appointmentTime: "15:00",
    service: "Consultation",
    patientName: "Karim",
    patientPhone: sharedFamilyPhone,
    status: "CONFIRMED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-23T11:00:00Z",
    updatedAt: "2026-10-23T11:00:00Z",
  };
  appointmentsMap.set(karimApt.id, karimApt);

  const karimAptTicket: QueueTicketRecord = {
    id: "TKT-KARIM-APT-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-23",
    serialIndex: 42,
    ticketNumber: "#42",
    patientName: "Karim",
    patientPhone: sharedFamilyPhone,
    patientOprId: karimRecord.id, // Explicit patient ID established!
    appointmentId: karimApt.id,
    service: "Consultation",
    priority: "STANDARD",
    channel: "ONLINE_WEB",
    status: "CALLED",
    checkInTime: "15:00",
    createdAt: "2026-10-23T11:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(karimAptTicket.id, karimAptTicket);

  await finishQueueTicket(doctorA.doctorId, karimAptTicket.id);
  const karimAfterApt = patientsMap.get(karimRecord.id);
  assert.equal(karimAfterApt?.totalVisits, 2, "Explicit patient relationship correctly links visit to Karim");
  assert.equal(patientsMap.get(abdulKarimRecord.id)?.totalVisits, 1, "Abdul Karim remains unaffected");

  // Tenant isolation: Doctor B cannot see Doctor A's family records
  const docBFamilyRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0501119999",
    headers: { authorization: `Bearer ${doctorBToken}` },
  });
  const docBFamilyBody = JSON.parse(docBFamilyRes.body);
  assert.equal(docBFamilyBody.total, 0, "Doctor B must not see Doctor A's patients");

  // =========================================================================
  // SCENARIO 21: Step 2 Dedicated Lifecycle & Completion-Only Registration Suite
  // =========================================================================
  const testPhoneZayed = "+971 50 777 8888";

  // 1. Appointment created, not completed -> no new patient
  const pendingApt: AppointmentRecord = {
    id: "APT-STEP2-PENDING-001",
    referenceNumber: "GB-REF-STEP2-01",
    voucherId: "VCH-STEP2-01",
    bookingNumber: 101,
    bookingNumberDisplay: "#101",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-24",
    appointmentTime: "16:00",
    service: "Consultation",
    patientName: "Zayed Al Nahyan",
    patientPhone: testPhoneZayed,
    status: "CONFIRMED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-24T08:00:00Z",
    updatedAt: "2026-10-24T08:00:00Z",
  };
  appointmentsMap.set(pendingApt.id, pendingApt);

  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  const zayedPendingCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Zayed",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(
    JSON.parse(zayedPendingCheck.body).total,
    0,
    "Appointment created (CONFIRMED) must NOT create a new patient record"
  );

  // 2. Queue ticket created (WAITING) -> no new patient
  const zayedTicket: QueueTicketRecord = {
    id: "TKT-STEP2-ZAYED-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 50,
    ticketNumber: "#50",
    patientName: "Zayed Al Nahyan",
    patientPhone: testPhoneZayed,
    patientOprId: pendingApt.voucherId,
    appointmentId: pendingApt.id,
    service: "Consultation",
    priority: "STANDARD",
    channel: "ONLINE_WEB",
    status: "WAITING",
    checkInTime: "16:00",
    createdAt: "2026-10-24T08:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(zayedTicket.id, zayedTicket);

  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const zayedWaitingCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Zayed",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(
    JSON.parse(zayedWaitingCheck.body).total,
    0,
    "Queue ticket created (WAITING) must NOT create a new patient record"
  );

  // 3. Ticket called (CALLED / IN_CONSULTATION) -> no new patient
  zayedTicket.status = "CALLED";
  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const zayedCalledCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Zayed",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(
    JSON.parse(zayedCalledCheck.body).total,
    0,
    "Ticket called (CALLED) must NOT create a new patient record"
  );

  // 4. SKIPPED, NO_SHOW, and CANCELLED -> no new patient or attended visit
  const skippedPatientTicket: QueueTicketRecord = {
    id: "TKT-STEP2-SKIPPED-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 51,
    ticketNumber: "#51",
    patientName: "Salim Al Nuaimi",
    patientPhone: "+971 50 666 5555",
    service: "Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "SKIPPED",
    checkInTime: "16:15",
    createdAt: "2026-10-24T08:35:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(skippedPatientTicket.id, skippedPatientTicket);

  const cancelledApt: AppointmentRecord = {
    id: "APT-STEP2-CANCELLED-001",
    referenceNumber: "GB-REF-STEP2-02",
    voucherId: "VCH-STEP2-02",
    bookingNumber: 102,
    bookingNumberDisplay: "#102",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-24",
    appointmentTime: "16:30",
    service: "Consultation",
    patientName: "Nasser Al Shamsi",
    patientPhone: "+971 50 666 4444",
    status: "CANCELLED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-24T08:00:00Z",
    updatedAt: "2026-10-24T08:40:00Z",
  };
  appointmentsMap.set(cancelledApt.id, cancelledApt);

  await app.inject({
    method: "POST",
    url: "/api/v1/portal/doctor/patients/sync",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });

  const salimCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Salim",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(JSON.parse(salimCheck.body).total, 0, "SKIPPED ticket must NOT create a new patient");

  const nasserCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Nasser",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(JSON.parse(nasserCheck.body).total, 0, "CANCELLED appointment must NOT create a new patient");

  // 5. Consultation completed successfully -> one patient record and one attended visit
  const finishZayedRes = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${zayedTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(finishZayedRes.statusCode, 200);

  const zayedCompletedCheck = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=Zayed",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const zayedCompletedBody = JSON.parse(zayedCompletedCheck.body);
  assert.equal(zayedCompletedBody.total, 1, "Completed consultation must create exactly 1 patient record");
  const zayedPatient = zayedCompletedBody.items[0];
  assert.equal(zayedPatient.name, "Zayed Al Nahyan");
  assert.equal(zayedPatient.totalVisits, 1, "Completed consultation must record 1 attended visit");
  assert.equal(zayedPatient.visitHistory.length, 1);
  assert.equal(zayedPatient.visitHistory[0].visitId, zayedTicket.id);

  // 6. Same ticket completed repeatedly -> no duplicate patient or visit
  const repeatFinishZayed = await app.inject({
    method: "PATCH",
    url: `/api/v1/portal/doctor/queue/tickets/${zayedTicket.id}/finish`,
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  assert.equal(repeatFinishZayed.statusCode, 200);
  const zayedAfterRepeat = patientsMap.get(zayedPatient.id);
  assert.equal(zayedAfterRepeat?.totalVisits, 1, "Repeated completion must NOT duplicate visits");
  assert.equal(zayedAfterRepeat?.visitHistory.length, 1);

  // 7. Concurrent completion attempts -> no duplicate patient/visit within runtime mutex
  const concurrentTicket: QueueTicketRecord = {
    id: "TKT-STEP2-CONCUR-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 52,
    ticketNumber: "#52",
    patientName: "Hind Al Marri",
    patientPhone: "+971 50 888 9999",
    service: "Checkup",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "17:00",
    createdAt: "2026-10-24T09:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(concurrentTicket.id, concurrentTicket);

  const concurFinishResponses = await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      app.inject({
        method: "PATCH",
        url: `/api/v1/portal/doctor/queue/tickets/${concurrentTicket.id}/finish`,
        headers: { authorization: `Bearer ${doctorAToken}` },
      })
    )
  );
  for (const r of concurFinishResponses) {
    assert.equal(r.statusCode, 200);
  }

  const hindPatients = Array.from(patientsMap.values()).filter(
    (p) => p.name === "Hind Al Marri" && p.doctorId === doctorA.doctorId
  );
  assert.equal(hindPatients.length, 1, "Concurrent completion must produce exactly 1 patient record");
  assert.ok(hindPatients[0], "Hind patient record must exist");
  assert.equal(hindPatients[0].totalVisits, 1, "Concurrent completion must record exactly 1 attended visit");
  assert.equal(hindPatients[0].visitHistory.length, 1);

  // 8. Existing patient linked to a completed appointment -> reuse the correct record
  const zayedFollowupApt: AppointmentRecord = {
    id: "APT-STEP2-FOLLOWUP-002",
    referenceNumber: "GB-REF-STEP2-03",
    voucherId: "VCH-STEP2-03",
    bookingNumber: 103,
    bookingNumberDisplay: "#103",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: "2026-10-24",
    appointmentTime: "17:30",
    service: "Followup",
    patientName: "Zayed Al Nahyan",
    patientPhone: testPhoneZayed,
    status: "CONFIRMED",
    chamberTimezone: "Asia/Dubai",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-24T09:30:00Z",
    updatedAt: "2026-10-24T09:30:00Z",
  };
  appointmentsMap.set(zayedFollowupApt.id, zayedFollowupApt);

  const zayedFollowupTicket: QueueTicketRecord = {
    id: "TKT-STEP2-ZAYED-002",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 53,
    ticketNumber: "#53",
    patientName: "Zayed Al Nahyan",
    patientPhone: testPhoneZayed,
    patientOprId: zayedPatient.id, // Explicit existing patient primary key
    appointmentId: zayedFollowupApt.id,
    service: "Followup",
    priority: "STANDARD",
    channel: "ONLINE_WEB",
    status: "CALLED",
    checkInTime: "17:30",
    createdAt: "2026-10-24T09:30:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(zayedFollowupTicket.id, zayedFollowupTicket);

  await finishQueueTicket(doctorA.doctorId, zayedFollowupTicket.id);

  const zayedAfterFollowup = patientsMap.get(zayedPatient.id);
  assert.equal(zayedAfterFollowup?.totalVisits, 2, "Followup completion must increment totalVisits to 2");
  assert.equal(zayedAfterFollowup?.visitHistory.length, 2, "Followup completion must record 2 visits");

  // 9. Same phone number with different patient names -> no unsafe merge
  const sultanTicket: QueueTicketRecord = {
    id: "TKT-STEP2-SULTAN-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: "Asia/Dubai",
    dateKey: "2026-10-24",
    serialIndex: 54,
    ticketNumber: "#54",
    patientName: "Sultan Al Nahyan", // Shares testPhoneZayed with Zayed Al Nahyan
    patientPhone: testPhoneZayed,
    service: "Consultation",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "CALLED",
    checkInTime: "18:00",
    createdAt: "2026-10-24T10:00:00Z",
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(sultanTicket.id, sultanTicket);

  await finishQueueTicket(doctorA.doctorId, sultanTicket.id);

  const sharedPhoneListRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0507778888",
    headers: { authorization: `Bearer ${doctorAToken}` },
  });
  const sharedPhoneList = JSON.parse(sharedPhoneListRes.body);
  assert.equal(
    sharedPhoneList.total,
    2,
    "Different patients sharing a phone (Zayed vs Sultan) must NOT be merged into one"
  );
  const sultanRecord = sharedPhoneList.items.find((p: any) => p.name === "Sultan Al Nahyan");
  assert.ok(sultanRecord, "Sultan record must exist independently");
  assert.notEqual(sultanRecord.id, zayedPatient.id, "Sultan and Zayed must have distinct patient IDs");
  assert.equal(sultanRecord.totalVisits, 1, "Sultan must have exactly 1 visit");
  assert.equal(patientsMap.get(zayedPatient.id)?.totalVisits, 2, "Zayed must keep his 2 visits intact");

  // 10. Tenant/doctor isolation
  const docBIsolationRes = await app.inject({
    method: "GET",
    url: "/api/v1/portal/doctor/patients?search=0507778888",
    headers: { authorization: `Bearer ${doctorBToken}` },
  });
  assert.equal(
    JSON.parse(docBIsolationRes.body).total,
    0,
    "Doctor B must NOT see Doctor A's patients under any search"
  );

  // 11. Existing patient records remain intact
  assert.ok(patientsMap.get(mariam.id), "Mariam patient record must remain intact");
  assert.ok(patientsMap.get(tariqPatient.id), "Tariq patient record must remain intact");
  assert.ok(patientsMap.get(abdulKarimRecord.id), "Abdul Karim patient record must remain intact");
  assert.ok(patientsMap.get(karimRecord.id), "Karim patient record must remain intact");

  // =========================================================================
  // SCENARIO 24: REGRESSION — Appointment Auto-Sync Historical Guard & Upsert Semantics
  // =========================================================================
  function shiftDateIso(isoDate: string, days: number): string {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  const chamberTz = "Asia/Dubai";
  const now = new Date();
  const todayKey = getChamberBusinessDate(chamberTz, now);
  const pastDateKey = shiftDateIso(todayKey, -30);

  // 1. Historical date: an appointment without a matching queue ticket must not create a new active ticket when querying a past chamber-local date
  const pastApt: AppointmentRecord = {
    id: "APT-REGRESS-PAST-001",
    referenceNumber: "GB-REF-PAST-001",
    voucherId: "VOUCHER-PAST-001",
    bookingNumber: 88,
    bookingNumberDisplay: "#88",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: pastDateKey,
    appointmentTime: "09:00",
    service: "Historical Checkup",
    patientName: "Past Date Patient",
    patientPhone: "0501112233",
    status: "CONFIRMED",
    chamberTimezone: chamberTz,
    channel: "ONLINE_WEB",
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  };
  appointmentsMap.set(pastApt.id, pastApt);

  const pastActiveTickets = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: pastDateKey,
  });
  assert.equal(
    pastActiveTickets.length,
    0,
    "Historical appointment must NOT synthesize a new active queue ticket for a past chamber date"
  );

  // 2. Current date: appointment auto-sync continues to create the expected ticket
  const todayApt: AppointmentRecord = {
    id: "APT-REGRESS-TODAY-001",
    referenceNumber: "GB-REF-TODAY-001",
    voucherId: "VOUCHER-TODAY-001",
    bookingNumber: 89,
    bookingNumberDisplay: "#89",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    doctorName: doctorA.fullName,
    doctorSpecialty: doctorA.specialty,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    appointmentDate: todayKey,
    appointmentTime: "10:30",
    service: "Today Active Checkup",
    patientName: "Today Active Patient",
    patientPhone: "0502223344",
    status: "CONFIRMED",
    chamberTimezone: chamberTz,
    channel: "ONLINE_WEB",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  appointmentsMap.set(todayApt.id, todayApt);

  const todayActiveTickets = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: todayKey,
  });
  const syncedTodayTicket = todayActiveTickets.find((t) => t.appointmentId === todayApt.id);
  assert.ok(syncedTodayTicket, "Current-date appointment must be auto-synced into active live queue");
  assert.equal(syncedTodayTicket.patientName, "Today Active Patient");
  assert.equal(syncedTodayTicket.isArchived, undefined, "Current-date synced ticket must be active");

  // 3. Archived history: includeArchived: true retains its intended historical-query behavior
  const archivedHistoryTicket: QueueTicketRecord = {
    id: "TKT-REGRESS-ARCHIVED-001",
    doctorId: doctorA.doctorId,
    doctorAccountId: doctorA.id,
    chamberId: "CHAMBER-1",
    chamberName: "Main Cardiology Chamber",
    chamberTimezone: chamberTz,
    dateKey: pastDateKey,
    serialIndex: 90,
    ticketNumber: "#90",
    patientName: "Archived History Patient",
    patientPhone: "0503334455",
    service: "Past Consultation",
    priority: "STANDARD",
    channel: "WALK_IN",
    status: "COMPLETED",
    checkInTime: "08:30",
    isArchived: true,
    archivedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdById: "SYSTEM",
  };
  queueTicketsMap.set(archivedHistoryTicket.id, archivedHistoryTicket);

  const pastWithoutArchived = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: pastDateKey,
  });
  assert.equal(pastWithoutArchived.length, 0, "Default live queue must not return archived ticket");

  const pastWithArchived = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: pastDateKey,
    includeArchived: true,
  });
  assert.equal(pastWithArchived.length, 1, "includeArchived: true must retain historical visibility");
  assert.equal(pastWithArchived[0]?.id, archivedHistoryTicket.id);
  assert.equal(pastWithArchived[0]?.isArchived, true);

  // 4. Existing ticket: auto-sync must not overwrite an existing ticket through $setOnInsert
  assert.ok(syncedTodayTicket, "syncedTodayTicket must exist");
  const ticketInMap = queueTicketsMap.get(syncedTodayTicket.id)!;
  ticketInMap.notes = "CUSTOM_DOCTOR_NOTE_PRESERVED";
  ticketInMap.priority = "URGENT";

  const repeatTodayQuery = await getDoctorQueueTickets(doctorA.doctorId, {
    chamberId: "CHAMBER-1",
    dateKey: todayKey,
  });
  const repeatTodayTicket = repeatTodayQuery.find((t) => t.id === syncedTodayTicket.id);
  assert.ok(repeatTodayTicket, "Ticket must still exist");
  assert.equal(
    repeatTodayTicket.notes,
    "CUSTOM_DOCTOR_NOTE_PRESERVED",
    "Repeat auto-sync must not overwrite existing ticket fields with $setOnInsert"
  );
  assert.equal(
    repeatTodayTicket.priority,
    "URGENT",
    "Repeat auto-sync must preserve modified existing ticket state"
  );
});
