/**
 * GLOBAL BOOKING — Doctor Portal Appointments API Client
 * Retrieves persistent clinical appointments from Fastify + MongoDB backend (port 3003).
 */

import { getApiBaseUrl } from "./admin-client";
export interface BackendAppointmentItem {
  id: string;
  referenceNumber: string;
  voucherId?: string;
  bookingNumber?: number;
  bookingNumberDisplay?: string;
  doctorId: string;
  doctorAccountId?: string;
  doctorName: string;
  doctorSpecialty: string;
  chamberId: string;
  chamberName: string;
  chamberTimezone?: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  service: string;
  status: string;
  channel?: string;
  idempotencyKey?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendAppointmentResponse {
  statusCode: number;
  items: BackendAppointmentItem[];
  count: number;
  doctorId: string;
  error?: string;
  message?: string;
}

export interface FetchDoctorAppointmentsParams {
  chamberId?: string;
  appointmentDate?: string;
  status?: string;
  token?: string;
  apiBaseUrl?: string;
  fetchImplementation?: typeof fetch;
}

export async function fetchDoctorPortalAppointments(
  params?: FetchDoctorAppointmentsParams
): Promise<BackendAppointmentResponse | null> {
  try {
    const baseUrl = params?.apiBaseUrl || getApiBaseUrl();
    const query = new URLSearchParams();
    if (params?.chamberId) query.set("chamberId", params.chamberId);
    if (params?.appointmentDate) query.set("appointmentDate", params.appointmentDate);
    if (params?.status) query.set("status", params.status);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const url = `${baseUrl}/api/v1/portal/doctor/appointments${qs}`;

    const headers = new Headers({
      Accept: "application/json",
    });

    const authToken =
      params?.token ||
      (typeof window !== "undefined" ? localStorage.getItem("gb_admin_token") : null);

    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    const fetchFn = params?.fetchImplementation || fetch;
    const res = await fetchFn(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.warn(`Doctor portal appointments fetch returned status ${res.status}:`, errJson);
      return null;
    }

    return (await res.json()) as BackendAppointmentResponse;
  } catch (err) {
    console.warn("Failed to fetch doctor portal appointments:", err);
    return null;
  }
}

