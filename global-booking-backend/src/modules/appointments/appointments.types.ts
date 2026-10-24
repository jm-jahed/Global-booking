/**
 * GLOBAL BOOKING — Persistent Patient Appointments Domain Types
 * Strict separation between persistent clinical appointments and live OPD queue tickets.
 */

export type AppointmentStatus =
  | "CONFIRMED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED";

export type AppointmentChannel = "ONLINE_WEB" | "IN_PERSON" | "PHONE";

export interface AppointmentRecord {
  id: string;
  referenceNumber: string;
  voucherId: string; // Format: ID-DDMMYYYY based on local booking date (e.g. "ID-23102026")
  bookingNumber: number; // Sequential serial starting from 1 every day per doctor
  bookingNumberDisplay: string; // e.g. "#01", "#02", "#100"
  doctorId: string;
  doctorAccountId: string;
  doctorName: string;
  doctorSpecialty: string;
  chamberId: string;
  chamberName: string;
  chamberTimezone: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | undefined;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // Visiting slot or chamber schedule
  service: string;
  status: AppointmentStatus;
  channel: AppointmentChannel;
  idempotencyKey?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuestAppointmentInput {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  chamberId?: string;
  service?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface RecoverAppointmentInput {
  referenceNumber: string;
  patientPhone: string;
}

export interface PublicAppointmentSummary {
  referenceNumber: string;
  voucherId: string; // Format: ID-DDMMYYYY
  bookingNumber: number;
  bookingNumberDisplay: string;
  doctorName: string;
  doctorSpecialty: string;
  facilityName: string;
  appointmentDate: string;
  appointmentTime: string;
  service: string;
  status: AppointmentStatus;
  patientNameMasked: string;
  patientPhoneMasked: string;
  createdAt: string;
}
