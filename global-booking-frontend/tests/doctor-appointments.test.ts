import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import {
  syncDoctorAppointmentsFromServer,
  getDoctorAppointments,
  getNextDailySerialNumber,
  saveDoctorAppointment,
  updateAppointmentStatus,
  deleteDoctorAppointment,
  mapBackendToDoctorAppointment,
  getDoctorStorageKey,
  type DoctorAppointment,
} from "../lib/services/doctor-appointments-service";
import type { BackendAppointmentItem, BackendAppointmentResponse } from "../lib/api/doctor-appointments-client";

// In-memory mock localStorage for Node.js test environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hostname: "localhost", protocol: "http:" },
};

beforeEach(() => {
  mockStorage.clear();
});

test("API Loading: Transforms backend AppointmentRecord to DoctorAppointment contract with full fidelity", async () => {
  const backendItem: BackendAppointmentItem = {
    id: "APT-20261025-DOC1-ABC",
    referenceNumber: "GB-20261025-CHAMBER1-01",
    voucherId: "ID-25102026",
    bookingNumber: 1,
    bookingNumberDisplay: "#01",
    doctorId: "DOC-9001",
    doctorAccountId: "ACC-DOC-9001",
    doctorName: "Dr. Rashid Al Mamun",
    doctorSpecialty: "Cardiology",
    chamberId: "CHAMBER-1",
    chamberName: "Dubai Healthcare City Chamber 101",
    patientName: "Patient One",
    patientPhone: "+971501112233",
    patientEmail: "patient1@example.com",
    appointmentDate: "2026-10-25",
    appointmentTime: "Daily 05:00 PM – 09:00 PM",
    service: "Cardiology Consultation",
    status: "CONFIRMED",
    channel: "ONLINE_WEB",
    createdAt: "2026-10-25T10:00:00.000Z",
    updatedAt: "2026-10-25T10:00:00.000Z",
  };

  const mapped = mapBackendToDoctorAppointment(backendItem);

  assert.equal(mapped.id, "APT-20261025-DOC1-ABC");
  assert.equal(mapped.referenceNumber, "GB-20261025-CHAMBER1-01");
  assert.equal(mapped.serialNumber, "#01");
  assert.equal(mapped.patientName, "Patient One");
  assert.equal(mapped.patientPhone, "+971501112233");
  assert.equal(mapped.patientEmail, "patient1@example.com");
  assert.equal(mapped.doctorName, "Dr. Rashid Al Mamun");
  assert.equal(mapped.status, "Confirmed");
  assert.equal(mapped.channel, "Online Web");
  assert.equal(mapped.isOnlineBooking, true);
  assert.equal(mapped.date, "2026-10-25");
  assert.equal(mapped.chamberLocation, "Dubai Healthcare City Chamber 101");
});

test("API Loading: Authoritative backend records populate Doctor Portal and update local cache", async () => {
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-rashid-al-mamun",
      doctorId: "DOC-9001",
      fullName: "Dr. Rashid Al Mamun",
    })
  );

  const mockResponse: BackendAppointmentResponse = {
    statusCode: 200,
    count: 2,
    doctorId: "DOC-9001",
    items: [
      {
        id: "APT-1",
        referenceNumber: "REF-001",
        bookingNumber: 1,
        bookingNumberDisplay: "#01",
        doctorId: "DOC-9001",
        doctorName: "Dr. Rashid Al Mamun",
        doctorSpecialty: "Cardiology",
        chamberId: "CH-1",
        chamberName: "Main Chamber",
        patientName: "Alice Smith",
        patientPhone: "+971501234567",
        appointmentDate: "2026-10-25",
        appointmentTime: "10:00 AM",
        service: "Cardiology Consultation",
        status: "CONFIRMED",
        channel: "ONLINE_WEB",
        createdAt: "2026-10-25T08:00:00.000Z",
      },
      {
        id: "APT-2",
        referenceNumber: "REF-002",
        bookingNumber: 2,
        bookingNumberDisplay: "#02",
        doctorId: "DOC-9001",
        doctorName: "Dr. Rashid Al Mamun",
        doctorSpecialty: "Cardiology",
        chamberId: "CH-1",
        chamberName: "Main Chamber",
        patientName: "Bob Jones",
        patientPhone: "+971509876543",
        appointmentDate: "2026-10-25",
        appointmentTime: "10:30 AM",
        service: "Cardiology Consultation",
        status: "IN_CONSULTATION",
        channel: "IN_PERSON",
        createdAt: "2026-10-25T08:30:00.000Z",
      },
    ],
  };

  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const syncResult = await syncDoctorAppointmentsFromServer({
    fetchImplementation: mockFetch,
    token: "valid-test-token",
  });

  assert.equal(syncResult.isServerFresh, true);
  assert.equal(syncResult.count, 2);
  assert.equal(syncResult.appointments.length, 2);
  assert.equal(syncResult.appointments[0].patientName, "Alice Smith");
  assert.equal(syncResult.appointments[0].status, "Confirmed");
  assert.equal(syncResult.appointments[1].patientName, "Bob Jones");
  assert.equal(syncResult.appointments[1].status, "In Consultation");

  // Verify non-authoritative local cache was updated with server data
  const cached = getDoctorAppointments();
  assert.equal(cached.length, 2);
  assert.equal(cached[0].id, "APT-1");
});

test("Stale-Cache: Authoritative server data overwrites outdated localStorage entries", async () => {
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-rashid-al-mamun",
      doctorId: "DOC-9001",
      fullName: "Dr. Rashid Al Mamun",
    })
  );

  // Pre-seed local cache with stale appointment status ("Pending")
  const storageKey = getDoctorStorageKey();
  const staleLocalApt: DoctorAppointment = {
    id: "APT-1",
    referenceNumber: "REF-001",
    serialNumber: "#01",
    patientName: "Alice Smith",
    patientPhone: "+971501234567",
    patientAgeGender: "Adult Patient",
    bloodGroup: "Pending",
    service: "Cardiology Consultation",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Rashid Al Mamun",
    doctorSpecialty: "Cardiology",
    chamberLocation: "Main Chamber",
    date: "2026-10-25",
    time: "10:00 AM",
    duration: "30 min",
    status: "Pending", // Stale status in local cache
    channel: "Online Web",
    paymentStatus: "Paid",
    price: "500",
    createdAt: "2026-10-25T08:00:00.000Z",
  };
  mockStorage.setItem(storageKey, JSON.stringify([staleLocalApt]));

  // Server returns updated status ("Completed") from MongoDB
  const mockResponse: BackendAppointmentResponse = {
    statusCode: 200,
    count: 1,
    doctorId: "DOC-9001",
    items: [
      {
        id: "APT-1",
        referenceNumber: "REF-001",
        bookingNumber: 1,
        bookingNumberDisplay: "#01",
        doctorId: "DOC-9001",
        doctorName: "Dr. Rashid Al Mamun",
        doctorSpecialty: "Cardiology",
        chamberId: "CH-1",
        chamberName: "Main Chamber",
        patientName: "Alice Smith",
        patientPhone: "+971501234567",
        appointmentDate: "2026-10-25",
        appointmentTime: "10:00 AM",
        service: "Cardiology Consultation",
        status: "COMPLETED", // Server has updated status
        channel: "ONLINE_WEB",
        createdAt: "2026-10-25T08:00:00.000Z",
      },
    ],
  };

  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const syncResult = await syncDoctorAppointmentsFromServer({
    fetchImplementation: mockFetch,
  });

  assert.equal(syncResult.isServerFresh, true);
  assert.equal(syncResult.appointments[0].status, "Completed", "Server status must overwrite stale local status");

  const cached = getDoctorAppointments();
  assert.equal(cached[0].status, "Completed", "Local cache must be updated with authoritative server status");
});

test("Server Error / Graceful Fallback: Network failure or 503 falls back to cached data without crashing", async () => {
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-rashid-al-mamun",
      doctorId: "DOC-9001",
      fullName: "Dr. Rashid Al Mamun",
    })
  );

  // Pre-seed local cache with existing appointment
  const storageKey = getDoctorStorageKey();
  const cachedApt: DoctorAppointment = {
    id: "APT-CACHED-1",
    referenceNumber: "REF-CACHED-1",
    serialNumber: "#01",
    patientName: "Cached Patient",
    patientPhone: "+971501234567",
    patientAgeGender: "Adult Patient",
    bloodGroup: "Pending",
    service: "Cardiology Consultation",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Rashid Al Mamun",
    doctorSpecialty: "Cardiology",
    chamberLocation: "Main Chamber",
    date: "2026-10-25",
    time: "10:00 AM",
    duration: "30 min",
    status: "Confirmed",
    channel: "Online Web",
    paymentStatus: "Paid",
    price: "500",
    createdAt: "2026-10-25T08:00:00.000Z",
  };
  mockStorage.setItem(storageKey, JSON.stringify([cachedApt]));

  // Mock server 503 error (e.g. database temporarily unreachable)
  const failingFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ statusCode: 503, error: "Database Unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });

  const result = await syncDoctorAppointmentsFromServer({
    fetchImplementation: failingFetch,
  });

  assert.equal(result.isServerFresh, false, "Must indicate server data is not fresh");
  assert.ok(result.error, "Must report server failure message");
  assert.equal(result.appointments.length, 1, "Must fall back to cached appointments");
  assert.equal(result.appointments[0].patientName, "Cached Patient");
});

test("Doctor Data Isolation: Doctor A and Doctor B maintain strictly isolated appointment storage", async () => {
  // Doctor A context
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-rashid-al-mamun",
      doctorId: "DOC-9001",
      fullName: "Dr. Rashid Al Mamun",
    })
  );

  const docAKey = getDoctorStorageKey();
  assert.equal(docAKey, "global_booking_doctor_appointments_dr-rashid-al-mamun");

  saveDoctorAppointment({
    id: "DOC-A-APT-1",
    referenceNumber: "REF-A-1",
    serialNumber: "#01",
    patientName: "Doctor A Patient",
    patientPhone: "+971501111111",
    patientAgeGender: "Adult Patient",
    bloodGroup: "Pending",
    service: "Cardiology",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Rashid Al Mamun",
    doctorSpecialty: "Cardiology",
    chamberLocation: "Chamber A",
    date: "2026-10-25",
    time: "10:00 AM",
    duration: "30 min",
    status: "Confirmed",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "500",
    createdAt: new Date().toISOString(),
  });

  // Switch context to Doctor B
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-sarah-khan",
      doctorId: "DOC-9002",
      fullName: "Dr. Sarah Khan",
    })
  );

  const docBKey = getDoctorStorageKey();
  assert.equal(docBKey, "global_booking_doctor_appointments_dr-sarah-khan");
  assert.notEqual(docAKey, docBKey, "Doctor A and Doctor B must use separate storage keys");

  // Doctor B reads appointments: must NOT see Doctor A's appointment
  const docBApts = getDoctorAppointments();
  assert.equal(docBApts.length, 0, "Doctor B must not see Doctor A appointments");
  assert.ok(!docBApts.some((a) => a.patientName === "Doctor A Patient"));
});

test("Zero-Mock Integrity: Empty database returns zero appointments, never injecting fake data", async () => {
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-new-physician",
      doctorId: "DOC-9999",
      fullName: "Dr. New Physician",
    })
  );

  const emptyServerResponse: BackendAppointmentResponse = {
    statusCode: 200,
    count: 0,
    doctorId: "DOC-9999",
    items: [],
  };

  const emptyFetch: typeof fetch = async () =>
    new Response(JSON.stringify(emptyServerResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const syncResult = await syncDoctorAppointmentsFromServer({
    fetchImplementation: emptyFetch,
  });

  assert.equal(syncResult.isServerFresh, true);
  assert.equal(syncResult.count, 0);
  assert.equal(syncResult.appointments.length, 0, "Must return empty array with 0 mock injections");

  const cached = getDoctorAppointments();
  assert.equal(cached.length, 0, "Cached array must also be empty");
});

test("Daily Serial Number Calculation: Resets to #01 on empty roster and increments correctly", () => {
  mockStorage.setItem(
    "gb_portal_user",
    JSON.stringify({
      slug: "dr-rashid-al-mamun",
      doctorId: "DOC-9001",
    })
  );

  assert.equal(getNextDailySerialNumber(), "#01", "Initial serial must start at #01");

  saveDoctorAppointment({
    id: "APT-1",
    referenceNumber: "REF-1",
    serialNumber: "#01",
    patientName: "Patient 1",
    patientPhone: "+971501111111",
    patientAgeGender: "Adult",
    bloodGroup: "O+",
    service: "Consultation",
    serviceCategory: "General",
    doctorName: "Dr. Rashid",
    doctorSpecialty: "Cardiology",
    chamberLocation: "Chamber",
    date: "2026-10-25",
    time: "10:00 AM",
    duration: "30 min",
    status: "Confirmed",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "500",
    createdAt: new Date().toISOString(),
  });

  assert.equal(getNextDailySerialNumber(), "#02", "Next serial after #01 must be #02");
});
