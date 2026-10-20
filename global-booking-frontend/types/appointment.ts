export type AppointmentStatus =
  | "Confirmed"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type AppointmentType = "In-Person" | "Virtual Video" | "QR Walk-In";

export type PaymentStatus = "Paid" | "Pending" | "Covered by Insurance";

export interface Appointment {
  id: string;
  referenceNumber: string;
  clientName: string;
  patientName?: string;
  clientEmail: string;
  patientEmail?: string;
  clientPhone: string;
  patientPhone?: string;
  clientAvatar: string;
  patientAvatar?: string;
  service: string;
  serviceCategory: string;
  durationMinutes: number;
  price: number;
  staffName: string;
  staffRole: string;
  staffAvatar: string;
  date: string; // e.g. "2025-04-15"
  time: string; // e.g. "10:30 AM"
  endTime: string; // e.g. "11:15 AM"
  status: AppointmentStatus;
  type: AppointmentType;
  paymentStatus: PaymentStatus;
  roomOrLink?: string;
  notes?: string;
  serialNumber?: string;
}

export interface AppointmentKPIs {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
}
