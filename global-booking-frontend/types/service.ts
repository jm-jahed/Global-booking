export type ServiceCategory =
  | "All Categories"
  | "General Medicine"
  | "Cardiology & Vascular"
  | "Dental & Oral Surgery"
  | "Dermatology & Aesthetics"
  | "Orthopedics & Spine"
  | "Diagnostics & Radiology"
  | "Pediatrics"
  | "Rehabilitation & Physio";

export type ServiceStatus = "Active" | "Inactive" | "Popular" | "Discontinued";

export interface ClinicalService {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMinutes: number;
  priceAED: number;
  priceUSD: number;
  status: ServiceStatus;
  insuranceCovered: boolean;
  coPayPercentage?: number;
  primarySpecialist: string;
  specialistRole: string;
  specialistAvatar: string;
  room: string;
  bookingsCount: number;
  rating: number;
  prepInstructions: string[];
  tags: string[];
}

export interface ServiceKPIs {
  total: number;
  active: number;
  avgDuration: number;
  insuranceCoveredCount: number;
}
