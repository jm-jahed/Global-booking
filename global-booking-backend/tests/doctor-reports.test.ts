import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import type { AdminSessionPayload } from "../src/modules/auth/auth.types.js";
import type { DoctorRecord } from "../src/modules/admin/admin.types.js";
import type { QueueTicketRecord } from "../src/modules/queue/queue.types.js";
import type { AppointmentRecord } from "../src/modules/appointments/appointments.types.js";
import type { PatientRecord } from "../src/modules/patients/patients.types.js";

test("Doctor Reports Comprehensive Test Suite", async (t) => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  // Doctor A (Main Test Doctor)
  const doctorA: DoctorRecord = {
    id: "ACC-DOC-9001",
    doctorId: "DOC-9001",
    fullName: "Dr. Jahedul Islam",
    email: "dr.jahedul@globalbooking.ae",
    phone: "+971501234567",
    avatar: "https://example.com/avatar-jahedul.jpg",
    specialty: "Consultant Cardiologist",
    licenseNumber: "DHA-DOC-9001",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9001",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "Mediclinic Dubai Mall",
    yearsOfExperience: 15,
    medicalDegrees: ["MBBS", "MD", "FRCP"],
    consultationFee: {
      amountInFils: 50000, // 500 AED
      currency: "AED",
      formatted: "AED 500.00",
    },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  // Doctor B (Tenant Isolation Test Doctor)
  const doctorB: DoctorRecord = {
    id: "ACC-DOC-9002",
    doctorId: "DOC-9002",
    fullName: "Dr. Fatima Zahra",
    email: "dr.fatima@globalbooking.ae",
    phone: "+971509998888",
    avatar: "https://example.com/avatar-fatima.jpg",
    specialty: "Neurologist",
    licenseNumber: "DHA-DOC-9002",
    accountStatus: "ACTIVE",
    isPublished: true,
    approvedAt: "2026-01-01T00:00:00.000Z",
    subscriptionId: "SUB-9002",
    assignedPatientCount: 0,
    totalBookingsCount: 0,
    chamberLocationsSummary: "American Hospital Dubai",
    yearsOfExperience: 10,
    medicalDegrees: ["MBBS", "FCPS"],
    consultationFee: {
      amountInFils: 40000, // 400 AED
      currency: "AED",
      formatted: "AED 400.00",
    },
    isActivated: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  // Doctor Suspended
  const doctorSuspended: DoctorRecord = {
    ...doctorA,
    id: "ACC-DOC-9099",
    doctorId: "DOC-9099",
    accountStatus: "SUSPENDED",
  };

  // In-Memory Database Stores
  let storeDoctors: DoctorRecord[] = [doctorA, doctorB, doctorSuspended];
  let storeTickets: QueueTicketRecord[] = [];
  let storeAppointments: AppointmentRecord[] = [];
  let storePatients: PatientRecord[] = [];

  // Override MongoAdapter for isolated testing
  const origIsConnected = mongoAdapter.isConnected.bind(mongoAdapter);
  const origGetDoctorCol = mongoAdapter.getDoctorCollection.bind(mongoAdapter);
  const origGetQueueCol = mongoAdapter.getQueueTicketCollection.bind(mongoAdapter);
  const origGetAptCol = mongoAdapter.getAppointmentCollection.bind(mongoAdapter);
  const origGetPatientCol = mongoAdapter.getPatientCollection.bind(mongoAdapter);

  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (query: any) => {
      return (
        storeDoctors.find((d) => {
          if (query.id && d.id === query.id) return true;
          if (query.doctorId && d.doctorId === query.doctorId) return true;
          if (Array.isArray(query.$or)) {
            return query.$or.some(
              (q: any) => (q.id && d.id === q.id) || (q.doctorId && d.doctorId === q.doctorId),
            );
          }
          return false;
        }) || null
      );
    },
  });

  (mongoAdapter as any).getQueueTicketCollection = () => ({
    find: (query: any) => {
      let filtered = storeTickets.filter((t) => {
        if (query.doctorId && t.doctorId !== query.doctorId) return false;
        if (query.chamberId && t.chamberId !== query.chamberId) return false;

        // Date key filter
        if (query.$or) {
          const match = query.$or.some((clause: any) => {
            if (clause.dateKey?.$gte && clause.dateKey?.$lte) {
              const dk = t.dateKey;
              return dk >= clause.dateKey.$gte && dk <= clause.dateKey.$lte;
            }
            return false;
          });
          if (!match) return false;
        }
        return true;
      });

      return {
        sort: () => ({
          toArray: async () => [...filtered],
        }),
      };
    },
  });

  (mongoAdapter as any).getAppointmentCollection = () => ({
    find: (query: any) => {
      let filtered = storeAppointments.filter((a) => {
        if (query.doctorId && a.doctorId !== query.doctorId) return false;
        if (query.chamberId && a.chamberId !== query.chamberId) return false;
        if (query.appointmentDate?.$gte && a.appointmentDate < query.appointmentDate.$gte) return false;
        if (query.appointmentDate?.$lte && a.appointmentDate > query.appointmentDate.$lte) return false;
        return true;
      });

      return {
        sort: () => ({
          toArray: async () => [...filtered],
        }),
      };
    },
  });

  (mongoAdapter as any).getPatientCollection = () => ({
    find: (query: any) => {
      let filtered = storePatients.filter((p) => {
        if (query.doctorId && p.doctorId !== query.doctorId) return false;
        return true;
      });
      return {
        toArray: async () => [...filtered],
      };
    },
  });

  // Helpers to sign JWT
  const tokenDocA = app.jwt.sign({
    adminId: doctorA.id,
    email: doctorA.email,
    role: "DOCTOR",
    permissions: [],
  } as AdminSessionPayload);

  const tokenDocB = app.jwt.sign({
    adminId: doctorB.id,
    email: doctorB.email,
    role: "DOCTOR",
    permissions: [],
  } as AdminSessionPayload);

  const tokenSuspended = app.jwt.sign({
    adminId: doctorSuspended.id,
    email: doctorSuspended.email,
    role: "DOCTOR",
    permissions: [],
  } as AdminSessionPayload);

  const tokenAdmin = app.jwt.sign({
    adminId: "ADM-1",
    email: "admin@globalbooking.ae",
    role: "SUPER_ADMIN",
    permissions: ["VIEW_DOCTORS"],
  } as AdminSessionPayload);

  await t.test("1. Authorization: rejects unauthenticated, non-doctor, and suspended doctor", async () => {
    // 401 unauthenticated
    const resNoAuth = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports",
    });
    assert.equal(resNoAuth.statusCode, 401);

    // 403 non-doctor
    const resAdmin = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resAdmin.statusCode, 403);

    // 403 suspended
    const resSuspended = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports",
      headers: { authorization: `Bearer ${tokenSuspended}` },
    });
    assert.equal(resSuspended.statusCode, 403);
  });

  await t.test("2. Zero-Record Doctor: returns genuine 0 counts without mock fallbacks", async () => {
    storeTickets = [];
    storeAppointments = [];
    storePatients = [];

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-01&endDate=2026-10-25",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    // Assert strictly zero - never fallback 48 or 62
    assert.equal(body.summary.totalVisits, 0);
    assert.equal(body.summary.totalPatients, 0);
    assert.equal(body.summary.followUpVisits, 0);
    assert.equal(body.summary.newPatientVisits, 0);
    assert.equal(body.summary.averageIntervalDays, null);
    assert.equal(body.summary.hasSufficientIntervalData, false);

    // Donut breakdown hasData is false, 0 percentages
    assert.equal(body.visitTypeBreakdown.hasData, false);
    assert.equal(body.visitTypeBreakdown.consultationPct, 0);
    assert.equal(body.visitTypeBreakdown.followUpPct, 0);

    // Encounters empty
    assert.equal(body.encounters.total, 0);
    assert.equal(body.encounters.items.length, 0);

    // Trend points are generated with 0 visits for all 25 days
    assert.equal(body.visitTrend.length, 25);
    assert.equal(body.visitTrend[0].totalVisits, 0);
  });

  await t.test("3. Date Validation: rejects invalid format and reversed date ranges", async () => {
    const resInvalid = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=invalid-date&endDate=2026-10-25",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });
    assert.equal(resInvalid.statusCode, 400);

    const resReversed = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-25&endDate=2026-10-01",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });
    assert.equal(resReversed.statusCode, 400);
  });

  await t.test("4. Real Completed Visits, Interval Math, Deduplication & Date Boundaries", async () => {
    // Seed real records for Doctor A:
    // Patient 1: "Mariam Al Suwaidi" (2 completed visits: 2026-10-01 and 2026-10-15 -> 14 days interval)
    // Patient 2: "Tariq Mahmood" (1 completed visit on 2026-10-20)
    // Patient 3: Out-of-bounds completed visit on 2026-09-20 (must NOT be counted)
    // Linked Appointment: APT-100 linked to TKT-01 (must NOT be counted twice)

    storeTickets = [
      {
        id: "TKT-01",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        dateKey: "2026-10-01",
        serialIndex: 1,
        ticketNumber: "#01",
        patientName: "Mariam Al Suwaidi",
        patientPhone: "+971501112222",
        service: "General Consultation",
        priority: "STANDARD",
        channel: "ONLINE_WEB",
        appointmentId: "APT-100", // Linked to appointment
        status: "COMPLETED",
        checkInTime: "09:30 AM",
        createdAt: "2026-10-01T05:30:00.000Z",
        completedAt: "2026-10-01T06:00:00.000Z",
        createdById: "SYSTEM",
      },
      {
        id: "TKT-02",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        dateKey: "2026-10-15",
        serialIndex: 2,
        ticketNumber: "#02",
        patientName: "Mariam Al Suwaidi",
        patientPhone: "+971501112222",
        service: "Follow-Up Review",
        priority: "STANDARD",
        channel: "WALK_IN",
        status: "COMPLETED",
        checkInTime: "10:15 AM",
        createdAt: "2026-10-15T06:15:00.000Z",
        completedAt: "2026-10-15T06:45:00.000Z",
        createdById: "SYSTEM",
      },
      {
        id: "TKT-03",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        dateKey: "2026-10-20",
        serialIndex: 3,
        ticketNumber: "#03",
        patientName: "Tariq Mahmood",
        patientPhone: "+971523334444",
        service: "Cardiology Consultation",
        priority: "STANDARD",
        channel: "WALK_IN",
        status: "COMPLETED",
        checkInTime: "11:00 AM",
        createdAt: "2026-10-20T07:00:00.000Z",
        completedAt: "2026-10-20T07:30:00.000Z",
        createdById: "SYSTEM",
      },
      // Out of bounds ticket (before range)
      {
        id: "TKT-OLD",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        dateKey: "2026-09-20",
        serialIndex: 1,
        ticketNumber: "#01",
        patientName: "Old Patient",
        patientPhone: "+971509990000",
        service: "Consultation",
        priority: "STANDARD",
        channel: "WALK_IN",
        status: "COMPLETED",
        checkInTime: "10:00 AM",
        createdAt: "2026-09-20T06:00:00.000Z",
        createdById: "SYSTEM",
      },
    ];

    // Standalone Appointment & Linked Appointment
    storeAppointments = [
      // Linked to TKT-01 (Must NOT be double counted!)
      {
        id: "APT-100",
        referenceNumber: "REF-100",
        voucherId: "GB-VOUCH-100",
        bookingNumber: 1,
        bookingNumberDisplay: "#01",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        doctorName: "Dr. Jahedul Islam",
        doctorSpecialty: "Cardiology",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        patientName: "Mariam Al Suwaidi",
        patientPhone: "+971501112222",
        appointmentDate: "2026-10-01",
        appointmentTime: "09:30 AM",
        service: "General Consultation",
        status: "COMPLETED",
        channel: "ONLINE_WEB",
        createdAt: "2026-10-01T04:00:00.000Z",
        updatedAt: "2026-10-01T06:00:00.000Z",
      },
      // Standalone Appointment completed
      {
        id: "APT-200",
        referenceNumber: "REF-200",
        voucherId: "GB-VOUCH-200",
        bookingNumber: 4,
        bookingNumberDisplay: "#04",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        doctorName: "Dr. Jahedul Islam",
        doctorSpecialty: "Cardiology",
        chamberId: "CH-1",
        chamberName: "Mediclinic Dubai Mall",
        chamberTimezone: "Asia/Dubai",
        patientName: "Rashid Khalifa",
        patientPhone: "+971556667777",
        appointmentDate: "2026-10-22",
        appointmentTime: "02:00 PM",
        service: "Routine Clinical Review",
        status: "COMPLETED",
        channel: "ONLINE_WEB",
        createdAt: "2026-10-22T08:00:00.000Z",
        updatedAt: "2026-10-22T10:30:00.000Z",
      },
    ];

    // Seed patient registry with MRN
    storePatients = [
      {
        id: "PT-01",
        mrn: "GB-MRN-0001",
        doctorId: "DOC-9001",
        doctorAccountId: "ACC-DOC-9001",
        name: "Mariam Al Suwaidi",
        phone: "+971 50 111 2222",
        normalizedPhone: "0501112222",
        status: "Active",
        totalVisits: 2,
        visitHistory: [],
        createdAt: "2026-10-01T05:00:00.000Z",
        updatedAt: "2026-10-15T06:45:00.000Z",
      },
    ];

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-01&endDate=2026-10-25",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    // Total visits = 3 from queue (TKT-01, TKT-02, TKT-03) + 1 standalone appointment (APT-200) = 4 visits
    // Note: TKT-OLD (Sept 20) is strictly excluded by date range.
    // Note: APT-100 is deduplicated because TKT-01 represents it.
    assert.equal(body.summary.totalVisits, 4);

    // Unique patients: Mariam Al Suwaidi, Tariq Mahmood, Rashid Khalifa = 3 unique patients
    assert.equal(body.summary.totalPatients, 3);

    // Follow-up visits: TKT-02 (Mariam Al Suwaidi second visit) = 1
    // Review visits: APT-200 ("Routine Clinical Review") = 1
    // Consultation visits: TKT-01 (Mariam first visit), TKT-03 (Tariq) = 2
    assert.equal(body.summary.followUpVisits, 1);
    assert.equal(body.summary.newPatientVisits, 2);

    // Interval Calculation:
    // Mariam had visits on 2026-10-01 and 2026-10-15 -> exactly 14 days interval!
    assert.equal(body.summary.averageIntervalDays, 14);
    assert.equal(body.summary.hasSufficientIntervalData, true);

    // Donut breakdown hasData is true
    assert.equal(body.visitTypeBreakdown.hasData, true);
    assert.equal(body.visitTypeBreakdown.consultationCount, 2);
    assert.equal(body.visitTypeBreakdown.followUpCount, 1);
    assert.equal(body.visitTypeBreakdown.reviewCount, 1);

    // Verify MRN matching for Mariam Al Suwaidi
    const mariamEnc = body.encounters.items.find((e: any) => e.patientName === "Mariam Al Suwaidi");
    assert.ok(mariamEnc);
    assert.equal(mariamEnc.mrn, "GB-MRN-0001");
    assert.equal(mariamEnc.feeAed, 500); // from Doctor A consultationFee

    // Verify summary endpoint parity
    const resSummary = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports/summary?startDate=2026-10-01&endDate=2026-10-25",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });
    assert.equal(resSummary.statusCode, 200);
    const bodySummary = JSON.parse(resSummary.body);
    assert.equal(bodySummary.summary.totalVisits, 4);
    assert.equal(bodySummary.summary.totalPatients, 3);
  });

  await t.test("5. Doctor-to-Doctor Data Isolation: Doctor B sees zero of Doctor A's records", async () => {
    // When Doctor B requests reports for the same date range:
    const resDocB = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-01&endDate=2026-10-25",
      headers: { authorization: `Bearer ${tokenDocB}` },
    });

    assert.equal(resDocB.statusCode, 200);
    const bodyB = JSON.parse(resDocB.body);

    assert.equal(bodyB.doctorId, "DOC-9002");
    assert.equal(bodyB.summary.totalVisits, 0);
    assert.equal(bodyB.summary.totalPatients, 0);
    assert.equal(bodyB.encounters.total, 0);
    assert.equal(bodyB.encounters.items.length, 0);
  });

  await t.test("6. Search & Status Filtering and Pagination", async () => {
    // Search "Tariq"
    const resSearch = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-01&endDate=2026-10-25&search=Tariq",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });
    assert.equal(resSearch.statusCode, 200);
    const bodySearch = JSON.parse(resSearch.body);
    assert.equal(bodySearch.encounters.total, 1);
    assert.equal(bodySearch.encounters.items[0].patientName, "Tariq Mahmood");

    // Pagination: limit=2
    const resPage1 = await app.inject({
      method: "GET",
      url: "/api/v1/portal/doctor/reports?startDate=2026-10-01&endDate=2026-10-25&limit=2&page=1",
      headers: { authorization: `Bearer ${tokenDocA}` },
    });
    const bodyPage1 = JSON.parse(resPage1.body);
    assert.equal(bodyPage1.encounters.items.length, 2);
    assert.equal(bodyPage1.encounters.total, 4);
    assert.equal(bodyPage1.encounters.totalPages, 2);
  });

  // Teardown overrides
  mongoAdapter.isConnected = origIsConnected;
  (mongoAdapter as any).getDoctorCollection = origGetDoctorCol;
  (mongoAdapter as any).getQueueTicketCollection = origGetQueueCol;
  (mongoAdapter as any).getAppointmentCollection = origGetAptCol;
  (mongoAdapter as any).getPatientCollection = origGetPatientCol;
});
