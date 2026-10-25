/**
 * GLOBAL BOOKING — Doctor Reports Domain Types
 * Strict typed structures for genuine persisted clinical reporting.
 */

export type ReportVisitType = "Consultation" | "Follow Up" | "Review";

export type ReportEncounterStatus = "Completed" | "In Progress" | "Scheduled" | "Cancelled";

export interface DoctorReportQuery {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly chamberId?: string;
  readonly search?: string;
  readonly visitType?: string;
  readonly status?: string;
  readonly page?: string | number;
  readonly limit?: string | number;
}

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
  readonly rawDate: string; // YYYY-MM-DD
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

export class ReportsServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "ReportsServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
