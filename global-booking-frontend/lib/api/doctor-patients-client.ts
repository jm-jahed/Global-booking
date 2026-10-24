import { getApiBaseUrl } from "./admin-client";

export interface PatientVisit {
  visitId: string;
  visitType: "QUEUE_VISIT" | "APPOINTMENT";
  date: string;
  displayDate?: string;
  chamberId?: string;
  chamberName?: string;
  serialNumber?: string;
  service?: string;
  status: "COMPLETED" | "ATTENDED" | "SKIPPED_ABSENT" | "CANCELLED" | "IN_CONSULTATION";
  isAttended: boolean;
  notes?: string;
  recordedAt: string;
}

export interface PersistentPatient {
  id: string;
  mrn: string;
  doctorId: string;
  doctorAccountId: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  dob?: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: string;
  status: "Active" | "In-Treatment" | "Follow-up Due" | "Discharged" | "New";
  lastVisit?: string;
  totalVisits: number;
  nextAppointment?: {
    appointmentId: string;
    date: string;
    time?: string;
    chamberName?: string;
  };
  visitHistory: PatientVisit[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientsListResponse {
  statusCode: number;
  items: PersistentPatient[];
  total: number;
  doctorId: string;
}

export interface SyncPatientsResponse {
  statusCode: number;
  success: boolean;
  message: string;
  syncedCount: number;
  newPatientsCount: number;
  updatedPatientsCount: number;
  totalPatientsInRegistry: number;
}

export interface CreatePatientPayload {
  name: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: string;
  status?: string;
  notes?: string;
}

function getDoctorAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gb_admin_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Fetches real patient records from the backend database for the authenticated doctor.
 */
export async function fetchDoctorPatients(params: {
  search?: string;
  status?: string;
  bloodGroup?: string;
  skip?: number;
  limit?: number;
} = {}): Promise<PatientsListResponse> {
  const base = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "All Status") query.set("status", params.status);
  if (params.bloodGroup && params.bloodGroup !== "All Blood Groups") query.set("bloodGroup", params.bloodGroup);
  if (params.skip !== undefined) query.set("skip", String(params.skip));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const url = `${base}/api/v1/portal/doctor/patients${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getDoctorAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch patients (${res.status})`);
  }

  return res.json();
}

/**
 * Fetches a single patient's detailed chart including visit history.
 */
export async function fetchDoctorPatientDetail(id: string): Promise<{ patient: PersistentPatient }> {
  const base = getApiBaseUrl();
  const url = `${base}/api/v1/portal/doctor/patients/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getDoctorAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch patient detail (${res.status})`);
  }

  return res.json();
}

/**
 * Manually creates or registers a new patient.
 */
export async function createDoctorPatient(payload: CreatePatientPayload): Promise<{ patient: PersistentPatient }> {
  const base = getApiBaseUrl();
  const url = `${base}/api/v1/portal/doctor/patients`;
  const res = await fetch(url, {
    method: "POST",
    headers: getDoctorAuthHeaders(),
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to register patient (${res.status})`);
  }

  return res.json();
}

/**
 * Idempotently synchronizes Live Queue tickets and online appointments into the patient registry.
 */
export async function syncDoctorLiveQueuePatients(options?: {
  chamberId?: string;
  dateKey?: string;
}): Promise<SyncPatientsResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/v1/portal/doctor/patients/sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: getDoctorAuthHeaders(),
    body: JSON.stringify(options || {}),
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to sync queue patients (${res.status})`);
  }

  return res.json();
}
