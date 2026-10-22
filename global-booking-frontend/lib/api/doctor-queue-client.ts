/**
 * GLOBAL BOOKING — Doctor Personal Live Queue API Client
 * Connects Live Queue directly to the Fastify + MongoDB backend (port 3003).
 * Uses HTTP-only cookie credentials with Bearer token authorization fallback.
 */

import { getApiBaseUrl } from "./admin-client";

export type QueueTicketStatus =
  | "WAITING"
  | "CALLED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export type QueuePriority = "STANDARD" | "URGENT" | "VIP";

export type QueueChannel = "WALK_IN" | "ONLINE_WEB" | "PHONE";

export interface BackendQueueTicket {
  id: string;
  doctorId: string;
  doctorAccountId: string;
  chamberId: string;
  chamberName: string;
  chamberTimezone: string;
  dateKey: string;
  serialIndex: number;
  ticketNumber: string;

  patientName: string;
  patientPhone?: string;
  patientOprId?: string;
  service: string;
  priority: QueuePriority;
  channel: QueueChannel;
  appointmentId?: string;

  status: QueueTicketStatus;
  checkInTime: string;
  createdAt: string;
  calledAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  idempotencyKey?: string;
  createdById: string;
  notes?: string;
}

export interface BackendQueueResponse {
  statusCode: number;
  items: BackendQueueTicket[];
  count: number;
  doctorId: string;
}

export interface BackendTicketResponse {
  statusCode: number;
  ticket: BackendQueueTicket;
  isReplay?: boolean;
  success?: boolean;
}

export interface CreateQueueTicketPayload {
  chamberId: string;
  chamberTimezone?: string;
  patientName: string;
  patientPhone?: string;
  patientOprId?: string;
  service?: string;
  priority?: QueuePriority;
  channel?: QueueChannel;
  appointmentId?: string;
  idempotencyKey?: string;
  notes?: string;
}

async function queueRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Attach Bearer token from localStorage if available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gb_admin_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      body?.message || body?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return body as T;
}

/**
 * GET /api/v1/portal/doctor/queue
 * Retrieves live queue tickets for the authenticated doctor from MongoDB.
 */
export async function fetchDoctorQueue(params?: {
  chamberId?: string;
  dateKey?: string;
  status?: string;
}): Promise<BackendQueueResponse> {
  const query = new URLSearchParams();
  if (params?.chamberId) query.set("chamberId", params.chamberId);
  if (params?.dateKey) query.set("dateKey", params.dateKey);
  if (params?.status) query.set("status", params.status);

  const qs = query.toString() ? `?${query.toString()}` : "";
  return queueRequest<BackendQueueResponse>(`/api/v1/portal/doctor/queue${qs}`);
}

/**
 * POST /api/v1/portal/doctor/queue/tickets
 * Issues a new walk-in OPD ticket with atomic daily serial in MongoDB.
 */
export async function issueWalkInTicket(
  payload: CreateQueueTicketPayload,
): Promise<BackendTicketResponse> {
  return queueRequest<BackendTicketResponse>("/api/v1/portal/doctor/queue/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/v1/portal/doctor/queue/tickets/:id/call
 * Calls a patient into consultation chamber.
 */
export async function callQueuePatient(ticketId: string): Promise<BackendTicketResponse> {
  return queueRequest<BackendTicketResponse>(`/api/v1/portal/doctor/queue/tickets/${encodeURIComponent(ticketId)}/call`, {
    method: "PATCH",
  });
}

/**
 * PATCH /api/v1/portal/doctor/queue/tickets/:id/finish
 * Marks patient consultation as completed.
 */
export async function finishQueuePatient(ticketId: string): Promise<BackendTicketResponse> {
  return queueRequest<BackendTicketResponse>(`/api/v1/portal/doctor/queue/tickets/${encodeURIComponent(ticketId)}/finish`, {
    method: "PATCH",
  });
}
