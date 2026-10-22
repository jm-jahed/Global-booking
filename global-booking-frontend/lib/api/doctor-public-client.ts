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
