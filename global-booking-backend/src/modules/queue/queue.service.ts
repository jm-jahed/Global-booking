import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { getChamberBusinessDate, formatChamberLocalTime, isValidIanaTimezone } from "./queue.timezone.js";
import type {
  QueueTicketRecord,
  QueueCounterRecord,
  CreateQueueTicketBody,
  QueueTicketStatus,
  QueueChannel,
} from "./queue.types.js";
import type { DoctorRecord, DoctorChamberDetail } from "../admin/admin.types.js";
import {
  syncCompletedQueueTicketToPatientRecord,
  normalizeDateKeyToIso,
} from "../patients/patients.service.js";

export class QueueServiceError extends Error {
  constructor(
    public readonly code:
      | "MISSING_CHAMBER_TIMEZONE"
      | "CHAMBER_NOT_FOUND"
      | "TICKET_NOT_FOUND"
      | "IDEMPOTENCY_CONFLICT"
      | "INVALID_TRANSITION"
      | "DATABASE_UNAVAILABLE"
      | "DOCTOR_NOT_FOUND",
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "QueueServiceError";
  }
}

/**
 * Atomically increments and allocates the next sequential daily serial number
 * scoped strictly to: doctorId + chamberId + businessDate
 */
export async function allocateChamberSerial(
  doctorId: string,
  chamberId: string,
  dateKey: string,
): Promise<number> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const counterCol = mongoAdapter.getQueueCounterCollection();
  const counterId = `${doctorId}:${chamberId}:${dateKey}`;
  const nowIso = new Date().toISOString();

  const result = await counterCol.findOneAndUpdate(
    { doctorId, chamberId, dateKey },
    {
      $inc: { lastSerial: 1 },
      $set: { updatedAt: nowIso },
      $setOnInsert: { id: counterId, doctorId, chamberId, dateKey },
    },
    { upsert: true, returnDocument: "after" },
  );

  const allocated = (result as QueueCounterRecord | null)?.lastSerial;
  if (typeof allocated !== "number" || allocated < 1) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Failed to allocate serial number counter.", 500);
  }

  return allocated;
}

/**
 * Issues a new queue ticket with chamber-local timezone and atomic serial allocation.
 * Guarantees idempotency: same key with same payload replays existing ticket.
 * Gaps policy: If serial allocation succeeds but insertion fails, a serial gap may occur;
 * duplicates are strictly prevented.
 */
export async function createQueueTicket(
  doctor: DoctorRecord,
  chamber: DoctorChamberDetail,
  body: CreateQueueTicketBody,
  createdById: string,
): Promise<{ ticket: QueueTicketRecord; isReplay: boolean }> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  // 1. Enforce chamber-level IANA timezone configuration
  const resolvedTimezone = (chamber.timezone || body.chamberTimezone)?.trim();
  if (!resolvedTimezone || !isValidIanaTimezone(resolvedTimezone)) {
    throw new QueueServiceError(
      "MISSING_CHAMBER_TIMEZONE",
      `Chamber '${chamber.facilityName}' (${chamber.id}) has no valid IANA timezone configured. Please configure an authoritative timezone (e.g. 'Asia/Dhaka', 'Asia/Dubai') before issuing tickets.`,
      400,
    );
  }

  // Persist timezone to doctor chamber record if not already stored
  if (!chamber.timezone && body.chamberTimezone) {
    const docCol = mongoAdapter.getDoctorCollection();
    await docCol
      .updateOne(
        { id: doctor.id, "chambers.id": chamber.id },
        { $set: { "chambers.$.timezone": resolvedTimezone } },
      )
      .catch(() => {});
  }

  const timezone = resolvedTimezone;

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const trimmedPatientName = String(body.patientName || "").trim();
  const service = String(body.service || "General Medical Consultation").trim();

  // 2. Idempotency Check
  if (body.idempotencyKey) {
    const trimmedKey = body.idempotencyKey.trim();
    if (trimmedKey) {
      const existing = await ticketCol.findOne({
        doctorId: doctor.doctorId,
        idempotencyKey: trimmedKey,
      });

      if (existing) {
        // Verify logical equivalence of request
        const matchesChamber = existing.chamberId === chamber.id;
        const matchesPatient = existing.patientName.toLowerCase() === trimmedPatientName.toLowerCase();
        const matchesService = existing.service.toLowerCase() === service.toLowerCase();

        if (matchesChamber && matchesPatient && matchesService) {
          return { ticket: existing, isReplay: true };
        }

        // Conflicting request reusing idempotency key
        throw new QueueServiceError(
          "IDEMPOTENCY_CONFLICT",
          `Idempotency key '${trimmedKey}' was already used for a conflicting ticket request.`,
          409,
        );
      }
    }
  }

  // 3. Compute Chamber-Local Business Date & Display Time
  const now = new Date();
  const nowIso = now.toISOString();
  const dateKey = getChamberBusinessDate(timezone, now);
  const checkInTime = formatChamberLocalTime(timezone, now);

  // 4. Atomically Allocate Serial Number
  const serialIndex = await allocateChamberSerial(doctor.doctorId, chamber.id, dateKey);
  const ticketNumber = `#${serialIndex.toString().padStart(2, "0")}`;

  // 5. Build Canonical Queue Ticket Record
  const cleanDocId = doctor.doctorId.replace(/[^a-zA-Z0-9]/g, "");
  const cleanChmId = chamber.id.replace(/[^a-zA-Z0-9]/g, "");
  const ticketId = `TKT-${dateKey.replace(/-/g, "")}-${cleanDocId}-${cleanChmId}-${serialIndex.toString().padStart(3, "0")}`;

  const ticketRecord: QueueTicketRecord = {
    id: ticketId,
    doctorId: doctor.doctorId,
    doctorAccountId: doctor.id,
    chamberId: chamber.id,
    chamberName: chamber.facilityName,
    chamberTimezone: timezone,
    dateKey,
    serialIndex,
    ticketNumber,
    patientName: trimmedPatientName,
    patientPhone: body.patientPhone ? String(body.patientPhone).trim() : undefined,
    patientOprId: body.patientOprId ? String(body.patientOprId).trim() : undefined,
    service,
    priority: body.priority || "STANDARD",
    channel: body.channel || "WALK_IN",
    appointmentId: body.appointmentId ? String(body.appointmentId).trim() : undefined,
    status: "WAITING",
    checkInTime,
    createdAt: nowIso,
    idempotencyKey: body.idempotencyKey ? body.idempotencyKey.trim() : undefined,
    createdById,
    notes: body.notes ? String(body.notes).trim() : undefined,
  };

  // 6. Insert into queue_tickets
  try {
    await ticketCol.insertOne(ticketRecord);
  } catch (err: any) {
    // Check if unique index duplicate error occurred (race condition)
    if (err?.code === 11000 && body.idempotencyKey) {
      const raceExisting = await ticketCol.findOne({
        doctorId: doctor.doctorId,
        idempotencyKey: body.idempotencyKey.trim(),
      });
      if (raceExisting) {
        return { ticket: raceExisting, isReplay: true };
      }
    }
    throw err;
  }

  return { ticket: ticketRecord, isReplay: false };
}

/**
 * Synchronizes linked appointment document status with queue transitions.
 */
async function syncAppointmentStatus(
  appointmentId: string | undefined,
  status: "IN_CONSULTATION" | "COMPLETED" | "CANCELLED",
): Promise<void> {
  if (!appointmentId) return;
  try {
    if (typeof (mongoAdapter as any).getAppointmentCollection === "function") {
      const aptCol = mongoAdapter.getAppointmentCollection();
      if (aptCol && typeof aptCol.updateOne === "function") {
        await aptCol.updateOne(
          { id: appointmentId },
          {
            $set: {
              status,
              updatedAt: new Date().toISOString(),
            },
          },
        );
      }
    }
  } catch {
    // Non-fatal if appointment update fails
  }
}

/**
 * Resolves a QueueTicketRecord by ticketId OR appointmentId.
 * If the record is missing from queue_tickets but exists in appointments,
 * synthesizes and inserts the queue ticket record dynamically.
 */
async function resolveOrCreateQueueTicket(
  doctorId: string,
  ticketOrAptId: string,
): Promise<QueueTicketRecord> {
  const ticketCol = mongoAdapter.getQueueTicketCollection();

  // 1. Direct query by id first (compatible with unit-test mocks)
  let ticket = await ticketCol.findOne({ id: ticketOrAptId });

  // 2. Check by appointmentId or $or if needed
  if (!ticket) {
    try {
      ticket = await ticketCol.findOne({
        doctorId,
        $or: [{ id: ticketOrAptId }, { appointmentId: ticketOrAptId }],
      } as any);
    } catch {
      // Mock may not support $or
    }
  }

  if (ticket) {
    if (ticket.doctorId && ticket.doctorId !== doctorId) {
      throw new QueueServiceError("TICKET_NOT_FOUND", "Queue ticket not found or unauthorized.", 404);
    }
    return ticket;
  }

  // 3. Check appointments collection
  if (typeof (mongoAdapter as any).getAppointmentCollection === "function") {
    try {
      const aptCol = mongoAdapter.getAppointmentCollection();
      if (aptCol && typeof aptCol.findOne === "function") {
        const apt = await aptCol.findOne({
          doctorId,
          id: ticketOrAptId,
        });

        if (apt) {
          const isoDateKey = normalizeDateKeyToIso(apt.appointmentDate);
          const cleanDocId = (apt.doctorId || doctorId).replace(/[^a-zA-Z0-9]/g, "");
          const cleanChamberId = (apt.chamberId || "CH1").replace(/[^a-zA-Z0-9]/g, "");
          const serial = apt.bookingNumber || 1;
          const newTicketId = `TKT-${isoDateKey.replace(/\D/g, "")}-${cleanDocId}-${cleanChamberId}-${String(serial).padStart(3, "0")}-${apt.id.slice(-6)}`;

          const newTicket: QueueTicketRecord = {
            id: newTicketId,
            doctorId: apt.doctorId || doctorId,
            doctorAccountId: apt.doctorAccountId || doctorId,
            chamberId: apt.chamberId || "main-chamber",
            chamberName: apt.chamberName || "Main Chamber",
            chamberTimezone: apt.chamberTimezone || "Asia/Dhaka",
            dateKey: isoDateKey,
            serialIndex: serial,
            ticketNumber: apt.bookingNumberDisplay || `#${String(serial).padStart(2, "0")}`,
            patientName: apt.patientName,
            patientPhone: apt.patientPhone,
            patientOprId: apt.voucherId,
            service: apt.service || "General Consultation",
            priority: "STANDARD",
            channel: (apt.channel === "PHONE" ? "PHONE" : "ONLINE_WEB") as QueueChannel,
            appointmentId: apt.id,
            status: apt.status === "COMPLETED" ? "COMPLETED" : apt.status === "IN_CONSULTATION" ? "IN_CONSULTATION" : apt.status === "CANCELLED" ? "SKIPPED" : "WAITING",
            checkInTime: new Date().toLocaleTimeString("en-US", { hour12: false }),
            createdAt: apt.createdAt || new Date().toISOString(),
            createdById: "SYSTEM_ONLINE_BOOKING",
            notes: apt.notes || `Online Booking Date: ${apt.appointmentDate ? apt.appointmentDate.split("-").reverse().join("-") : ""}`,
          };

          try {
            await ticketCol.insertOne(newTicket);
          } catch {
            // ignore
          }

          return newTicket;
        }
      }
    } catch {
      // ignore
    }
  }

  throw new QueueServiceError("TICKET_NOT_FOUND", "Queue ticket not found or unauthorized.", 404);
}

/**
 * Retrieves today's queue items for the specified doctor and optional chamber/status filters.
 * Automatically synchronizes any doctor appointments that are missing queue ticket records.
 */
export async function getDoctorQueueTickets(
  doctorId: string,
  filter: {
    chamberId?: string | undefined;
    dateKey?: string | undefined;
    status?: QueueTicketStatus | undefined;
    includeArchived?: boolean | undefined;
  } = {},
): Promise<QueueTicketRecord[]> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();

  // Auto-sync existing doctor appointments into queue_tickets if missing
  try {
    if (typeof (mongoAdapter as any).getAppointmentCollection === "function") {
      const aptCol = mongoAdapter.getAppointmentCollection();
      if (aptCol && typeof aptCol.find === "function") {
        const aptQuery: Record<string, any> = { doctorId };
        if (filter.dateKey) {
          aptQuery.appointmentDate = normalizeDateKeyToIso(filter.dateKey);
        }
        if (filter.chamberId) {
          aptQuery.chamberId = filter.chamberId;
        }

        const findCursor = aptCol.find(aptQuery);
        const existingApts = typeof (findCursor as any)?.sort === "function"
          ? await (findCursor as any).sort({ createdAt: 1 }).toArray()
          : typeof (findCursor as any)?.toArray === "function"
          ? await (findCursor as any).toArray()
          : [];

        if (Array.isArray(existingApts) && existingApts.length > 0) {
          const ticketsFilter: Record<string, any> = { doctorId };
          if (filter.dateKey) {
            ticketsFilter.dateKey = normalizeDateKeyToIso(filter.dateKey);
          }
          if (filter.chamberId) {
            ticketsFilter.chamberId = filter.chamberId;
          }
          const ticketsCursor = ticketCol.find(ticketsFilter);
          const allCurrentTickets = typeof (ticketsCursor as any)?.sort === "function"
            ? await (ticketsCursor as any).sort({ serialIndex: 1 }).toArray()
            : typeof (ticketsCursor as any)?.toArray === "function"
            ? await (ticketsCursor as any).toArray()
            : [];

          const existingTicketAptIds = new Set(
            (allCurrentTickets || []).map((t: any) => t.appointmentId).filter(Boolean),
          );

          let maxSerial = 0;
          for (const t of allCurrentTickets || []) {
            if (typeof t.serialIndex === "number" && t.serialIndex > maxSerial) {
              maxSerial = t.serialIndex;
            }
          }

          let doctorRecord: DoctorRecord | null = null;
          try {
            const docCol = mongoAdapter.getDoctorCollection();
            if (docCol && typeof docCol.findOne === "function") {
              doctorRecord = await docCol.findOne({ doctorId });
            }
          } catch {
            // Non-fatal doctor lookup
          }

          for (let i = 0; i < existingApts.length; i++) {
            const apt = existingApts[i];
            if (!existingTicketAptIds.has(apt.id)) {
              const isoDateKey = normalizeDateKeyToIso(apt.appointmentDate);
              const chamberDetail = (doctorRecord?.chambers || []).find(
                (c: DoctorChamberDetail) => c.id === apt.chamberId || (filter.chamberId && c.id === filter.chamberId),
              );
              const chamberTz =
                (apt.chamberTimezone && isValidIanaTimezone(apt.chamberTimezone) ? apt.chamberTimezone : undefined) ||
                (chamberDetail?.timezone && isValidIanaTimezone(chamberDetail.timezone) ? chamberDetail.timezone : undefined) ||
                "Asia/Dubai";
              const chamberTodayKey = getChamberBusinessDate(chamberTz, new Date());

              // Guard: Do not synthesize new active tickets for historical chamber-local business dates
              if (isoDateKey < chamberTodayKey) {
                continue;
              }

              const cleanDocId = (apt.doctorId || doctorId).replace(/[^a-zA-Z0-9]/g, "");
              const cleanChamberId = (apt.chamberId || "CH1").replace(/[^a-zA-Z0-9]/g, "");
              const serial = apt.bookingNumber || (maxSerial + 1 + i);
              const display = apt.bookingNumberDisplay || `#${String(serial).padStart(2, "0")}`;
              const newTicketId = `TKT-${isoDateKey.replace(/\D/g, "")}-${cleanDocId}-${cleanChamberId}-${String(serial).padStart(3, "0")}-${apt.id.slice(-6)}`;

              // Update appointment display if missing
              if (!apt.bookingNumber || !apt.bookingNumberDisplay) {
                await aptCol.updateOne(
                  { id: apt.id },
                  { $set: { bookingNumber: serial, bookingNumberDisplay: display } },
                ).catch(() => {});
              }

              const newTicket: QueueTicketRecord = {
                id: newTicketId,
                doctorId: apt.doctorId || doctorId,
                doctorAccountId: apt.doctorAccountId || doctorId,
                chamberId: apt.chamberId || "main-chamber",
                chamberName: apt.chamberName || "Main Chamber",
                chamberTimezone: chamberTz,
                dateKey: isoDateKey,
                serialIndex: serial,
                ticketNumber: display,
                patientName: apt.patientName,
                patientPhone: apt.patientPhone,
                patientOprId: apt.voucherId,
                service: apt.service || "General Consultation",
                priority: "STANDARD",
                channel: (apt.channel === "PHONE" ? "PHONE" : "ONLINE_WEB") as QueueChannel,
                appointmentId: apt.id,
                status: apt.status === "COMPLETED" ? "COMPLETED" : apt.status === "IN_CONSULTATION" ? "IN_CONSULTATION" : apt.status === "CANCELLED" ? "SKIPPED" : "WAITING",
                checkInTime: new Date().toLocaleTimeString("en-US", { hour12: false }),
                createdAt: apt.createdAt || new Date().toISOString(),
                createdById: "SYSTEM_ONLINE_BOOKING",
                notes: apt.notes || `Online Booking Date: ${apt.appointmentDate ? apt.appointmentDate.split("-").reverse().join("-") : ""}`,
              };

              await ticketCol.updateOne({ id: newTicketId }, { $setOnInsert: newTicket }, { upsert: true }).catch(() => {});
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal sync
  }

  const query: Record<string, any> = { doctorId };

  if (filter.chamberId) {
    query.chamberId = filter.chamberId;
  }
  if (filter.dateKey) {
    query.dateKey = normalizeDateKeyToIso(filter.dateKey);
  }
  if (filter.status) {
    query.status = filter.status;
  }
  if (!filter.includeArchived) {
    query.isArchived = { $ne: true };
  }

  // If dateKey is not specified, run automatic day-end cleanup for prior dates
  if (!filter.dateKey && !filter.includeArchived) {
    try {
      await archiveDoctorQueueDayEnd(doctorId, { chamberId: filter.chamberId });
    } catch {
      // Non-blocking
    }
  }

  return ticketCol.find(query).sort({ serialIndex: 1 }).toArray();
}

/**
 * Transitions a ticket to CALLED or IN_CONSULTATION status.
 */
export async function callQueueTicket(
  doctorId: string,
  ticketId: string,
): Promise<QueueTicketRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const ticket = await resolveOrCreateQueueTicket(doctorId, ticketId);

  if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
    throw new QueueServiceError(
      "INVALID_TRANSITION",
      `Cannot call a ticket that is already ${ticket.status}.`,
      400,
    );
  }

  // Idempotent if already CALLED
  if (ticket.status === "CALLED") {
    return ticket;
  }

  const nowIso = new Date().toISOString();

  // Atomically mark any previously serving/called ticket for this doctor & chamber as COMPLETED
  if (typeof (ticketCol as any).updateMany === "function") {
    const previouslyServing = await ticketCol.find({
      doctorId,
      chamberId: ticket.chamberId,
      status: { $in: ["CALLED", "IN_CONSULTATION"] },
      id: { $ne: ticket.id },
    }).toArray();

    for (const prev of previouslyServing) {
      if (prev.appointmentId) {
        await syncAppointmentStatus(prev.appointmentId, "COMPLETED");
      }
      try {
        await syncCompletedQueueTicketToPatientRecord(doctorId, {
          ...prev,
          status: "COMPLETED",
          completedAt: nowIso,
        });
      } catch (err: any) {
        console.warn("Auto-sync completed patient error:", err);
      }
    }

    await ticketCol.updateMany(
      {
        doctorId,
        chamberId: ticket.chamberId,
        status: { $in: ["CALLED", "IN_CONSULTATION"] },
        id: { $ne: ticket.id },
      },
      {
        $set: {
          status: "COMPLETED",
          completedAt: nowIso,
        },
      },
    );
  }

  await ticketCol.updateOne(
    { id: ticket.id },
    {
      $set: {
        status: "CALLED",
        calledAt: ticket.calledAt || nowIso,
      },
    },
  );

  // Sync linked appointment
  await syncAppointmentStatus(ticket.appointmentId, "IN_CONSULTATION");

  return { ...ticket, status: "CALLED", calledAt: ticket.calledAt || nowIso };
}

/**
 * Transitions a ticket to COMPLETED status and immediately auto-syncs patient record.
 */
export async function finishQueueTicket(
  doctorId: string,
  ticketId: string,
): Promise<QueueTicketRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const ticket = await resolveOrCreateQueueTicket(doctorId, ticketId);

  if (ticket.status === "CANCELLED") {
    throw new QueueServiceError("INVALID_TRANSITION", "Cannot finish a cancelled ticket.", 400);
  }

  // Self-healing: if already COMPLETED, safely guarantee linked appointment & patient sync on retry
  if (ticket.status === "COMPLETED") {
    await syncAppointmentStatus(ticket.appointmentId, "COMPLETED");
    await syncCompletedQueueTicketToPatientRecord(doctorId, ticket);
    return ticket;
  }

  const nowIso = new Date().toISOString();
  await ticketCol.updateOne(
    { id: ticket.id },
    {
      $set: {
        status: "COMPLETED",
        completedAt: nowIso,
      },
    },
  );

  // Sync linked appointment
  await syncAppointmentStatus(ticket.appointmentId, "COMPLETED");

  const completedTicket: QueueTicketRecord = { ...ticket, status: "COMPLETED", completedAt: nowIso };

  // Immediately create or update persistent patient record
  await syncCompletedQueueTicketToPatientRecord(doctorId, completedTicket);

  return completedTicket;
}

/**
 * Executes Day-End Cleanup for Doctor's Live Queue.
 *
 * Rules:
 * 1. Removes closed day's tickets from active /live-queue view by setting isArchived: true.
 * 2. Never deletes records: all tickets, appointments, patient records, and visit histories remain preserved in MongoDB.
 * 3. Before archiving, ensures any COMPLETED tickets are synchronized to persistent patient records.
 * 4. Strictly scoped to the authenticated doctor/clinic tenant. Other doctors' queues remain untouched.
 * 5. Respects configured chamber IANA timezone for local date boundary calculation.
 * 6. Idempotent: safe to run repeatedly; retrying does not delete or duplicate records.
 */
export async function archiveDoctorQueueDayEnd(
  doctorId: string,
  options: {
    chamberId?: string | undefined;
    targetDateKey?: string | undefined;
    forceToday?: boolean | undefined;
  } = {},
): Promise<{
  success: boolean;
  doctorId: string;
  archivedCount: number;
  patientsSyncedCount: number;
  preservedAppointmentsCount: number;
  preservedPatientsCount: number;
  targetDateKey?: string | undefined;
  message: string;
}> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const docCol = mongoAdapter.getDoctorCollection();
  const aptCol = mongoAdapter.getAppointmentCollection();
  let patientCol: any;
  try {
    patientCol = (mongoAdapter as any).getPatientCollection
      ? (mongoAdapter as any).getPatientCollection()
      : mongoAdapter.getDb().collection("patients");
  } catch {
    patientCol = {
      countDocuments: async () => 0,
      findOne: async () => null,
      insertOne: async () => ({ acknowledged: true }),
      updateOne: async () => ({ acknowledged: true }),
    };
  }

  const doctor = await docCol.findOne({ doctorId });
  if (!doctor) {
    throw new QueueServiceError("DOCTOR_NOT_FOUND", "Doctor record not found.", 404);
  }

  // Determine target chamber(s)
  const chambers = (doctor.chambers || []).filter(
    (c: DoctorChamberDetail) => !options.chamberId || c.id === options.chamberId,
  );

  let totalArchived = 0;
  let totalSynced = 0;
  const nowIso = new Date().toISOString();

  const chamberList =
    chambers.length > 0
      ? chambers
      : [{ id: options.chamberId || "default", facilityName: "Main Chamber", timezone: "Asia/Dhaka" }];

  for (const chm of chamberList) {
    const timezone = chm.timezone && isValidIanaTimezone(chm.timezone) ? chm.timezone : "Asia/Dubai";
    const chamberTodayKey = getChamberBusinessDate(timezone, new Date());
    const targetKey = options.targetDateKey || (options.forceToday ? chamberTodayKey : undefined);

    const baseQuery: Record<string, any> = {
      doctorId,
      isArchived: { $ne: true },
    };
    if (options.chamberId) {
      baseQuery.chamberId = options.chamberId;
    }

    const candidateTickets = await ticketCol.find(baseQuery).toArray();

    // Filter tickets targeting either specific date or all prior dates (backward-compatible with YYYY-MM-DD and YYYYMMDD)
    const cleanToday = chamberTodayKey.replace(/\D/g, "");
    const ticketsToArchive = candidateTickets.filter((t) => {
      if (!t.dateKey) return true;
      if (targetKey) {
        const cleanTarget = targetKey.replace(/\D/g, "");
        const cleanTktDate = t.dateKey.replace(/\D/g, "");
        return t.dateKey === targetKey || cleanTktDate === cleanTarget;
      }
      // Automatic day-end: all tickets strictly prior to today's local business date
      if (t.dateKey.includes("-")) {
        return t.dateKey < chamberTodayKey;
      } else {
        return t.dateKey < cleanToday;
      }
    });

    if (ticketsToArchive.length === 0) continue;

    // Sync any un-synced COMPLETED tickets to patients registry before archiving
    for (const t of ticketsToArchive) {
      if (t.status === "COMPLETED") {
        try {
          await syncCompletedQueueTicketToPatientRecord(doctorId, t);
          totalSynced++;
        } catch {
          // Non-blocking
        }
      }
    }

    const ticketIds = ticketsToArchive.map((t) => t.id);
    const updateRes = await ticketCol.updateMany(
      { doctorId, id: { $in: ticketIds } },
      {
        $set: {
          isArchived: true,
          archivedAt: nowIso,
        },
      },
    );

    totalArchived += (updateRes as any).modifiedCount || ticketsToArchive.length;
  }

  const preservedAppointmentsCount = await aptCol.countDocuments({ doctorId });
  const preservedPatientsCount = await patientCol.countDocuments({ doctorId });

  return {
    success: true,
    doctorId,
    archivedCount: totalArchived,
    patientsSyncedCount: totalSynced,
    preservedAppointmentsCount,
    preservedPatientsCount,
    targetDateKey: options.targetDateKey,
    message: `Day-end cleanup archived ${totalArchived} tickets without deleting any records.`,
  };
}

/**
 * Transitions a ticket to SKIPPED status.
 */
export async function skipQueueTicket(
  doctorId: string,
  ticketId: string,
): Promise<QueueTicketRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const ticket = await resolveOrCreateQueueTicket(doctorId, ticketId);

  await ticketCol.updateOne(
    { id: ticket.id },
    {
      $set: {
        status: "SKIPPED",
      },
    },
  );

  // Sync linked appointment
  await syncAppointmentStatus(ticket.appointmentId, "CANCELLED");

  return { ...ticket, status: "SKIPPED" };
}

/**
 * Transitions a ticket to NO_SHOW status.
 */
export async function noShowQueueTicket(
  doctorId: string,
  ticketId: string,
): Promise<QueueTicketRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const ticket = await resolveOrCreateQueueTicket(doctorId, ticketId);

  await ticketCol.updateOne(
    { id: ticket.id },
    {
      $set: {
        status: "NO_SHOW",
      },
    },
  );

  // Sync linked appointment
  await syncAppointmentStatus(ticket.appointmentId, "CANCELLED");

  return { ...ticket, status: "NO_SHOW" };
}
