import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { getChamberBusinessDate, formatChamberLocalTime, isValidIanaTimezone } from "./queue.timezone.js";
import type {
  QueueTicketRecord,
  QueueCounterRecord,
  CreateQueueTicketBody,
  QueueTicketStatus,
} from "./queue.types.js";
import type { DoctorRecord, DoctorChamberDetail } from "../admin/admin.types.js";

export class QueueServiceError extends Error {
  constructor(
    public readonly code:
      | "MISSING_CHAMBER_TIMEZONE"
      | "CHAMBER_NOT_FOUND"
      | "TICKET_NOT_FOUND"
      | "IDEMPOTENCY_CONFLICT"
      | "INVALID_TRANSITION"
      | "DATABASE_UNAVAILABLE",
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
 * Retrieves today's queue items for the specified doctor and optional chamber/status filters.
 */
export async function getDoctorQueueTickets(
  doctorId: string,
  filter: {
    chamberId?: string | undefined;
    dateKey?: string | undefined;
    status?: QueueTicketStatus | undefined;
  } = {},
): Promise<QueueTicketRecord[]> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const query: Record<string, any> = { doctorId };

  if (filter.chamberId) {
    query.chamberId = filter.chamberId;
  }
  if (filter.dateKey) {
    query.dateKey = filter.dateKey;
  }
  if (filter.status) {
    query.status = filter.status;
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
  const ticket = await ticketCol.findOne({ id: ticketId });

  if (!ticket || ticket.doctorId !== doctorId) {
    throw new QueueServiceError("TICKET_NOT_FOUND", "Queue ticket not found or unauthorized.", 404);
  }

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
  await ticketCol.updateOne(
    { id: ticketId },
    {
      $set: {
        status: "CALLED",
        calledAt: ticket.calledAt || nowIso,
      },
    },
  );

  return { ...ticket, status: "CALLED", calledAt: ticket.calledAt || nowIso };
}

/**
 * Transitions a ticket to COMPLETED status.
 */
export async function finishQueueTicket(
  doctorId: string,
  ticketId: string,
): Promise<QueueTicketRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new QueueServiceError("DATABASE_UNAVAILABLE", "Database is not connected.", 503);
  }

  const ticketCol = mongoAdapter.getQueueTicketCollection();
  const ticket = await ticketCol.findOne({ id: ticketId });

  if (!ticket || ticket.doctorId !== doctorId) {
    throw new QueueServiceError("TICKET_NOT_FOUND", "Queue ticket not found or unauthorized.", 404);
  }

  if (ticket.status === "CANCELLED") {
    throw new QueueServiceError("INVALID_TRANSITION", "Cannot finish a cancelled ticket.", 400);
  }

  // Idempotent if already COMPLETED
  if (ticket.status === "COMPLETED") {
    return ticket;
  }

  const nowIso = new Date().toISOString();
  await ticketCol.updateOne(
    { id: ticketId },
    {
      $set: {
        status: "COMPLETED",
        completedAt: nowIso,
      },
    },
  );

  return { ...ticket, status: "COMPLETED", completedAt: nowIso };
}
