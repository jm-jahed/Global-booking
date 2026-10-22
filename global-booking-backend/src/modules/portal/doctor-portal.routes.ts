import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { formatAedAmount } from "../admin/subscription.service.js";
import { sanitizeDoctorProfile } from "../admin/doctors.routes.js";
import { isValidIanaTimezone } from "../queue/queue.timezone.js";
import type {
  DoctorRecord,
  SafeDoctorProfile,
  DoctorChamberDetail,
  MoneyAmount,
  DoctorEducationItem,
  DoctorExperienceItem,
  DoctorServiceItem,
  DoctorAwardItem,
  DoctorPublicationItem,
  DoctorMembershipItem,
  DoctorPublicContact,
  DoctorPortfolioSections,
  DoctorPublicDocumentRef,
} from "../admin/admin.types.js";

/**
 * Normalizes a doctor's name and entity ID into a URL-safe kebab-case slug.
 * e.g. "Dr. Sarah Khan", "DOC-701" -> "dr-sarah-khan"
 */
export function generateSafeDoctorSlug(fullName: string, doctorId: string): string {
  const baseSlug = fullName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word characters (periods, quotes, etc.)
    .replace(/\s+/g, "-")     // Convert spaces to hyphens
    .replace(/-+/g, "-")      // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens

  if (!baseSlug) {
    return doctorId.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  return baseSlug;
}

export function isValidDoctorSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 80;
}

export interface UpdateDoctorProfileBody {
  fullName?: string | undefined;
  specialty?: string | undefined;
  bio?: string | undefined;
  avatar?: string | undefined;
  yearsOfExperience?: number | undefined;
  medicalDegrees?: string[] | undefined;
  chamberLocationsSummary?: string | undefined;
  consultationFeeAed?: number | undefined;
  languages?: string[] | undefined;
  chambers?: DoctorChamberDetail[] | undefined;
  slug?: string | undefined;
  isPublished?: boolean | undefined;
  customTitle?: string | undefined;
  services?: DoctorServiceItem[] | undefined;
  education?: DoctorEducationItem[] | undefined;
  experience?: DoctorExperienceItem[] | undefined;
  awards?: DoctorAwardItem[] | undefined;
  publications?: DoctorPublicationItem[] | undefined;
  memberships?: DoctorMembershipItem[] | undefined;
  publicContact?: DoctorPublicContact | undefined;
  portfolioSections?: DoctorPortfolioSections | undefined;
  publicDocuments?: DoctorPublicDocumentRef[] | undefined;
}

export async function registerDoctorPortalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/portal/doctor/profile
   * Retrieves the authenticated Doctor's own persistent profile.
   * Strictly enforces session role === "DOCTOR" and uses verified account ID.
   */
  app.get(
    "/api/v1/portal/doctor/profile",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.adminUser;

      if (!session) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Authentication required to access doctor profile.",
        });
      }

      if (session.role !== "DOCTOR") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Access restricted to verified Doctor accounts.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const docCol = mongoAdapter.getDoctorCollection();
      const doctor = await docCol.findOne({ id: session.adminId });

      if (!doctor) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile record not found.",
        });
      }

      if (doctor.accountStatus === "SUSPENDED") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "This Doctor account is suspended. Please contact platform administration.",
        });
      }

      // If slug has not yet been explicitly persisted, generate safe default
      const effectiveSlug = doctor.slug || generateSafeDoctorSlug(doctor.fullName, doctor.doctorId);
      const safeProfile: SafeDoctorProfile = {
        ...sanitizeDoctorProfile(doctor),
        slug: effectiveSlug,
      };

      return reply.status(200).send({
        statusCode: 200,
        doctor: safeProfile,
      });
    },
  );

  /**
   * PATCH /api/v1/portal/doctor/profile
   * Updates the authenticated Doctor's own persistent profile in MongoDB.
   * Resolves the target doctor solely from verified session.adminId.
   */
  app.patch<{ Body: UpdateDoctorProfileBody }>(
    "/api/v1/portal/doctor/profile",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Body: UpdateDoctorProfileBody }>, reply: FastifyReply) => {
      const session = request.adminUser;

      if (!session) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Authentication required.",
        });
      }

      if (session.role !== "DOCTOR") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Access restricted to verified Doctor accounts.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const docCol = mongoAdapter.getDoctorCollection();
      const currentDoctor = await docCol.findOne({ id: session.adminId });

      if (!currentDoctor) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile record not found.",
        });
      }

      if (currentDoctor.accountStatus === "SUSPENDED") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Cannot modify profile while account is suspended.",
        });
      }

      const body = request.body || {};
      const updates: Partial<DoctorRecord> = {};

      // 1. Full Name validation
      if (body.fullName !== undefined) {
        const trimmedName = String(body.fullName).trim();
        if (trimmedName.length < 2 || trimmedName.length > 100) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Doctor full name must be between 2 and 100 characters.",
          });
        }
        updates.fullName = trimmedName;
      }

      // 2. Specialty validation
      if (body.specialty !== undefined) {
        const trimmedSpecialty = String(body.specialty).trim();
        if (trimmedSpecialty.length < 2 || trimmedSpecialty.length > 100) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Specialty must be between 2 and 100 characters.",
          });
        }
        updates.specialty = trimmedSpecialty;
      }

      // 3. Biography validation
      if (body.bio !== undefined) {
        const trimmedBio = String(body.bio).trim();
        if (trimmedBio.length > 3000) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Biography must not exceed 3,000 characters.",
          });
        }
        updates.bio = trimmedBio;
      }

      // 4. Avatar URL validation
      if (body.avatar !== undefined) {
        const trimmedAvatar = String(body.avatar).trim();
        if (trimmedAvatar && !trimmedAvatar.startsWith("http://") && !trimmedAvatar.startsWith("https://") && !trimmedAvatar.startsWith("/")) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Avatar must be a valid HTTP/HTTPS URL or root-relative path.",
          });
        }
        updates.avatar = trimmedAvatar;
      }

      // 5. Years of Experience validation
      if (body.yearsOfExperience !== undefined) {
        const exp = Number(body.yearsOfExperience);
        if (!Number.isInteger(exp) || exp < 0 || exp > 70) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Years of experience must be an integer between 0 and 70.",
          });
        }
        updates.yearsOfExperience = exp;
      }

      // 6. Medical Degrees & Qualifications validation
      if (body.medicalDegrees !== undefined) {
        if (!Array.isArray(body.medicalDegrees)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "medicalDegrees must be an array of strings.",
          });
        }
        const cleanedDegrees = body.medicalDegrees
          .map((deg) => String(deg).trim())
          .filter((deg) => deg.length > 0);

        if (cleanedDegrees.some((deg) => deg.length > 60)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Each degree or credential must not exceed 60 characters.",
          });
        }
        updates.medicalDegrees = cleanedDegrees;
      }

      // 7. Consultation Fee validation (in AED)
      if (body.consultationFeeAed !== undefined) {
        const fee = Number(body.consultationFeeAed);
        if (Number.isNaN(fee) || fee < 0 || fee > 50000) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Consultation fee must be a valid amount between 0 and 50,000 AED.",
          });
        }
        const newFee: MoneyAmount = formatAedAmount(fee);
        updates.consultationFee = newFee;
      }

      // 8. Chamber Locations Summary validation
      if (body.chamberLocationsSummary !== undefined) {
        updates.chamberLocationsSummary = String(body.chamberLocationsSummary).trim().slice(0, 300);
      }

      // 9. Structured Chambers list validation
      if (body.chambers !== undefined) {
        if (!Array.isArray(body.chambers)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "chambers must be an array of chamber objects.",
          });
        }

        for (const ch of body.chambers) {
          if (ch.timezone !== undefined && ch.timezone !== null && ch.timezone !== "") {
            if (!isValidIanaTimezone(ch.timezone)) {
              return reply.status(400).send({
                statusCode: 400,
                error: "Bad Request",
                message: `Invalid IANA timezone specified for chamber: '${String(ch.timezone)}'. Example valid timezones: 'Asia/Dhaka', 'Asia/Dubai'.`,
              });
            }
          }
        }

        const cleanedChambers: DoctorChamberDetail[] = body.chambers.map((ch, idx) => ({
          id: String(ch.id || `CH-${idx + 1}`).trim(),
          facilityName: String(ch.facilityName || "").trim().slice(0, 100),
          city: String(ch.city || "").trim().slice(0, 50),
          address: ch.address ? String(ch.address).trim().slice(0, 200) : undefined,
          roomNumber: ch.roomNumber ? String(ch.roomNumber).trim().slice(0, 40) : undefined,
          visitingSchedule: ch.visitingSchedule ? String(ch.visitingSchedule).trim().slice(0, 120) : undefined,
          contactPhone: ch.contactPhone ? String(ch.contactPhone).trim().slice(0, 30) : undefined,
          timezone: ch.timezone ? String(ch.timezone).trim() : undefined,
        })).filter((ch) => ch.facilityName.length > 0);

        updates.chambers = cleanedChambers;
      }

      // 10. Languages spoken validation
      if (body.languages !== undefined) {
        if (!Array.isArray(body.languages)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "languages must be an array of strings.",
          });
        }
        updates.languages = body.languages
          .map((lang) => String(lang).trim())
          .filter((lang) => lang.length > 0 && lang.length <= 40)
          .slice(0, 15);
      }

      // 11. Slug validation & collision detection
      if (body.slug !== undefined) {
        const candidateSlug = String(body.slug).trim().toLowerCase();
        if (!isValidDoctorSlug(candidateSlug)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Doctor slug must contain only lowercase alphanumeric characters and hyphens (2-80 chars).",
          });
        }

        // Check if another doctor already holds this slug
        const collision = await docCol.findOne({
          slug: candidateSlug,
          id: { $ne: currentDoctor.id },
        });

        if (collision) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: `Public URL slug '${candidateSlug}' is already taken by another practitioner.`,
          });
        }

        updates.slug = candidateSlug;
      }

      // 12. Visibility toggle (isPublished)
      if (body.isPublished !== undefined) {
        updates.isPublished = Boolean(body.isPublished);
      }

      // 13. Custom professional title
      if (body.customTitle !== undefined) {
        updates.customTitle = String(body.customTitle).trim().slice(0, 120);
      }

      // 14. Doctor Services
      if (body.services !== undefined) {
        if (Array.isArray(body.services)) {
          updates.services = body.services
            .filter((s) => s && typeof s.title === "string" && s.title.trim().length > 0)
            .map((s, idx) => ({
              id: String(s.id || `SRV-${idx + 1}`).trim(),
              title: String(s.title).trim().slice(0, 100),
              description: s.description ? String(s.description).trim().slice(0, 300) : undefined,
              category: s.category ? String(s.category).trim().slice(0, 60) : undefined,
            }));
        }
      }

      // 15. Education
      if (body.education !== undefined) {
        if (Array.isArray(body.education)) {
          updates.education = body.education
            .filter((e) => e && typeof e.degree === "string" && e.degree.trim().length > 0)
            .map((e, idx) => ({
              id: String(e.id || `EDU-${idx + 1}`).trim(),
              degree: String(e.degree).trim().slice(0, 100),
              institution: String(e.institution || "").trim().slice(0, 150),
              graduationYear: e.graduationYear ? String(e.graduationYear).trim().slice(0, 10) : undefined,
              fieldOfStudy: e.fieldOfStudy ? String(e.fieldOfStudy).trim().slice(0, 100) : undefined,
            }));
        }
      }

      // 16. Professional Experience
      if (body.experience !== undefined) {
        if (Array.isArray(body.experience)) {
          updates.experience = body.experience
            .filter((exp) => exp && typeof exp.role === "string" && exp.role.trim().length > 0)
            .map((exp, idx) => ({
              id: String(exp.id || `EXP-${idx + 1}`).trim(),
              role: String(exp.role).trim().slice(0, 100),
              organization: String(exp.organization || "").trim().slice(0, 150),
              department: exp.department ? String(exp.department).trim().slice(0, 100) : undefined,
              startYear: String(exp.startYear || "").trim().slice(0, 10),
              endYear: exp.endYear ? String(exp.endYear).trim().slice(0, 10) : undefined,
              isCurrent: typeof exp.isCurrent === "boolean" ? exp.isCurrent : undefined,
            }));
        }
      }

      // 17. Awards & Honors
      if (body.awards !== undefined) {
        if (Array.isArray(body.awards)) {
          updates.awards = body.awards
            .filter((a) => a && typeof a.title === "string" && a.title.trim().length > 0)
            .map((a, idx) => ({
              id: String(a.id || `AWD-${idx + 1}`).trim(),
              title: String(a.title).trim().slice(0, 120),
              issuingBody: String(a.issuingBody || "").trim().slice(0, 150),
              year: a.year ? String(a.year).trim().slice(0, 10) : undefined,
              description: a.description ? String(a.description).trim().slice(0, 300) : undefined,
            }));
        }
      }

      // 18. Publications
      if (body.publications !== undefined) {
        if (Array.isArray(body.publications)) {
          updates.publications = body.publications
            .filter((p) => p && typeof p.title === "string" && p.title.trim().length > 0)
            .map((p, idx) => ({
              id: String(p.id || `PUB-${idx + 1}`).trim(),
              title: String(p.title).trim().slice(0, 200),
              journal: p.journal ? String(p.journal).trim().slice(0, 150) : undefined,
              year: p.year ? String(p.year).trim().slice(0, 10) : undefined,
              url: p.url ? String(p.url).trim().slice(0, 300) : undefined,
              abstract: p.abstract ? String(p.abstract).trim().slice(0, 1000) : undefined,
            }));
        }
      }

      // 19. Memberships
      if (body.memberships !== undefined) {
        if (Array.isArray(body.memberships)) {
          updates.memberships = body.memberships
            .filter((m) => m && typeof m.organizationName === "string" && m.organizationName.trim().length > 0)
            .map((m, idx) => ({
              id: String(m.id || `MEM-${idx + 1}`).trim(),
              organizationName: String(m.organizationName).trim().slice(0, 150),
              role: m.role ? String(m.role).trim().slice(0, 100) : undefined,
              sinceYear: m.sinceYear ? String(m.sinceYear).trim().slice(0, 10) : undefined,
            }));
        }
      }

      // 20. Public Patient Contact Information
      if (body.publicContact !== undefined) {
        if (body.publicContact && typeof body.publicContact === "object") {
          updates.publicContact = {
            clinicPhone: body.publicContact.clinicPhone ? String(body.publicContact.clinicPhone).trim().slice(0, 40) : undefined,
            inquiryWhatsApp: body.publicContact.inquiryWhatsApp ? String(body.publicContact.inquiryWhatsApp).trim().slice(0, 40) : undefined,
            publicEmail: body.publicContact.publicEmail ? String(body.publicContact.publicEmail).trim().toLowerCase().slice(0, 100) : undefined,
          };
        }
      }

      // 21. Portfolio Section Customization & Visibility
      if (body.portfolioSections !== undefined) {
        if (body.portfolioSections && typeof body.portfolioSections === "object") {
          const sanitizedSections: DoctorPortfolioSections = {};
          for (const [key, val] of Object.entries(body.portfolioSections)) {
            if (val && typeof val === "object") {
              sanitizedSections[key] = {
                isVisible: Boolean(val.isVisible),
                order: typeof val.order === "number" ? val.order : undefined,
                customTitle: val.customTitle ? String(val.customTitle).trim().slice(0, 100) : undefined,
              };
            }
          }
          updates.portfolioSections = sanitizedSections;
        }
      }

      // 22. Public Document References & Credentials
      if (body.publicDocuments !== undefined) {
        if (Array.isArray(body.publicDocuments)) {
          updates.publicDocuments = body.publicDocuments
            .filter((doc) => doc && typeof doc.title === "string" && doc.title.trim().length > 0)
            .map((doc, idx) => ({
              id: String(doc.id || `DOC-${idx + 1}`).trim(),
              title: String(doc.title).trim().slice(0, 150),
              documentType: String(doc.documentType || "Certificate").trim().slice(0, 50),
              url: String(doc.url || "").trim().slice(0, 500),
            }));
        }
      }

      // Always update timestamp
      const nowIso = new Date().toISOString();
      updates.updatedAt = nowIso;

      // Ensure slug is set if it was never stored before
      if (!currentDoctor.slug && !updates.slug) {
        updates.slug = generateSafeDoctorSlug(updates.fullName || currentDoctor.fullName, currentDoctor.doctorId);
      }

      // Persist to MongoDB
      await docCol.updateOne(
        { id: currentDoctor.id },
        { $set: updates },
      );

      const refreshedDoctor = await docCol.findOne({ id: currentDoctor.id });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Doctor profile saved successfully.",
        doctor: sanitizeDoctorProfile(refreshedDoctor!),
      });
    },
  );
}
