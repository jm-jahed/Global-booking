/**
 * GLOBAL BOOKING — Doctor Portal Appointments API Client
 * Retrieves persistent clinical appointments from Fastify + MongoDB backend (port 3003).
 */

import { getApiBaseUrl } from "./admin-client";
import type { PublicAppointmentRecord } from "./doctor-public-client";

export interface BackendAppointmentResponse {
  statusCode: number;
  items: PublicAppointmentRecord[];
  count: number;
  doctorId: string;
}

export async function fetchDoctorPortalAppointments(params?: {
  chamberId?: string;
  appointmentDate?: string;
  status?: string;
}): Promise<BackendAppointmentResponse | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const query = new URLSearchParams();
    if (params?.chamberId) query.set("chamberId", params.chamberId);
    if (params?.appointmentDate) query.set("appointmentDate", params.appointmentDate);
    if (params?.status) query.set("status", params.status);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const url = `${baseUrl}/api/v1/portal/doctor/appointments${qs}`;

    const headers = new Headers({
      Accept: "application/json",
    });

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("gb_admin_token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as BackendAppointmentResponse;
  } catch (err) {
    console.warn("Failed to fetch doctor portal appointments:", err);
    return null;
  }
}
