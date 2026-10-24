import { getApiBaseUrl } from "./admin-client";

export interface PublicChamberInfo {
  readonly id: string;
  readonly facilityName: string;
  readonly city: string;
  readonly visitingSchedule?: string;
}

export interface PublicServiceItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly category?: string;
}

export interface PublicEducationItem {
  readonly id: string;
  readonly degree: string;
  readonly institution: string;
  readonly graduationYear?: string;
  readonly fieldOfStudy?: string;
}

export interface PublicExperienceItem {
  readonly id: string;
  readonly role: string;
  readonly organization: string;
  readonly department?: string;
  readonly startYear: string;
  readonly endYear?: string;
  readonly isCurrent?: boolean;
}

export interface PublicAwardItem {
  readonly id: string;
  readonly title: string;
  readonly issuingBody: string;
  readonly year?: string;
  readonly description?: string;
}

export interface PublicPublicationItem {
  readonly id: string;
  readonly title: string;
  readonly journal?: string;
  readonly year?: string;
  readonly url?: string;
  readonly abstract?: string;
}

export interface PublicMembershipItem {
  readonly id: string;
  readonly organizationName: string;
  readonly role?: string;
  readonly sinceYear?: string;
}

export interface PublicContactInfo {
  readonly clinicPhone?: string;
  readonly inquiryWhatsApp?: string;
  readonly publicEmail?: string;
}

export interface PublicPortfolioSectionSetting {
  readonly isVisible: boolean;
  readonly order?: number;
  readonly customTitle?: string;
}

export type PublicPortfolioSections = Record<string, PublicPortfolioSectionSetting>;

export interface PublicDocumentInfo {
  readonly id: string;
  readonly title: string;
  readonly documentType: string;
  readonly url: string;
}

export interface PublicDoctorProfile {
  readonly fullName: string;
  readonly slug: string;
  readonly customTitle?: string;
  readonly specialty: string;
  readonly avatar: string;
  readonly medicalDegrees: readonly string[];
  readonly yearsOfExperience: number;
  readonly bio?: string;
  readonly languages?: readonly string[];
  readonly chamberLocationsSummary?: string;
  readonly chambers?: readonly PublicChamberInfo[];
  readonly consultationFee: {
    readonly amount?: number;
    readonly currency?: string;
    readonly amountInFils?: number;
    readonly formatted?: string;
  };
  readonly isPublished: true;
  readonly education?: readonly PublicEducationItem[];
  readonly experience?: readonly PublicExperienceItem[];
  readonly services?: readonly PublicServiceItem[];
  readonly awards?: readonly PublicAwardItem[];
  readonly publications?: readonly PublicPublicationItem[];
  readonly memberships?: readonly PublicMembershipItem[];
  readonly publicContact?: PublicContactInfo;
  readonly portfolioSections?: PublicPortfolioSections;
  readonly publicDocuments?: readonly PublicDocumentInfo[];
}

export interface GetPublicDoctorResponse {
  readonly statusCode: number;
  readonly doctor?: PublicDoctorProfile;
  readonly error?: string;
  readonly message?: string;
}

/**
 * Fetch public doctor verified portfolio from the Fastify backend.
 * Returns null if the doctor is not found, private, or inactive (404).
 */
export async function getPublicDoctorProfile(
  slug: string
): Promise<PublicDoctorProfile | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/public/doctors/${encodeURIComponent(cleanSlug)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 }, // Cache with revalidation
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as GetPublicDoctorResponse;
    if (json?.doctor && json.doctor.isPublished) {
      return json.doctor;
    }

    return null;
  } catch (err) {
    // Graceful error handling - never leak or crash
    console.error("Failed to load public doctor profile:", err);
    return null;
  }
}

export interface PublicBookDoctorPayload {
  readonly patientName: string;
  readonly patientPhone: string;
  readonly chamberId?: string;
  readonly service?: string;
  readonly date?: string;
  readonly time?: string;
  readonly notes?: string;
}

export interface PublicQueueTicket {
  readonly id: string;
  readonly ticketNumber: string;
  readonly serialIndex: number;
  readonly patientName: string;
  readonly status: string;
  readonly service: string;
  readonly checkInTime?: string;
  readonly channel?: string;
}

export interface PublicDoctorQueueStatus {
  readonly statusCode: number;
  readonly chamberName: string;
  readonly chamberTimezone: string;
  readonly dateKey: string;
  readonly servingTicket: {
    readonly ticketNumber: string;
    readonly patientName: string;
    readonly service: string;
  } | null;
  readonly nextTicket?: {
    readonly ticketNumber: string;
    readonly patientName: string;
    readonly service: string;
  } | null;
  readonly totalWaiting: number;
  readonly totalServed: number;
  readonly tickets: readonly PublicQueueTicket[];
}

export interface PublicBookDoctorResponse {
  readonly statusCode: number;
  readonly success: boolean;
  readonly ticket?: PublicQueueTicket;
  readonly isReplay?: boolean;
  readonly message?: string;
  readonly error?: string;
}

/**
 * Submits an online patient booking directly to the doctor's database queue.
 * Atomically generates the next daily serial and saves to MongoDB.
 */
export async function bookDoctorPublicAppointment(
  slug: string,
  payload: PublicBookDoctorPayload
): Promise<{ success: boolean; ticket?: PublicQueueTicket; error?: string }> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return { success: false, error: "Invalid doctor slug." };

  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/public/doctors/${encodeURIComponent(cleanSlug)}/book`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as PublicBookDoctorResponse;

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.message || json.error || `Booking failed (${res.status})`,
      };
    }

    return { success: true, ticket: json.ticket };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error. Please try again.",
    };
  }
}

/**
 * Retrieves the current live queue state for the doctor's chamber directly from MongoDB.
 */
export async function getDoctorPublicQueueStatus(
  slug: string,
  chamberId?: string
): Promise<PublicDoctorQueueStatus | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  try {
    const baseUrl = getApiBaseUrl();
    const query = chamberId ? `?chamberId=${encodeURIComponent(chamberId)}` : "";
    const url = `${baseUrl}/api/v1/public/doctors/${encodeURIComponent(cleanSlug)}/queue-status${query}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as PublicDoctorQueueStatus;
  } catch (err) {
    console.error("Failed to fetch public queue status:", err);
    return null;
  }
}

export interface PublicAppointmentRecord {
  readonly id: string;
  readonly referenceNumber: string;
  readonly voucherId?: string;
  readonly bookingNumber?: number;
  readonly bookingNumberDisplay?: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly doctorSpecialty: string;
  readonly chamberId: string;
  readonly chamberName: string;
  readonly patientName: string;
  readonly patientPhone: string;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly service: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface PublicAppointmentSummary {
  readonly referenceNumber: string;
  readonly voucherId?: string;
  readonly bookingNumber?: number;
  readonly bookingNumberDisplay?: string;
  readonly doctorName: string;
  readonly doctorSpecialty: string;
  readonly facilityName: string;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly service: string;
  readonly status: string;
  readonly patientNameMasked: string;
  readonly patientPhoneMasked: string;
  readonly createdAt: string;
}

export interface CreateGuestAppointmentPayload {
  readonly patientName: string;
  readonly patientPhone: string;
  readonly patientEmail?: string;
  readonly chamberId?: string;
  readonly service?: string;
  readonly appointmentDate?: string;
  readonly appointmentTime?: string;
  readonly idempotencyKey?: string;
  readonly notes?: string;
}

/**
 * Creates a persistent clinical appointment for guest patients.
 * Saved permanently in MongoDB appointments collection with unique reference.
 * Completely decoupled from live OPD queue tickets.
 */
export async function createGuestDoctorAppointment(
  slug: string,
  payload: CreateGuestAppointmentPayload
): Promise<{ success: boolean; appointment?: PublicAppointmentRecord; isReplay?: boolean; error?: string }> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return { success: false, error: "Invalid doctor slug." };

  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/public/doctors/${encodeURIComponent(cleanSlug)}/appointments`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.message || json.error || `Appointment booking failed (${res.status})`,
      };
    }

    return { success: true, appointment: json.appointment, isReplay: json.isReplay };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error. Please try again.",
    };
  }
}

/**
 * Recovers a guest patient appointment securely by reference number + complete phone number.
 * Body is sent via POST to avoid phone numbers appearing in browser history or URLs.
 */
export async function recoverGuestDoctorAppointment(payload: {
  referenceNumber: string;
  patientPhone: string;
}): Promise<{ success: boolean; appointment?: PublicAppointmentSummary; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/public/appointments/recover`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.message || "Invalid booking reference or verification details.",
      };
    }

    return { success: true, appointment: json.appointment };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error connecting to booking recovery service.",
    };
  }
}

