export type PatientStatus =
  | "Active"
  | "In-Treatment"
  | "Follow-up Due"
  | "Discharged"
  | "New";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";

export interface PatientVitalStats {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: string;
  bloodSugar?: string;
  weightKg?: number;
}

export interface PatientEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number e.g. "GB-PT-1042"
  name: string;
  avatar: string;
  email: string;
  phone: string;
  dob: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bloodGroup: BloodGroup;
  primaryDoctor: string;
  department: string;
  lastVisit: string;
  nextAppointment?: string;
  status: PatientStatus;
  insuranceProvider?: string;
  emergencyContact: PatientEmergencyContact;
  allergies?: string[];
  chronicConditions?: string[];
  vitals?: PatientVitalStats;
  notes?: string;
  totalAppointments: number;
  registeredDate: string;
}

export interface PatientKPIs {
  total: number;
  active: number;
  newThisWeek: number;
  followUpDue: number;
}
