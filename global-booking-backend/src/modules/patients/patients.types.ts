export type PatientClinicalStatus =
  | "Active"
  | "In-Treatment"
  | "Follow-up Due"
  | "Discharged"
  | "New";

export type BloodGroupType = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";

export interface PatientVisitRecord {
  readonly visitId: string; // Ticket ID or Appointment ID
  readonly visitType: "QUEUE_VISIT" | "APPOINTMENT";
  readonly date: string; // YYYY-MM-DD
  readonly displayDate?: string | undefined; // DD-MM-YYYY
  readonly chamberId?: string | undefined;
  readonly chamberName?: string | undefined;
  readonly serialNumber?: string | undefined; // e.g. #01, #05
  readonly service?: string | undefined;
  readonly status: "COMPLETED" | "ATTENDED" | "SKIPPED_ABSENT" | "CANCELLED" | "IN_CONSULTATION";
  readonly isAttended: boolean;
  readonly notes?: string | undefined;
  readonly recordedAt: string;
}

export interface PatientRecord {
  readonly id: string; // Unique Patient ID e.g. PT-DOC4598-1001
  readonly mrn: string; // Medical Record Number e.g. GB-MRN-0001
  readonly doctorId: string; // Clinic / Doctor tenant boundary
  readonly doctorAccountId: string;
  readonly name: string;
  readonly phone: string; // Formatted display phone
  readonly normalizedPhone: string; // Clean normalized string for tenant deduplication
  readonly email?: string | undefined;
  readonly dob?: string | undefined;
  readonly age?: number | undefined;
  readonly gender?: "Male" | "Female" | "Other" | undefined;
  readonly bloodGroup?: BloodGroupType | undefined;
  readonly status: PatientClinicalStatus;
  readonly lastVisit?: string | undefined;
  readonly totalVisits: number; // Attended visits count
  readonly nextAppointment?: {
    readonly appointmentId: string;
    readonly date: string;
    readonly time?: string | undefined;
    readonly chamberName?: string | undefined;
  } | undefined;
  readonly visitHistory: PatientVisitRecord[];
  readonly notes?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePatientBody {
  readonly name: string;
  readonly phone?: string | undefined;
  readonly email?: string | undefined;
  readonly dob?: string | undefined;
  readonly gender?: "Male" | "Female" | "Other" | undefined;
  readonly bloodGroup?: BloodGroupType | undefined;
  readonly status?: PatientClinicalStatus | undefined;
  readonly notes?: string | undefined;
}

export interface PatientQuery {
  readonly search?: string | undefined;
  readonly status?: string | undefined;
  readonly bloodGroup?: string | undefined;
  readonly limit?: number | undefined;
  readonly skip?: number | undefined;
}

export class PatientServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "PatientServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
