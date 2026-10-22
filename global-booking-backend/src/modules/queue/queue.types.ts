export type QueueTicketStatus =
  | "WAITING"
  | "CALLED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export type QueuePriority = "STANDARD" | "URGENT" | "VIP";

export type QueueChannel = "WALK_IN" | "ONLINE_WEB" | "PHONE";

export interface QueueTicketRecord {
  id: string; // Canonical ticket ID e.g. "TKT-20261022-5357-CH1-001"
  doctorId: string; // Doctor entity ID e.g. "DOC-5357"
  doctorAccountId: string; // Doctor account ID e.g. "ACC-DOC-705357"
  chamberId: string; // Chamber ID e.g. "CH-1"
  chamberName: string; // Chamber facility name e.g. "Medcare Heart Centre"
  chamberTimezone: string; // IANA timezone e.g. "Asia/Dhaka", "Asia/Dubai"
  dateKey: string; // Local business date e.g. "2026-10-22"
  serialIndex: number; // 1, 2, 3...
  ticketNumber: string; // Formatted display e.g. "#01", "#02"

  patientName: string;
  patientPhone?: string | undefined;
  patientOprId?: string | undefined;
  service: string;
  priority: QueuePriority;
  channel: QueueChannel;
  appointmentId?: string | undefined;

  status: QueueTicketStatus;
  checkInTime: string; // e.g. "10:30 AM"
  createdAt: string; // ISO 8601 UTC
  calledAt?: string | undefined;
  consultationStartedAt?: string | undefined;
  completedAt?: string | undefined;
  cancelledAt?: string | undefined;

  idempotencyKey?: string | undefined;
  createdById: string;
  notes?: string | undefined;
}

export interface QueueCounterRecord {
  id: string; // Compound key `${doctorId}:${chamberId}:${dateKey}`
  doctorId: string;
  chamberId: string;
  dateKey: string;
  lastSerial: number;
  updatedAt: string;
}

export interface CreateQueueTicketBody {
  chamberId: string;
  chamberTimezone?: string | undefined;
  patientName: string;
  patientPhone?: string | undefined;
  patientOprId?: string | undefined;
  service?: string | undefined;
  priority?: QueuePriority | undefined;
  channel?: QueueChannel | undefined;
  appointmentId?: string | undefined;
  idempotencyKey?: string | undefined;
  notes?: string | undefined;
}

export interface QueueQuery {
  chamberId?: string | undefined;
  dateKey?: string | undefined;
  status?: QueueTicketStatus | undefined;
}
