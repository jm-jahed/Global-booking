import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { requirePermission } from "../auth/auth.guard.js";
import { normalizeEmail } from "../auth/auth.service.js";
import { recordAuditLogEntry } from "./audit.service.js";
import { createDefaultSubscription, formatAedAmount } from "./subscription.service.js";
import { generateSafeDoctorSlug } from "../portal/doctor-portal.routes.js";
import type {
  DoctorRegistrationRecord,
  HospitalRegistrationRecord,
  DoctorRecord,
  HospitalRecord,
} from "./admin.types.js";

interface RegistrationQuerystring {
  status?: string | undefined;
  accountType?: string | undefined;
  page?: string | undefined;
  limit?: string | undefined;
}

interface ApproveRegistrationParams {
  id: string;
}

interface ApproveRegistrationBody {
  consultationFeeAed?: number | undefined;
}

interface RejectRegistrationParams {
  id: string;
}

interface RejectRegistrationBody {
  reason: string;
  notes?: string | undefined;
}

interface PublicRegistrationBody {
  accountType: "DOCTOR" | "HOSPITAL";
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  institutionName?: string | undefined;
  practiceDetails?: Record<string, unknown> | undefined;
  facilityDetails?: Record<string, unknown> | undefined;
  documents?: Array<Record<string, unknown>> | undefined;
}

export async function registerRegistrationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/admin/registrations
   * Lists registration applications with optional status and accountType filtering.
   */
  app.get<{ Querystring: RegistrationQuerystring }>(
    "/api/v1/admin/registrations",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_REGISTRATIONS")],
    },
    async (request: FastifyRequest<{ Querystring: RegistrationQuerystring }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { status, accountType, page = "1", limit = "20" } = request.query;
      const query: Record<string, unknown> = {};

      if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
        query.status = status.toUpperCase();
      }

      if (accountType && ["DOCTOR", "HOSPITAL"].includes(accountType.toUpperCase())) {
        query.accountType = accountType.toUpperCase();
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const regCol = mongoAdapter.getRegistrationCollection();
      const [items, total, pendingCount] = await Promise.all([
        regCol.find(query).sort({ submittedAt: -1 }).skip(skip).limit(limitNum).toArray(),
        regCol.countDocuments(query),
        regCol.countDocuments({ status: "PENDING" }),
      ]);

      return reply.status(200).send({
        statusCode: 200,
        items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
        pendingCount,
      });
    },
  );

  /**
   * GET /api/v1/admin/registrations/:id
   * Retrieves single registration application by ID.
   */
  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/registrations/:id",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_REGISTRATIONS")],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const regCol = mongoAdapter.getRegistrationCollection();
      const registration = await regCol.findOne({ id });

      if (!registration) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Registration application ${id} not found.`,
        });
      }

      return reply.status(200).send({
        statusCode: 200,
        registration,
      });
    },
  );

  /**
   * POST /api/v1/admin/registrations/:id/approve
   * Approves registration, generates real Doctor or Hospital account + Subscription,
   * generates secure activation token, and persists audit log.
   */
  app.post<{ Params: ApproveRegistrationParams; Body?: ApproveRegistrationBody }>(
    "/api/v1/admin/registrations/:id/approve",
    {
      preHandler: [authenticateAdmin, requirePermission("APPROVE_ACCOUNTS")],
    },
    async (request: FastifyRequest<{ Params: ApproveRegistrationParams; Body?: ApproveRegistrationBody }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const { consultationFeeAed } = request.body || {};
      const doctorFeeNumber =
        typeof consultationFeeAed === "number" && consultationFeeAed >= 0
          ? consultationFeeAed
          : 450;
      const regCol = mongoAdapter.getRegistrationCollection();
      const registration = await regCol.findOne({ id });

      if (!registration) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Registration application ${id} not found.`,
        });
      }

      if (registration.status !== "PENDING") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Registration application is already ${registration.status}. Only PENDING applications can be approved.`,
        });
      }

      const adminUser = request.adminUser!;
      const nowIso = new Date().toISOString();

      // Secure invitation/activation token (generated with crypto.randomBytes)
      const rawInvitationToken = crypto.randomBytes(32).toString("hex");
      const invitationTokenHash = crypto.createHash("sha256").update(rawInvitationToken).digest("hex");
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      let createdAccountId = "";
      let createdEntityId = "";

      if (registration.accountType === "DOCTOR") {
        const docCol = mongoAdapter.getDoctorCollection();
        const docReg = registration as DoctorRegistrationRecord;
        const normalizedEmail = normalizeEmail(docReg.applicantEmail);

        // Check duplicate email
        const existingDoc = await docCol.findOne({ email: normalizedEmail });
        if (existingDoc) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: `A Doctor account with email ${normalizedEmail} already exists.`,
          });
        }

        createdAccountId = `ACC-DOC-${Date.now().toString().slice(-6)}`;
        createdEntityId = `DOC-${Date.now().toString().slice(-4)}`;

        // Create 14-day trial subscription in AED
        const sub = createDefaultSubscription({
          accountId: createdAccountId,
          accountType: "DOCTOR",
          accountHolderName: docReg.applicantName,
          actorAdminName: adminUser.email,
        });

        await mongoAdapter.getSubscriptionCollection().insertOne(sub);

        const slug = generateSafeDoctorSlug(docReg.applicantName, createdEntityId);

        const newDoctor: DoctorRecord = {
          id: createdAccountId,
          doctorId: createdEntityId,
          fullName: docReg.applicantName,
          email: normalizedEmail,
          phone: docReg.applicantPhone,
          avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
          specialty: docReg.practiceDetails?.primarySpecialty || "General Specialist",
          licenseNumber: docReg.documents?.[0]?.documentNumber || `LIC-DOC-${createdEntityId}`,
          accountStatus: "TRIAL",
          approvedAt: nowIso,
          subscriptionId: sub.id,
          assignedPatientCount: 0,
          totalBookingsCount: 0,
          chamberLocationsSummary: docReg.practiceDetails?.chamberLocations?.[0]?.facilityName || "",
          yearsOfExperience: docReg.practiceDetails?.yearsOfExperience || 5,
          medicalDegrees: docReg.practiceDetails?.medicalDegrees ? [...docReg.practiceDetails.medicalDegrees] : ["MBBS"],
          consultationFee: formatAedAmount(doctorFeeNumber),
          invitationTokenHash,
          invitationTokenExpiresAt: tokenExpiresAt,
          isActivated: false,
          slug,
          isPublished: true,
          chambers: docReg.practiceDetails?.chamberLocations && docReg.practiceDetails.chamberLocations.length > 0
            ? docReg.practiceDetails.chamberLocations.map((ch, idx) => ({
                id: `CHAMBER-${idx + 1}`,
                facilityName: ch.facilityName || "Main Chamber",
                city: ch.city || "",
                visitingSchedule: "Daily 05:00 PM – 09:00 PM",
              }))
            : [
                {
                  id: "CHAMBER-1",
                  facilityName: docReg.practiceDetails?.chamberLocations?.[0]?.facilityName || "Main Consultation Chamber",
                  city: "",
                  visitingSchedule: "Daily 05:00 PM – 09:00 PM",
                },
              ],
          services: [
            {
              id: "SRV-1",
              title: `${docReg.practiceDetails?.primarySpecialty || "Specialist"} Consultation`,
              category: docReg.practiceDetails?.primarySpecialty || "General",
              description: "Comprehensive clinical diagnostic evaluation and patient consultation.",
            },
          ],
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await docCol.insertOne(newDoctor);
      } else {
        const hspCol = mongoAdapter.getHospitalCollection();
        const hspReg = registration as HospitalRegistrationRecord;
        const normalizedEmail = normalizeEmail(hspReg.applicantEmail);

        // Check duplicate email
        const existingHsp = await hspCol.findOne({ email: normalizedEmail });
        if (existingHsp) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: `A Hospital/Clinic account with email ${normalizedEmail} already exists.`,
          });
        }

        createdAccountId = `ACC-HSP-${Date.now().toString().slice(-6)}`;
        createdEntityId = `HSP-${Date.now().toString().slice(-4)}`;

        // Create 14-day trial subscription in AED
        const sub = createDefaultSubscription({
          accountId: createdAccountId,
          accountType: "HOSPITAL",
          accountHolderName: hspReg.institutionName || hspReg.applicantName,
          actorAdminName: adminUser.email,
        });

        await mongoAdapter.getSubscriptionCollection().insertOne(sub);

        const newHospital: HospitalRecord = {
          id: createdAccountId,
          hospitalId: createdEntityId,
          institutionName: hspReg.institutionName || hspReg.applicantName,
          email: normalizedEmail,
          phone: hspReg.applicantPhone,
          avatar: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80",
          facilityType: hspReg.facilityDetails?.facilityType || "GENERAL_HOSPITAL",
          licenseNumber: hspReg.documents?.[0]?.documentNumber || `LIC-HSP-${createdEntityId}`,
          accountStatus: "TRIAL",
          approvedAt: nowIso,
          subscriptionId: sub.id,
          departmentCount: hspReg.facilityDetails?.departments?.length || 4,
          affiliatedDoctorCount: hspReg.facilityDetails?.affiliatedSpecialistCount || 10,
          outpatientPatientCount: 0,
          totalAppointmentsCount: 0,
          city: hspReg.facilityDetails?.location?.city || "",
          emirateOrState: hspReg.facilityDetails?.location?.stateOrEmirate || "",
          departments: hspReg.facilityDetails?.departments ? [...hspReg.facilityDetails.departments] : ["Cardiology", "Pediatrics"],
          bedCapacity: hspReg.facilityDetails?.bedCapacity || 100,
          emergencyUnitAvailable: hspReg.facilityDetails?.emergencyUnitAvailable ?? true,
          location: {
            addressLine1: hspReg.facilityDetails?.location?.addressLine1 || "",
            city: hspReg.facilityDetails?.location?.city || "",
            stateOrEmirate: hspReg.facilityDetails?.location?.stateOrEmirate || "",
            country: hspReg.facilityDetails?.location?.country || "",
          },
          invitationTokenHash,
          invitationTokenExpiresAt: tokenExpiresAt,
          isActivated: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await hspCol.insertOne(newHospital);
      }

      // Mark registration as approved
      await regCol.updateOne(
        { id },
        {
          $set: {
            status: "APPROVED",
            reviewedAt: nowIso,
            reviewedByAdminId: adminUser.adminId,
            reviewedByAdminName: adminUser.email,
            updatedAt: nowIso,
          },
        },
      );

      // Record audit log
      await recordAuditLogEntry({
        category: "REGISTRATION_REVIEW",
        action: "REGISTRATION_APPROVED",
        actor: {
          adminId: adminUser.adminId,
          adminName: adminUser.email,
          adminEmail: adminUser.email,
          adminRole: adminUser.role,
        },
        targetType: registration.accountType === "DOCTOR" ? "DOCTOR" : "HOSPITAL",
        targetId: createdAccountId,
        targetName: registration.applicantName,
        summary: `Registration application ${id} approved by ${adminUser.email}. Created account ${createdAccountId}.`,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          registrationId: id,
          accountType: registration.accountType,
          entityId: createdEntityId,
        },
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: `Registration application ${id} approved successfully. Account ${createdAccountId} created.`,
        createdAccount: {
          accountId: createdAccountId,
          entityId: createdEntityId,
          accountType: registration.accountType,
          invitationToken: rawInvitationToken,
          invitationTokenExpiresAt: tokenExpiresAt,
        },
      });
    },
  );

  /**
   * POST /api/v1/admin/registrations/:id/reject
   * Rejects a pending registration application with explicit reason and audit log.
   */
  app.post<{ Params: RejectRegistrationParams; Body: RejectRegistrationBody }>(
    "/api/v1/admin/registrations/:id/reject",
    {
      preHandler: [authenticateAdmin, requirePermission("REJECT_ACCOUNTS")],
    },
    async (
      request: FastifyRequest<{
        Params: RejectRegistrationParams;
        Body: RejectRegistrationBody;
      }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const { reason, notes } = request.body || {};

      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "A non-empty rejection reason is required.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const regCol = mongoAdapter.getRegistrationCollection();
      const registration = await regCol.findOne({ id });

      if (!registration) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Registration application ${id} not found.`,
        });
      }

      if (registration.status !== "PENDING") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Registration application is already ${registration.status}. Only PENDING applications can be rejected.`,
        });
      }

      const adminUser = request.adminUser!;
      const nowIso = new Date().toISOString();

      await regCol.updateOne(
        { id },
        {
          $set: {
            status: "REJECTED",
            rejectionReason: reason.trim(),
            notes: notes?.trim() || undefined,
            reviewedAt: nowIso,
            reviewedByAdminId: adminUser.adminId,
            reviewedByAdminName: adminUser.email,
            updatedAt: nowIso,
          },
        },
      );

      // Record audit log
      await recordAuditLogEntry({
        category: "REGISTRATION_REVIEW",
        action: "REGISTRATION_REJECTED",
        actor: {
          adminId: adminUser.adminId,
          adminName: adminUser.email,
          adminEmail: adminUser.email,
          adminRole: adminUser.role,
        },
        targetType: "REGISTRATION",
        targetId: id,
        targetName: registration.applicantName,
        summary: `Registration application ${id} rejected by ${adminUser.email}. Reason: ${reason.trim()}`,
        reason: reason.trim(),
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          registrationId: id,
          accountType: registration.accountType,
        },
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: `Registration application ${id} rejected.`,
        registrationId: id,
        status: "REJECTED",
      });
    },
  );

  /**
   * POST /api/v1/public/registrations
   * Public intake endpoint for prospective Doctor or Hospital registration submissions.
   */
  app.post<{ Body: PublicRegistrationBody }>(
    "/api/v1/public/registrations",
    async (request: FastifyRequest<{ Body: PublicRegistrationBody }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { accountType, applicantName, applicantEmail, applicantPhone } = request.body || {};

      if (!accountType || !["DOCTOR", "HOSPITAL"].includes(accountType)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "accountType must be either DOCTOR or HOSPITAL.",
        });
      }

      if (!applicantName || !applicantEmail || !applicantPhone) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "applicantName, applicantEmail, and applicantPhone are required.",
        });
      }

      const normalizedEmail = normalizeEmail(applicantEmail);
      const regCol = mongoAdapter.getRegistrationCollection();

      // Check if pending registration already exists
      const existingPending = await regCol.findOne({
        applicantEmail: normalizedEmail,
        status: "PENDING",
      });

      if (existingPending) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "A pending registration application with this email address is already under review.",
        });
      }

      const prefix = accountType === "DOCTOR" ? "REG-DOC" : "REG-HSP";
      const year = new Date().getFullYear();
      const id = `${prefix}-${year}-${Date.now().toString().slice(-4)}`;
      const nowIso = new Date().toISOString();

      const newRecord = {
        id,
        accountType,
        applicantName: applicantName.trim(),
        applicantEmail: normalizedEmail,
        applicantPhone: applicantPhone.trim(),
        submittedAt: nowIso,
        status: "PENDING" as const,
        documents: (request.body.documents as any) || [],
        practiceDetails: (request.body.practiceDetails as any) || undefined,
        institutionName: request.body.institutionName?.trim() || undefined,
        facilityDetails: (request.body.facilityDetails as any) || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await regCol.insertOne(newRecord as any);

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: "Registration application submitted successfully and is now PENDING review.",
        registrationId: id,
      });
    },
  );
}
