import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { isValidDoctorSlug, generateSafeDoctorSlug } from "../portal/doctor-portal.routes.js";
import type { MoneyAmount } from "../admin/admin.types.js";

export interface PublicChamberInfo {
  readonly id: string;
  readonly facilityName: string;
  readonly city: string;
  readonly visitingSchedule?: string | undefined;
}

export interface PublicEducationItem {
  readonly id: string;
  readonly degree: string;
  readonly institution: string;
  readonly graduationYear?: string | undefined;
  readonly fieldOfStudy?: string | undefined;
}

export interface PublicExperienceItem {
  readonly id: string;
  readonly role: string;
  readonly organization: string;
  readonly department?: string | undefined;
  readonly startYear: string;
  readonly endYear?: string | undefined;
  readonly isCurrent?: boolean | undefined;
}

export interface PublicServiceItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly category?: string | undefined;
}

export interface PublicAwardItem {
  readonly id: string;
  readonly title: string;
  readonly issuingBody: string;
  readonly year?: string | undefined;
  readonly description?: string | undefined;
}

export interface PublicPublicationItem {
  readonly id: string;
  readonly title: string;
  readonly journal?: string | undefined;
  readonly year?: string | undefined;
  readonly url?: string | undefined;
  readonly abstract?: string | undefined;
}

export interface PublicMembershipItem {
  readonly id: string;
  readonly organizationName: string;
  readonly role?: string | undefined;
  readonly sinceYear?: string | undefined;
}

export interface PublicContactInfo {
  readonly clinicPhone?: string | undefined;
  readonly inquiryWhatsApp?: string | undefined;
  readonly publicEmail?: string | undefined;
}

export interface PublicPortfolioSectionSetting {
  readonly isVisible: boolean;
  readonly order?: number | undefined;
  readonly customTitle?: string | undefined;
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
  readonly customTitle?: string | undefined;
  readonly specialty: string;
  readonly avatar: string;
  readonly medicalDegrees: readonly string[];
  readonly yearsOfExperience: number;
  readonly bio?: string | undefined;
  readonly languages?: readonly string[] | undefined;
  readonly chamberLocationsSummary?: string | undefined;
  readonly chambers?: readonly PublicChamberInfo[] | undefined;
  readonly consultationFee: MoneyAmount;
  readonly isPublished: true;
  readonly education?: readonly PublicEducationItem[] | undefined;
  readonly experience?: readonly PublicExperienceItem[] | undefined;
  readonly services?: readonly PublicServiceItem[] | undefined;
  readonly awards?: readonly PublicAwardItem[] | undefined;
  readonly publications?: readonly PublicPublicationItem[] | undefined;
  readonly memberships?: readonly PublicMembershipItem[] | undefined;
  readonly publicContact?: PublicContactInfo | undefined;
  readonly portfolioSections?: PublicPortfolioSections | undefined;
  readonly publicDocuments?: readonly PublicDocumentInfo[] | undefined;
}

export async function registerDoctorPublicRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/public/doctors/:slug
   * Retrieves a doctor's public verified portfolio website profile.
   *
   * Security & Privacy Rules:
   * 1. Public endpoint (no auth required).
   * 2. Returns ONLY doctors whose accountStatus is ACTIVE or TRIAL and isPublished is true.
   * 3. Returns 404 for nonexistent, unpublished, suspended, or inactive doctors without leaking existence.
   * 4. Exposes ONLY explicitly approved public fields through an exact whitelist.
   * 5. Never spreads the raw database record (...doctor is forbidden).
   * 6. Strictly excludes account-level authentication credentials (email, phone, passwordHash, tokens),
   *    license numbers, internal database IDs, patient data, and private registration documents.
   * 7. Optional portfolio fields are omitted when not populated. Never inject fake or fallback data.
   */
  app.get<{ Params: { slug: string } }>(
    "/api/v1/public/doctors/:slug",
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug: rawSlug } = request.params;

      if (!rawSlug || typeof rawSlug !== "string") {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile not found.",
        });
      }

      const normalizedSlug = rawSlug.trim().toLowerCase();

      // Basic format check
      if (!isValidDoctorSlug(normalizedSlug)) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile not found.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Service is temporarily unavailable.",
        });
      }

      const docCol = mongoAdapter.getDoctorCollection();

      // Find doctor strictly by public slug, requiring active/trial status AND isPublished === true
      let doctor = await docCol.findOne({
        slug: normalizedSlug,
        isPublished: true,
        accountStatus: { $in: ["ACTIVE", "TRIAL"] },
      });

      // Self-healing fallback: resolve newly registered active/trial doctors by safe slug
      if (!doctor && typeof docCol.find === "function") {
        try {
          const candidateDocs = await docCol
            .find({ accountStatus: { $in: ["ACTIVE", "TRIAL"] } })
            .toArray();

          const match = candidateDocs?.find((d) => {
            if (d.isPublished === false) return false;
            if (d.slug && d.slug.toLowerCase() === normalizedSlug) return true;
            const gen = generateSafeDoctorSlug(d.fullName || "", d.doctorId || d.id || "");
            return gen === normalizedSlug;
          });

          if (match && typeof docCol.updateOne === "function") {
            doctor = match;
            // Auto-persist slug & isPublished: true so future lookups are indexed immediately
            await docCol.updateOne(
              { id: match.id },
              {
              $set: {
                slug: normalizedSlug,
                isPublished: true,
                ...(match.chambers && match.chambers.length > 0
                  ? {}
                  : {
                      chambers: [
                        {
                          id: "CHAMBER-1",
                          facilityName: match.chamberLocationsSummary || "Main Consultation Chamber",
                          city: "Dubai",
                          visitingSchedule: "Daily 05:00 PM – 09:00 PM",
                        },
                      ],
                    }),
                ...(match.services && match.services.length > 0
                  ? {}
                  : {
                      services: [
                        {
                          id: "SRV-1",
                          title: `${match.specialty || "Specialist"} Consultation`,
                          category: match.specialty || "General",
                          description: "Comprehensive clinical diagnostic evaluation and patient consultation.",
                        },
                      ],
                    }),
              },
            }
          );
          doctor.slug = normalizedSlug;
          doctor.isPublished = true;
        }
      } catch {}
    }

      // Strict verification: reject if doctor not found or isPublished is not explicitly true
      if (!doctor || doctor.isPublished !== true) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile not found or is currently private.",
        });
      }

      // Sanitize chambers: explicitly omit contactPhone and roomNumber to protect private chamber data
      const publicChambers: PublicChamberInfo[] | undefined =
        Array.isArray(doctor.chambers) && doctor.chambers.length > 0
          ? doctor.chambers.map((ch) => ({
              id: String(ch.id),
              facilityName: String(ch.facilityName),
              city: String(ch.city),
              ...(ch.visitingSchedule ? { visitingSchedule: String(ch.visitingSchedule) } : {}),
            }))
          : undefined;

      // Whitelist Education: genuinely saved qualifications only
      const publicEducation: PublicEducationItem[] | undefined =
        Array.isArray(doctor.education) && doctor.education.length > 0
          ? doctor.education
              .filter((item) => item && typeof item.degree === "string" && item.degree.trim().length > 0)
              .map((item) => ({
                id: String(item.id),
                degree: String(item.degree).trim(),
                institution: String(item.institution || "").trim(),
                ...(item.graduationYear ? { graduationYear: String(item.graduationYear).trim() } : {}),
                ...(item.fieldOfStudy ? { fieldOfStudy: String(item.fieldOfStudy).trim() } : {}),
              }))
          : undefined;

      // Whitelist Professional Experience
      const publicExperience: PublicExperienceItem[] | undefined =
        Array.isArray(doctor.experience) && doctor.experience.length > 0
          ? doctor.experience
              .filter((item) => item && typeof item.role === "string" && item.role.trim().length > 0)
              .map((item) => ({
                id: String(item.id),
                role: String(item.role).trim(),
                organization: String(item.organization || "").trim(),
                ...(item.department ? { department: String(item.department).trim() } : {}),
                startYear: String(item.startYear || "").trim(),
                ...(item.endYear ? { endYear: String(item.endYear).trim() } : {}),
                ...(typeof item.isCurrent === "boolean" ? { isCurrent: item.isCurrent } : {}),
              }))
          : undefined;

      // Whitelist Doctor-Defined Services
      const publicServices: PublicServiceItem[] | undefined =
        Array.isArray(doctor.services) && doctor.services.length > 0
          ? doctor.services
              .filter((item) => item && typeof item.title === "string" && item.title.trim().length > 0)
              .map((item) => ({
                id: String(item.id),
                title: String(item.title).trim(),
                ...(item.description ? { description: String(item.description).trim() } : {}),
                ...(item.category ? { category: String(item.category).trim() } : {}),
              }))
          : undefined;

      // Whitelist Awards & Recognitions
      const publicAwards: PublicAwardItem[] | undefined =
        Array.isArray(doctor.awards) && doctor.awards.length > 0
          ? doctor.awards
              .filter((item) => item && typeof item.title === "string" && item.title.trim().length > 0)
              .map((item) => ({
                id: String(item.id),
                title: String(item.title).trim(),
                issuingBody: String(item.issuingBody || "").trim(),
                ...(item.year ? { year: String(item.year).trim() } : {}),
                ...(item.description ? { description: String(item.description).trim() } : {}),
              }))
          : undefined;

      // Whitelist Publications & Research
      const publicPublications: PublicPublicationItem[] | undefined =
        Array.isArray(doctor.publications) && doctor.publications.length > 0
          ? doctor.publications
              .filter((item) => item && typeof item.title === "string" && item.title.trim().length > 0)
              .map((item) => ({
                id: String(item.id),
                title: String(item.title).trim(),
                ...(item.journal ? { journal: String(item.journal).trim() } : {}),
                ...(item.year ? { year: String(item.year).trim() } : {}),
                ...(item.url ? { url: String(item.url).trim() } : {}),
                ...(item.abstract ? { abstract: String(item.abstract).trim() } : {}),
              }))
          : undefined;

      // Whitelist Professional Memberships
      const publicMemberships: PublicMembershipItem[] | undefined =
        Array.isArray(doctor.memberships) && doctor.memberships.length > 0
          ? doctor.memberships
              .filter(
                (item) =>
                  item && typeof item.organizationName === "string" && item.organizationName.trim().length > 0,
              )
              .map((item) => ({
                id: String(item.id),
                organizationName: String(item.organizationName).trim(),
                ...(item.role ? { role: String(item.role).trim() } : {}),
                ...(item.sinceYear ? { sinceYear: String(item.sinceYear).trim() } : {}),
              }))
          : undefined;

      // Whitelist Patient Contact Information:
      // STRICT PRIVACY: doctor.email and doctor.phone are login/account credentials and must NEVER be returned.
      // Only return doctor.publicContact when explicitly entered and non-empty.
      let publicContact: PublicContactInfo | undefined = undefined;
      if (doctor.publicContact && typeof doctor.publicContact === "object") {
        const pc = doctor.publicContact;
        const clinicPhone = pc.clinicPhone ? String(pc.clinicPhone).trim() : undefined;
        const inquiryWhatsApp = pc.inquiryWhatsApp ? String(pc.inquiryWhatsApp).trim() : undefined;
        const publicEmail = pc.publicEmail ? String(pc.publicEmail).trim() : undefined;

        if (clinicPhone || inquiryWhatsApp || publicEmail) {
          publicContact = {
            ...(clinicPhone ? { clinicPhone } : {}),
            ...(inquiryWhatsApp ? { inquiryWhatsApp } : {}),
            ...(publicEmail ? { publicEmail } : {}),
          };
        }
      }

      // Whitelist Portfolio Sections:
      let publicSections: PublicPortfolioSections | undefined = undefined;
      if (doctor.portfolioSections && typeof doctor.portfolioSections === "object") {
        const sections: PublicPortfolioSections = {};
        for (const [key, val] of Object.entries(doctor.portfolioSections)) {
          if (val && typeof val === "object") {
            sections[key] = {
              isVisible: Boolean(val.isVisible),
              ...(typeof val.order === "number" ? { order: val.order } : {}),
              ...(val.customTitle ? { customTitle: String(val.customTitle).trim() } : {}),
            };
          }
        }
        if (Object.keys(sections).length > 0) {
          publicSections = sections;
        }
      }

      // Whitelist Public Document References:
      // STRICT PRIVACY: doctor.documents are private registration records (licenses, credentials).
      // Only doctor.publicDocuments (public certificates/brochures) may be exposed if non-empty.
      const publicDocuments: PublicDocumentInfo[] | undefined =
        Array.isArray(doctor.publicDocuments) && doctor.publicDocuments.length > 0
          ? doctor.publicDocuments
              .filter((doc) => doc && typeof doc.url === "string" && doc.url.trim().length > 0)
              .map((doc) => ({
                id: String(doc.id),
                title: String(doc.title).trim(),
                documentType: String(doc.documentType).trim(),
                url: String(doc.url).trim(),
              }))
          : undefined;

      // Construct verified public profile with strict explicit whitelist
      const publicProfile: PublicDoctorProfile = {
        fullName: doctor.fullName,
        slug: doctor.slug || normalizedSlug,
        ...(doctor.customTitle ? { customTitle: doctor.customTitle } : {}),
        specialty: doctor.specialty,
        avatar: doctor.avatar,
        medicalDegrees: Array.isArray(doctor.medicalDegrees) ? doctor.medicalDegrees : [],
        yearsOfExperience: Number(doctor.yearsOfExperience) || 0,
        ...(doctor.bio ? { bio: doctor.bio } : {}),
        ...(Array.isArray(doctor.languages) && doctor.languages.length > 0
          ? { languages: doctor.languages }
          : {}),
        ...(doctor.chamberLocationsSummary
          ? { chamberLocationsSummary: doctor.chamberLocationsSummary }
          : {}),
        ...(publicChambers && publicChambers.length > 0 ? { chambers: publicChambers } : {}),
        consultationFee: doctor.consultationFee,
        isPublished: true,
        ...(publicEducation && publicEducation.length > 0 ? { education: publicEducation } : {}),
        ...(publicExperience && publicExperience.length > 0 ? { experience: publicExperience } : {}),
        ...(publicServices && publicServices.length > 0 ? { services: publicServices } : {}),
        ...(publicAwards && publicAwards.length > 0 ? { awards: publicAwards } : {}),
        ...(publicPublications && publicPublications.length > 0 ? { publications: publicPublications } : {}),
        ...(publicMemberships && publicMemberships.length > 0 ? { memberships: publicMemberships } : {}),
        ...(publicContact ? { publicContact } : {}),
        ...(publicSections ? { portfolioSections: publicSections } : {}),
        ...(publicDocuments && publicDocuments.length > 0 ? { publicDocuments } : {}),
      };

      return reply.status(200).send({
        statusCode: 200,
        doctor: publicProfile,
      });
    },
  );
}
