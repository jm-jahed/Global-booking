import { getApiBaseUrl } from "./admin-client";

export type ReportVisitType = "Consultation" | "Follow Up" | "Review";
export type ReportEncounterStatus = "Completed" | "In Progress" | "Scheduled" | "Cancelled";

export interface DoctorReportSummary {
  readonly totalVisits: number;
  readonly totalPatients: number;
  readonly followUpVisits: number;
  readonly newPatientVisits: number;
  readonly averageIntervalDays: number | null;
  readonly hasSufficientIntervalData: boolean;
}

export interface VisitTrendPoint {
  readonly date: string; // YYYY-MM-DD
  readonly displayDate: string; // e.g. "01 Oct"
  readonly totalVisits: number;
  readonly newPatients: number;
  readonly followUps: number;
}

export interface VisitTypeDistribution {
  readonly consultationCount: number;
  readonly consultationPct: number;
  readonly followUpCount: number;
  readonly followUpPct: number;
  readonly reviewCount: number;
  readonly reviewPct: number;
  readonly hasData: boolean;
}

export interface DoctorReportEncounterItem {
  readonly id: string;
  readonly serialNumber: string;
  readonly mrn: string;
  readonly patientName: string;
  readonly phone: string;
  readonly visitType: ReportVisitType;
  readonly dateTime: string;
  readonly rawDate: string;
  readonly doctorName: string;
  readonly service: string;
  readonly status: ReportEncounterStatus;
  readonly feeAed: number;
  readonly source: "QUEUE" | "APPOINTMENT";
}

export interface DoctorReportsResponse {
  readonly statusCode: number;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly dateRange: {
    readonly startDate: string;
    readonly endDate: string;
  };
  readonly summary: DoctorReportSummary;
  readonly visitTrend: VisitTrendPoint[];
  readonly visitTypeBreakdown: VisitTypeDistribution;
  readonly encounters: {
    readonly items: DoctorReportEncounterItem[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
  };
}

export interface FetchDoctorReportsParams {
  startDate?: string;
  endDate?: string;
  chamberId?: string;
  search?: string;
  visitType?: string;
  status?: string;
  page?: number;
  limit?: number;
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
 * Fetches real aggregated clinical reports from backend MongoDB collections.
 */
export async function fetchDoctorReports(
  params: FetchDoctorReportsParams = {},
): Promise<DoctorReportsResponse> {
  const base = getApiBaseUrl();
  const query = new URLSearchParams();

  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.chamberId) query.set("chamberId", params.chamberId);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.visitType && params.visitType !== "ALL") query.set("visitType", params.visitType);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const url = `${base}/api/v1/portal/doctor/reports${query.toString() ? `?${query.toString()}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getDoctorAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to fetch reports (HTTP ${res.status})`);
  }

  return res.json();
}
