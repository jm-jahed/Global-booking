/**
 * GLOBAL BOOKING — Doctor Appointments & Online Real-time Sync Service
 * Authenticated MongoDB-backed appointments service for Doctor Portal.
 * Server API (/api/v1/portal/doctor/appointments) is the authoritative source of truth.
 * Browser localStorage is retained solely as a non-authoritative offline/display cache.
 */

import {
  fetchDoctorPortalAppointments,
  type BackendAppointmentItem,
  type FetchDoctorAppointmentsParams,
} from "../api/doctor-appointments-client";

export type DoctorAppointmentStatus =
  | "Confirmed"
  | "Pending"
  | "In Consultation"
  | "Completed"
  | "Cancelled";

export type DoctorAppointmentChannel =
  | "Online Web"
  | "In-Person Chamber"
  | "Phone Booking";

export interface DoctorAppointment {
  id: string;
  referenceNumber: string;
  serialNumber: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAgeGender: string;
  bloodGroup: string;
  service: string;
  serviceCategory: string;
  doctorName: string;
  doctorSpecialty: string;
  chamberLocation: string;
  date: string;
  time: string;
  duration: string;
  status: DoctorAppointmentStatus;
  channel: DoctorAppointmentChannel;
  paymentStatus: "Paid" | "Pending" | "Insurance";
  price: string;
  notes?: string;
  createdAt: string;
  isOnlineBooking?: boolean;
}

export interface ActiveDoctorContext {
  slug: string;
  name: string;
  specialty: string;
  chamber: string;
  doctorId?: string;
}

export function getActiveDoctorContext(): ActiveDoctorContext {
  if (typeof window === "undefined") {
    return {
      slug: "",
      name: "",
      specialty: "Specialist Physician",
      chamber: "Consultation Chamber",
    };
  }

  try {
    const raw = localStorage.getItem("gb_portal_user");
    if (raw) {
      const u = JSON.parse(raw);
      const name = u.fullName || u.name || "";
      const slug =
        u.slug ||
        (name
          ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
          : "");
      const specialty = u.specialty || u.designation || "Specialist Physician";
      const chamber =
        u.chamberLocationsSummary ||
        (Array.isArray(u.chambers) && u.chambers[0]?.facilityName) ||
        "Main Consultation Chamber";
      const doctorId = u.doctorId || u.id || undefined;
      return { slug, name, specialty, chamber, doctorId };
    }
  } catch {}

  return {
    slug: "",
    name: "",
    specialty: "Specialist Physician",
    chamber: "Consultation Chamber",
  };
}

export function getDoctorStorageKey(): string {
  const ctx = getActiveDoctorContext();
  const keyIdentifier = (ctx.slug || ctx.doctorId || "").trim().toLowerCase();
  if (!keyIdentifier) {
    return "global_booking_doctor_appointments_anonymous";
  }
  if (keyIdentifier === "dr-jahedul-islam") {
    return "global_booking_doctor_appointments";
  }
  return `global_booking_doctor_appointments_${keyIdentifier}`;
}

export function getPublicBookingsStorageKey(): string {
  const ctx = getActiveDoctorContext();
  const keyIdentifier = (ctx.slug || ctx.doctorId || "").trim().toLowerCase();
  if (!keyIdentifier) {
    return "global_booking_appointments_anonymous";
  }
  return `global_booking_appointments_${keyIdentifier}`;
}

/**
 * Maps a MongoDB backend AppointmentRecord to the DoctorAppointment UI contract.
 */
export function mapBackendToDoctorAppointment(item: BackendAppointmentItem): DoctorAppointment {
  let mappedStatus: DoctorAppointmentStatus = "Confirmed";
  const rawStatus = (item.status || "").toUpperCase();
  if (rawStatus === "IN_CONSULTATION" || item.status === "In Consultation") {
    mappedStatus = "In Consultation";
  } else if (rawStatus === "COMPLETED" || item.status === "Completed") {
    mappedStatus = "Completed";
  } else if (rawStatus === "CANCELLED" || item.status === "Cancelled") {
    mappedStatus = "Cancelled";
  } else if (rawStatus === "PENDING" || item.status === "Pending") {
    mappedStatus = "Pending";
  } else {
    mappedStatus = "Confirmed";
  }

  let mappedChannel: DoctorAppointmentChannel = "Online Web";
  const rawChannel = (item.channel || "").toUpperCase();
  if (rawChannel === "IN_PERSON" || item.channel === "In-Person Chamber") {
    mappedChannel = "In-Person Chamber";
  } else if (rawChannel === "PHONE" || item.channel === "Phone Booking") {
    mappedChannel = "Phone Booking";
  } else {
    mappedChannel = "Online Web";
  }

  const serial =
    item.bookingNumberDisplay ||
    (typeof item.bookingNumber === "number" && item.bookingNumber > 0
      ? `#${String(item.bookingNumber).padStart(2, "0")}`
      : "#01");

  return {
    id: item.id,
    referenceNumber: item.referenceNumber || item.id,
    serialNumber: serial,
    patientName: item.patientName || "Patient",
    patientPhone: item.patientPhone || "",
    patientEmail: item.patientEmail || undefined,
    patientAgeGender: "Adult Patient",
    bloodGroup: "Pending",
    service: item.service || `${item.doctorSpecialty || "Specialist"} Consultation`,
    serviceCategory: item.doctorSpecialty || "Consultation",
    doctorName: item.doctorName || "",
    doctorSpecialty: item.doctorSpecialty || "Specialist Physician",
    chamberLocation: item.chamberName || "Main Consultation Chamber",
    date: item.appointmentDate || new Date().toISOString().split("T")[0],
    time: item.appointmentTime || "10:00 AM",
    duration: "30 min",
    status: mappedStatus,
    channel: mappedChannel,
    paymentStatus: "Paid",
    price: "500 AED",
    notes: item.notes || undefined,
    createdAt: item.createdAt || new Date().toISOString(),
    isOnlineBooking: mappedChannel === "Online Web",
  };
}

/**
 * Retrieve cached doctor appointments from non-authoritative localStorage.
 * Guaranteed zero-mock: returns empty array if no real data is cached.
 */
export function getDoctorAppointments(): DoctorAppointment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const docStorageKey = getDoctorStorageKey();
    const stored = localStorage.getItem(docStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return [];
  } catch (err) {
    console.error("Failed to read cached doctor appointments:", err);
    return [];
  }
}

export interface SyncDoctorAppointmentsResult {
  appointments: DoctorAppointment[];
  isServerFresh: boolean;
  count: number;
  error?: string;
}

/**
 * Synchronizes appointments with the authoritative backend MongoDB API.
 * Rules:
 * 1. Server MongoDB data is the authoritative source of truth.
 * 2. Newer/fresh server data always overwrites stale localStorage entries.
 * 3. Offline/server failure degrades gracefully by returning non-authoritative cache.
 * 4. Local desk drafts (unsaved in-person appointments) are preserved without overwriting server items.
 */
export async function syncDoctorAppointmentsFromServer(
  params?: FetchDoctorAppointmentsParams
): Promise<SyncDoctorAppointmentsResult> {
  const res = await fetchDoctorPortalAppointments(params);

  if (res && res.statusCode === 200 && Array.isArray(res.items)) {
    // 1. Map authoritative MongoDB records
    const serverApts = res.items.map(mapBackendToDoctorAppointment);

    // 2. Read local cache to preserve local unsaved desk drafts
    const cached = getDoctorAppointments();
    const serverIds = new Set(serverApts.map((a) => a.id));
    const serverRefs = new Set(serverApts.map((a) => a.referenceNumber).filter(Boolean));

    // Retain local desk drafts that do not exist on the server
    const localDrafts = cached.filter(
      (local) =>
        !serverIds.has(local.id) &&
        !serverRefs.has(local.referenceNumber) &&
        local.channel !== "Online Web"
    );

    // Server appointments take absolute priority
    const combined = [...serverApts, ...localDrafts];

    // Deduplicate by id
    const seen = new Set<string>();
    const deduplicated: DoctorAppointment[] = [];
    for (const apt of combined) {
      if (!seen.has(apt.id)) {
        seen.add(apt.id);
        deduplicated.push(apt);
      }
    }

    // Persist authoritative records into doctor's isolated localStorage
    if (typeof window !== "undefined") {
      try {
        const docStorageKey = getDoctorStorageKey();
        localStorage.setItem(docStorageKey, JSON.stringify(deduplicated));
      } catch (err) {
        console.warn("Failed to update local cache with server appointments:", err);
      }
    }

    return {
      appointments: deduplicated,
      isServerFresh: true,
      count: deduplicated.length,
    };
  }

  // Server error or network unreachable -> fallback to cached data in localStorage
  const cached = getDoctorAppointments();
  return {
    appointments: cached,
    isServerFresh: false,
    count: cached.length,
    error: res?.message || res?.error || "Unable to reach server. Displaying cached records.",
  };
}

/**
 * Calculate the next daily sequential serial number starting from 1 (#01, #02, #03...)
 */
export function getNextDailySerialNumber(): string {
  if (typeof window === "undefined") return "#01";

  try {
    const current = getDoctorAppointments();
    const serials = current
      .map((a) => parseInt(a.serialNumber.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 500);
    const max = serials.length > 0 ? Math.max(...serials) : 0;
    return `#${(max + 1).toString().padStart(2, "0")}`;
  } catch {
    return "#01";
  }
}

/**
 * Save / Update an appointment locally
 */
export function saveDoctorAppointment(appointment: DoctorAppointment): DoctorAppointment[] {
  if (typeof window === "undefined") return [appointment];

  const current = getDoctorAppointments();
  const index = current.findIndex((a) => a.id === appointment.id);
  let updated: DoctorAppointment[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = appointment;
  } else {
    updated = [appointment, ...current];
  }

  localStorage.setItem(getDoctorStorageKey(), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("global-booking-updated"));
  return updated;
}

/**
 * Update appointment status (e.g. Confirmed, In Consultation, Completed, Cancelled)
 */
export function updateAppointmentStatus(
  id: string,
  newStatus: DoctorAppointmentStatus
): DoctorAppointment[] {
  if (typeof window === "undefined") return [];

  const current = getDoctorAppointments();
  const updated = current.map((apt) =>
    apt.id === id ? { ...apt, status: newStatus } : apt
  );

  localStorage.setItem(getDoctorStorageKey(), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("global-booking-updated"));
  return updated;
}

/**
 * Delete an appointment locally
 */
export function deleteDoctorAppointment(id: string): DoctorAppointment[] {
  if (typeof window === "undefined") return [];

  const current = getDoctorAppointments();
  const updated = current.filter((a) => a.id !== id);

  localStorage.setItem(getDoctorStorageKey(), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("global-booking-updated"));
  return updated;
}

/**
 * Broadcast sync when a new appointment is confirmed from anywhere
 */
export function broadcastNewBooking(booking: any) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("global-booking-updated", { detail: booking }));
  }
}
