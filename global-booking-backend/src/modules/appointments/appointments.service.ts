import crypto from "node:crypto";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import type { DoctorRecord, DoctorChamberDetail } from "../admin/admin.types.js";
import type {
  AppointmentRecord,
  CreateGuestAppointmentInput,
  PublicAppointmentSummary,
} from "./appointments.types.js";

export class AppointmentServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppointmentServiceError";
  }
}

/**
 * Normalizes phone numbers for consistent storage and verification.
 * Strips whitespace, dashes, brackets, dots; standardizes international prefix.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim().replace(/[\s\-\(\)\.]+/g, "");
  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }
  if (!clean.startsWith("+") && /^\d+$/.test(clean)) {
    clean = `+${clean}`;
  }
  return clean;
}

/**
 * Masks patient name for secure public responses.
 * Preserves initial letter and masked indicator, protecting privacy.
 */
export function maskPatientName(name: string): string {
  const trimmed = (name || "").trim();
  if (trimmed.length <= 2) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && parts[1]) {
    return `${parts[0]} ${parts[1].charAt(0)}.***`;
  }
  return `${trimmed.charAt(0)}***${trimmed.slice(-1)}`;
}

/**
 * Masks patient phone for confirmation slips.
 */
export function maskPatientPhone(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  if (norm.length <= 5) return "***";
  const start = norm.slice(0, 5);
  const end = norm.slice(-3);
  return `${start} *** ${end}`;
}

/**
 * Formats user-facing daily doctor booking sequence.
 * Enforces zero-padded minimum 2 digits: #01 through #99, then #100, #101...
 */
export function formatBookingNumberDisplay(bookingNumber: number): string {
  const safeNumber = Math.max(1, Math.floor(bookingNumber || 1));
  return safeNumber < 100
    ? `#${String(safeNumber).padStart(2, "0")}`
    : `#${safeNumber}`;
}

/**
 * Formats Appointment Booking Voucher ID as ID-DDMMYYYY from local booking date.
 * Example: 2026-10-23 -> ID-23102026
 */
export function formatVoucherId(appointmentDate: string): string {
  const parts = (appointmentDate || "").trim().split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const [year, month, day] = parts;
    return `ID-${day.padStart(2, "0")}${month.padStart(2, "0")}${year}`;
  }
  const clean = (appointmentDate || "").replace(/\D/g, "");
  if (clean.length >= 8) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `ID-${d}${m}${y}`;
  }
  return `ID-${clean}`;
}

/**
 * Formats date key to DDMMYYYY format.
 * Example: "2026-10-23" -> "23102026"
 */
export function formatDateDDMMYYYY(appointmentDate: string): string {
  const parts = (appointmentDate || "").trim().split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}${month.padStart(2, "0")}${year}`;
  }
  const clean = (appointmentDate || "").replace(/\D/g, "");
  if (clean.length >= 8) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `${d}${m}${y}`;
  }
  return clean;
}

/**
 * Formats display date as DD-MM-YYYY.
 * Example: "2026-10-23" -> "23-10-2026"
 */
export function formatDateDisplayDDMMYYYY(appointmentDate: string): string {
  const parts = (appointmentDate || "").trim().split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }
  return appointmentDate;
}

/**
 * Resolves local date (YYYY-MM-DD) in doctor's/chamber's configured IANA timezone.
 * Avoids assuming server or UTC timezone.
 */
export function getDoctorLocalDate(
  date: Date = new Date(),
  timezone = "Asia/Dubai",
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split("T")[0] ?? "1970-01-01";
  }
}

/**
 * Generates structured, collision-resistant booking reference.
 * Format: GB-YYYYMMDD-[CHAMBER]-[SERIAL]
 */
export function generateBookingReference(
  dateKey: string,
  chamberId = "CH1",
  bookingNumber?: number,
): string {
  const cleanDate = dateKey.replace(/\D/g, "").slice(0, 8);
  const cleanChamber = chamberId
    .toUpperCase()
    .replace(/^CHAMBER-?/i, "CH")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 6) || "CH1";
  const serialPart = typeof bookingNumber === "number" && bookingNumber >= 1
    ? String(bookingNumber).padStart(2, "0")
    : crypto.randomBytes(2).toString("hex").toUpperCase();
  return `GB-${cleanDate}-${cleanChamber}-${serialPart}`;
}

/**
 * Atomically increments and allocates sequential booking number starting from 1 every day per doctor.
 * Guarantees:
 * 1. Each doctor has an independent sequence resetting to 1 on each new calendar date.
 * 2. Uniqueness is enforced per { doctorId, appointmentDate }.
 * 3. Atomic via MongoDB findOneAndUpdate with $inc.
 */
export async function allocateAppointmentSerial(
  doctorId: string,
  appointmentDate: string,
  _chamberId?: string,
): Promise<number> {
  if (!mongoAdapter.isConnected()) {
    throw new AppointmentServiceError(
      "DATABASE_UNAVAILABLE",
      "Database persistence is currently unavailable.",
      503,
    );
  }

  const counterCol = mongoAdapter.getAppointmentCounterCollection();
  const counterId = `${doctorId}:${appointmentDate}`;
  const nowIso = new Date().toISOString();

  // Seed counter with existing count if not already initialized
  const existing = await counterCol.findOne({ doctorId, appointmentDate }).catch(() => null);
  if (!existing && typeof counterCol.updateOne === "function") {
    const aptCol = mongoAdapter.getAppointmentCollection();
    const highestApt = await aptCol
      .find({ doctorId, appointmentDate })
      .sort({ bookingNumber: -1 })
      .limit(1)
      .toArray()
      .catch(() => []);

    const initialSerial = highestApt?.[0]?.bookingNumber || 0;

    await counterCol.updateOne(
      { doctorId, appointmentDate },
      {
        $setOnInsert: {
          id: counterId,
          doctorId,
          appointmentDate,
          lastSerial: initialSerial,
          updatedAt: nowIso,
        },
      },
      { upsert: true },
    ).catch(() => null);
  }

  const result = await counterCol.findOneAndUpdate(
    { doctorId, appointmentDate },
    {
      $inc: { lastSerial: 1 },
      $set: { updatedAt: nowIso },
      $setOnInsert: { id: counterId, doctorId, appointmentDate },
    },
    { upsert: true, returnDocument: "after" },
  );

  const allocated = (result as any)?.lastSerial;
  if (typeof allocated === "number" && allocated >= 1) {
    return allocated;
  }

  // Fallback counter
  const aptCol = mongoAdapter.getAppointmentCollection();
  const existingCount = await aptCol.countDocuments({ doctorId, appointmentDate }).catch(() => 0);
  return existingCount + 1;
}

// In-memory sliding-window abuse protection for recovery endpoint (Max 5 failed attempts per 15 min)
interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}
const recoveryAttempts = new Map<string, AttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function checkRecoveryRateLimit(key: string): void {
  const now = Date.now();
  const record = recoveryAttempts.get(key);
  if (!record) return;

  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    recoveryAttempts.delete(key);
    return;
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    throw new AppointmentServiceError(
      "RATE_LIMITED",
      "Too many failed verification attempts. Please wait 15 minutes before trying again.",
      429,
    );
  }
}

function recordFailedRecoveryAttempt(key: string): void {
  const now = Date.now();
  const record = recoveryAttempts.get(key);
  if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    recoveryAttempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    record.count += 1;
  }
}

function clearRecoveryAttempts(key: string): void {
  recoveryAttempts.delete(key);
}

/**
 * Creates a persistent guest appointment in MongoDB.
 * Never creates a queue ticket.
 */
export async function createGuestAppointment(
  doctor: DoctorRecord,
  chamber: DoctorChamberDetail,
  input: CreateGuestAppointmentInput,
): Promise<{ appointment: AppointmentRecord; isReplay: boolean }> {
  if (!mongoAdapter.isConnected()) {
    throw new AppointmentServiceError(
      "DATABASE_UNAVAILABLE",
      "Database persistence is currently unavailable.",
      503,
    );
  }

  const patientName = (input.patientName || "").trim();
  if (!patientName || patientName.length < 2) {
    throw new AppointmentServiceError(
      "VALIDATION_ERROR",
      "Patient name is required and must be at least 2 characters.",
      400,
    );
  }

  const normalizedPhone = normalizePhoneNumber(input.patientPhone);
  if (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 5) {
    throw new AppointmentServiceError(
      "VALIDATION_ERROR",
      "A valid contact phone number is required (at least 5 digits).",
      400,
    );
  }

  const doctorTimezone = chamber.timezone || doctor.chambers?.[0]?.timezone || "Asia/Dubai";
  const appointmentDate = (input.appointmentDate || "").trim() || getDoctorLocalDate(new Date(), doctorTimezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    throw new AppointmentServiceError(
      "VALIDATION_ERROR",
      "Invalid appointment date format. Expected YYYY-MM-DD.",
      400,
    );
  }

  const aptCol = mongoAdapter.getAppointmentCollection();
  const idempotencyKey = input.idempotencyKey ? input.idempotencyKey.trim() : undefined;

  // 1. Idempotency replay check
  if (idempotencyKey) {
    const existing = await aptCol.findOne({
      doctorId: doctor.doctorId,
      idempotencyKey,
    });

    if (existing) {
      // Validate payload consistency
      const sameChamber = existing.chamberId === chamber.id;
      const samePhone = existing.patientPhone === normalizedPhone;
      const sameDate = existing.appointmentDate === appointmentDate;

      if (sameChamber && samePhone && sameDate) {
        return { appointment: existing, isReplay: true };
      }

      throw new AppointmentServiceError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotency conflict: Key was already submitted with different booking parameters.",
        409,
      );
    }
  }

  // 2. Allocate daily doctor-wise serial with concurrency retry protection
  let bookingNumber = 0;
  let bookingNumberDisplay = "";
  let appointmentRecord!: AppointmentRecord;
  const maxInsertRetries = 3;

  for (let attempt = 0; attempt < maxInsertRetries; attempt++) {
    bookingNumber = await allocateAppointmentSerial(
      doctor.doctorId,
      appointmentDate,
      chamber.id,
    );
    bookingNumberDisplay = formatBookingNumberDisplay(bookingNumber);

    // 3. Build persistent record
    const nowIso = new Date().toISOString();
    const dateCompact = appointmentDate.replace(/\D/g, "");
    const doctorClean = doctor.doctorId.replace(/[^A-Za-z0-9]/g, "");
    const randInternal = crypto.randomBytes(3).toString("hex").toUpperCase();
    const internalId = `APT-${dateCompact}-${doctorClean}-${randInternal}`;
    const referenceNumber = generateBookingReference(appointmentDate, chamber.id, bookingNumber);
    const voucherId = formatVoucherId(appointmentDate);

    appointmentRecord = {
      id: internalId,
      referenceNumber,
      voucherId,
      bookingNumber,
      bookingNumberDisplay,
      doctorId: doctor.doctorId,
      doctorAccountId: doctor.id,
      doctorName: doctor.fullName,
      doctorSpecialty: doctor.specialty || "Specialist Physician",
      chamberId: chamber.id,
      chamberName: chamber.facilityName,
      chamberTimezone: doctorTimezone,
      patientName,
      patientPhone: normalizedPhone,
      patientEmail: input.patientEmail ? input.patientEmail.trim().toLowerCase() : undefined,
      appointmentDate,
      appointmentTime: input.appointmentTime?.trim() || chamber.visitingSchedule || "Daily 05:00 PM – 09:00 PM",
      service: input.service?.trim() || `${doctor.specialty || "Specialist"} Consultation`,
      status: "CONFIRMED",
      channel: "ONLINE_WEB",
      idempotencyKey,
      notes: input.notes ? input.notes.trim() : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 4. Insert into MongoDB appointments collection
    try {
      await aptCol.insertOne(appointmentRecord);

      // 5. Automatically enqueue into doctor's live queue for instant attendance
      try {
        const ticketCol = mongoAdapter.getQueueTicketCollection();
        const queueTicketRecord: any = {
          id: `TKT-${dateCompact}-${doctorClean}-${randInternal}`,
          doctorId: doctor.doctorId,
          doctorAccountId: doctor.id,
          chamberId: chamber.id,
          chamberName: chamber.facilityName,
          chamberTimezone: doctorTimezone,
          dateKey: appointmentDate,
          serialIndex: bookingNumber,
          ticketNumber: bookingNumberDisplay,
          patientName,
          patientPhone: normalizedPhone,
          patientOprId: voucherId,
          service: appointmentRecord.service,
          priority: "STANDARD",
          channel: "ONLINE_WEB",
          appointmentId: internalId,
          status: "WAITING",
          checkInTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: nowIso,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}-TKT` : undefined,
          createdById: "PATIENT_ONLINE",
          notes: `Online Booking Date: ${formatDateDisplayDDMMYYYY(appointmentDate)} | Serial: ${bookingNumberDisplay}`,
        };
        await ticketCol.insertOne(queueTicketRecord);
      } catch {
        // Non-fatal if ticket already exists
      }

      break; // Successfully inserted
    } catch (err: any) {
      if (err?.code === 11000) {
        if (idempotencyKey) {
          const raceExisting = await aptCol.findOne({
            doctorId: doctor.doctorId,
            idempotencyKey,
          });
          if (raceExisting) {
            return { appointment: raceExisting, isReplay: true };
          }
        }
        // Unique serial collision: retry allocating next serial
        if (attempt < maxInsertRetries - 1) {
          continue;
        }
      }
      throw err;
    }
  }

  return { appointment: appointmentRecord, isReplay: false };
}

/**
 * Recovers a guest patient appointment securely by reference number + complete phone number.
 * Generic failure response prevents user enumeration or reference guessing.
 */
export async function recoverGuestAppointment(
  referenceNumber: string,
  rawPhone: string,
  clientIp = "default-client",
): Promise<PublicAppointmentSummary> {
  if (!mongoAdapter.isConnected()) {
    throw new AppointmentServiceError(
      "DATABASE_UNAVAILABLE",
      "Database persistence is currently unavailable.",
      503,
    );
  }

  const cleanRef = (referenceNumber || "").trim().toUpperCase();
  const normPhone = normalizePhoneNumber(rawPhone);

  if (!cleanRef || !normPhone) {
    throw new AppointmentServiceError(
      "INVALID_CREDENTIALS",
      "Invalid booking reference or verification details.",
      404,
    );
  }

  const rateLimitKey = `${clientIp}:${cleanRef}`;
  checkRecoveryRateLimit(rateLimitKey);

  const aptCol = mongoAdapter.getAppointmentCollection();

  // Support lookup by referenceNumber OR numeric bookingNumber
  const numericOnly = cleanRef.replace(/^#/, "").trim();
  const parsedBookingNumber = /^\d+$/.test(numericOnly) ? parseInt(numericOnly, 10) : null;

  const query: Record<string, any> = {
    patientPhone: normPhone,
    $or: [
      { referenceNumber: cleanRef },
      { id: cleanRef },
      { voucherId: cleanRef },
      ...(parsedBookingNumber !== null && parsedBookingNumber > 0 ? [{ bookingNumber: parsedBookingNumber }] : []),
    ],
  };

  const record = await aptCol.findOne(query);

  if (!record || record.patientPhone !== normPhone) {
    recordFailedRecoveryAttempt(rateLimitKey);
    throw new AppointmentServiceError(
      "INVALID_CREDENTIALS",
      "Invalid booking reference or verification details.",
      404,
    );
  }

  clearRecoveryAttempts(rateLimitKey);

  return {
    referenceNumber: record.referenceNumber,
    voucherId: record.voucherId ?? formatVoucherId(record.appointmentDate),
    bookingNumber: record.bookingNumber ?? 1,
    bookingNumberDisplay: record.bookingNumberDisplay ?? formatBookingNumberDisplay(record.bookingNumber ?? 1),
    doctorName: record.doctorName,
    doctorSpecialty: record.doctorSpecialty,
    facilityName: record.chamberName,
    appointmentDate: record.appointmentDate,
    appointmentTime: record.appointmentTime,
    service: record.service,
    status: record.status,
    patientNameMasked: maskPatientName(record.patientName),
    patientPhoneMasked: maskPatientPhone(record.patientPhone),
    createdAt: record.createdAt,
  };
}

/**
 * Retrieves appointments for the authenticated doctor portal view.
 */
export async function getDoctorAppointmentsList(
  doctorId: string,
  filter: {
    chamberId?: string | undefined;
    appointmentDate?: string | undefined;
    status?: string | undefined;
  } = {},
): Promise<AppointmentRecord[]> {
  if (!mongoAdapter.isConnected()) {
    throw new AppointmentServiceError(
      "DATABASE_UNAVAILABLE",
      "Database is not connected.",
      503,
    );
  }

  const aptCol = mongoAdapter.getAppointmentCollection();
  const query: Record<string, any> = { doctorId };

  if (filter.chamberId) {
    query.chamberId = filter.chamberId;
  }
  if (filter.appointmentDate) {
    query.appointmentDate = filter.appointmentDate;
  }
  if (filter.status) {
    query.status = filter.status;
  }

  return aptCol.find(query).sort({ appointmentDate: 1, createdAt: 1 }).toArray();
}
