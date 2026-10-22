import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { requirePermission } from "../auth/auth.guard.js";
import { normalizeEmail, hashPassword } from "../auth/auth.service.js";
import { recordAuditLogEntry } from "./audit.service.js";
import { createDefaultSubscription, formatAedAmount } from "./subscription.service.js";
import { generateSafeDoctorSlug } from "../portal/doctor-portal.routes.js";
import type { DoctorRecord, SafeDoctorProfile, AccountStatus } from "./admin.types.js";

/**
 * Sanitizes internal DoctorRecord into a client-safe profile.
 * Excludes invitationTokenHash, passwordHash, and internal MongoDB _id.
 */
export function sanitizeDoctorProfile(doctor: DoctorRecord): SafeDoctorProfile {
  const { invitationTokenHash: _hash, passwordHash: _pwdHash, ...safeProfile } = doctor;
  if ("_id" in safeProfile) {
    delete (safeProfile as Record<string, unknown>)._id;
  }
  return safeProfile;
}

interface DoctorQuerystring {
  search?: string | undefined;
  status?: string | undefined;
  specialty?: string | undefined;
  page?: string | undefined;
  limit?: string | undefined;
}

interface CreateDoctorBody {
  fullName: string;
  email: string;
  password?: string | undefined;
  phone: string;
  specialty?: string | undefined;
  licenseNumber?: string | undefined;
  yearsOfExperience?: number | undefined;
  medicalDegrees?: string[] | undefined;
  chamberLocationsSummary?: string | undefined;
  consultationFeeAed?: number | undefined;
  accountStatus?: AccountStatus | undefined;
}

interface UpdateDoctorStatusBody {
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  reason?: string | undefined;
}

export async function registerDoctorRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/admin/doctors
   * Lists managed doctors with filtering, search, and pagination.
   */
  app.get<{ Querystring: DoctorQuerystring }>(
    "/api/v1/admin/doctors",
    {
      preHandler: [authenticateAdmin, requirePermission("VIEW_DOCTORS")],
    },
    async (request: FastifyRequest<{ Querystring: DoctorQuerystring }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { search, status, specialty, page = "1", limit = "20" } = request.query;
      const query: Record<string, unknown> = {};

      if (status) {
        query.accountStatus = status.toUpperCase();
      }

      if (specialty) {
        query.specialty = { $regex: specialty, $options: "i" };
      }

      if (search) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        query.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { licenseNumber: searchRegex },
          { doctorId: searchRegex },
        ];
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const docCol = mongoAdapter.getDoctorCollection();
      const [items, total] = await Promise.all([
        docCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
        docCol.countDocuments(query),
      ]);

      return reply.status(200).send({
        statusCode: 200,
        items: items.map(sanitizeDoctorProfile),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    },
  );

  /**
   * GET /api/v1/admin/doctors/:id
   * Retrieves single doctor account detail along with active subscription.
   */
  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/doctors/:id",
    {
      preHandler: [authenticateAdmin, requirePermission("VIEW_DOCTORS")],
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
      const docCol = mongoAdapter.getDoctorCollection();
      const doctor = await docCol.findOne({
        $or: [{ id }, { doctorId: id }],
      });

      if (!doctor) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Doctor account ${id} not found.`,
        });
      }

      // Fetch associated subscription
      const sub = await mongoAdapter.getSubscriptionCollection().findOne({ accountId: doctor.id });

      return reply.status(200).send({
        statusCode: 200,
        doctor: sanitizeDoctorProfile(doctor),
        subscription: sub || null,
      });
    },
  );

  /**
   * POST /api/v1/admin/doctors
   * Manual creation of a Doctor account by Super Admin.
   * Validates duplicate email and license, generates secure activation token,
   * creates trial subscription in AED, and persists audit log.
   */
  app.post<{ Body: CreateDoctorBody }>(
    "/api/v1/admin/doctors",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_DOCTORS")],
    },
    async (request: FastifyRequest<{ Body: CreateDoctorBody }>, reply: FastifyReply) => {
      const {
        fullName,
        email,
        password,
        phone,
        specialty,
        licenseNumber,
        yearsOfExperience = 5,
        medicalDegrees = ["MBBS"],
        chamberLocationsSummary = "Main Medical Center, Dubai",
        consultationFeeAed = 500,
        accountStatus = "TRIAL",
      } = request.body || {};

      if (!fullName || !email || !phone) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "fullName, email, and phone are required fields.",
        });
      }

      if (password && typeof password === "string" && password.trim().length < 8) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Doctor account password must be at least 8 characters.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const normalizedEmail = normalizeEmail(email);
      const normalizedSpecialty = specialty && specialty.trim() ? specialty.trim() : "General Specialist";
      const normalizedLicense =
        licenseNumber && licenseNumber.trim()
          ? licenseNumber.trim().toUpperCase()
          : `LIC-${Date.now().toString().slice(-6)}`;

      const docCol = mongoAdapter.getDoctorCollection();

      // Check duplicate email
      const existingEmail = await docCol.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `Doctor account with email ${normalizedEmail} already exists.`,
        });
      }

      // Check duplicate license only if an explicit license was provided
      if (licenseNumber && licenseNumber.trim()) {
        const existingLicense = await docCol.findOne({ licenseNumber: normalizedLicense });
        if (existingLicense) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: `Doctor account with license number ${normalizedLicense} already exists.`,
          });
        }
      }

      const adminUser = request.adminUser!;
      const nowIso = new Date().toISOString();

      const accountId = `ACC-DOC-${Date.now().toString().slice(-6)}`;
      const doctorId = `DOC-${Date.now().toString().slice(-4)}`;

      // Generate or assign secure account password
      const assignedPassword =
        password && typeof password === "string" && password.trim().length >= 8
          ? password.trim()
          : `Doc!${crypto.randomBytes(4).toString("hex")}2026`;

      const passwordHash = await hashPassword(assignedPassword);

      // Generate secure activation / invitation token
      const rawInvitationToken = crypto.randomBytes(32).toString("hex");
      const invitationTokenHash = crypto.createHash("sha256").update(rawInvitationToken).digest("hex");
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create subscription in AED
      const subscription = createDefaultSubscription({
        accountId,
        accountType: "DOCTOR",
        accountHolderName: fullName.trim(),
        actorAdminName: adminUser.email,
      });

      await mongoAdapter.getSubscriptionCollection().insertOne(subscription);

      const slug = generateSafeDoctorSlug(fullName.trim(), doctorId);

      const newDoctor: DoctorRecord = {
        id: accountId,
        doctorId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone.trim(),
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        specialty: normalizedSpecialty,
        licenseNumber: normalizedLicense,
        accountStatus,
        approvedAt: nowIso,
        subscriptionId: subscription.id,
        assignedPatientCount: 0,
        totalBookingsCount: 0,
        chamberLocationsSummary: chamberLocationsSummary.trim(),
        yearsOfExperience: Number(yearsOfExperience) || 0,
        medicalDegrees: Array.isArray(medicalDegrees) ? medicalDegrees : ["MBBS"],
        consultationFee: formatAedAmount(consultationFeeAed),
        invitationTokenHash,
        invitationTokenExpiresAt: tokenExpiresAt,
        isActivated: accountStatus === "ACTIVE",
        slug,
        isPublished: true,
        chambers: [
          {
            id: "CHAMBER-1",
            facilityName: chamberLocationsSummary.trim() || "Main Consultation Chamber",
            city: "Dubai",
            visitingSchedule: "Daily 05:00 PM – 09:00 PM",
          },
        ],
        services: [
          {
            id: "SRV-1",
            title: `${normalizedSpecialty} Consultation`,
            category: normalizedSpecialty,
            description: "Comprehensive clinical diagnostic evaluation and patient consultation.",
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await docCol.insertOne(newDoctor);

      // Record audit log
      await recordAuditLogEntry({
        category: "ACCOUNT_LIFECYCLE",
        action: "ACCOUNT_CREATED",
        actor: {
          adminId: adminUser.adminId,
          adminName: adminUser.email,
          adminEmail: adminUser.email,
          adminRole: adminUser.role,
        },
        targetType: "DOCTOR",
        targetId: accountId,
        targetName: fullName.trim(),
        summary: `Super Admin ${adminUser.email} manually created Doctor account ${accountId} (${doctorId}).`,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          doctorId,
          email: normalizedEmail,
          licenseNumber: normalizedLicense,
          subscriptionId: subscription.id,
        },
      });

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: `Doctor account ${fullName.trim()} created successfully.`,
        doctor: sanitizeDoctorProfile(newDoctor),
        subscription,
        credentials: {
          email: normalizedEmail,
          password: assignedPassword,
          loginUrl: "/login",
        },
        invitation: {
          token: rawInvitationToken,
          expiresAt: tokenExpiresAt,
        },
      });
    },
  );

  /**
   * PATCH /api/v1/admin/doctors/:id/status
   * Suspends, reactivates, or updates Doctor account status.
   */
  app.patch<{ Params: { id: string }; Body: UpdateDoctorStatusBody }>(
    "/api/v1/admin/doctors/:id/status",
    {
      preHandler: [authenticateAdmin],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateDoctorStatusBody;
      }>,
      reply: FastifyReply,
    ) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const { status, reason } = request.body || {};

      if (!status || !["ACTIVE", "SUSPENDED", "TRIAL"].includes(status)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "status must be one of ACTIVE, SUSPENDED, or TRIAL.",
        });
      }

      // Check required permission based on action
      const requiredPerm = status === "SUSPENDED" ? "SUSPEND_ACCOUNTS" : "REACTIVATE_ACCOUNTS";
      if (!request.adminUser?.permissions.includes(requiredPerm) && request.adminUser?.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: `Permission denied: Missing required permission ${requiredPerm}.`,
        });
      }

      const docCol = mongoAdapter.getDoctorCollection();
      const doctor = await docCol.findOne({ $or: [{ id }, { doctorId: id }] });

      if (!doctor) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Doctor account ${id} not found.`,
        });
      }

      const nowIso = new Date().toISOString();
      const previousStatus = doctor.accountStatus;

      await docCol.updateOne(
        { id: doctor.id },
        {
          $set: {
            accountStatus: status,
            updatedAt: nowIso,
          },
        },
      );

      // Also update linked subscription status if suspended/reactivated
      const subCol = mongoAdapter.getSubscriptionCollection();
      const subStatus = status === "SUSPENDED" ? "SUSPENDED" : status === "ACTIVE" ? "ACTIVE" : "TRIAL";
      await subCol.updateOne(
        { accountId: doctor.id },
        {
          $set: {
            status: subStatus,
            updatedAt: nowIso,
          },
          $push: {
            lifecycleHistory: {
              id: `EVT-${Date.now().toString().slice(-6)}`,
              timestamp: nowIso,
              eventType: status === "SUSPENDED" ? "SUSPENDED" : "REACTIVATED",
              actorAdminName: request.adminUser!.email,
              note: reason || `Status changed from ${previousStatus} to ${status}.`,
            },
          },
        },
      );

      // Record audit log
      const auditAction = status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REACTIVATED";
      await recordAuditLogEntry({
        category: "ACCOUNT_LIFECYCLE",
        action: auditAction,
        actor: {
          adminId: request.adminUser!.adminId,
          adminName: request.adminUser!.email,
          adminEmail: request.adminUser!.email,
          adminRole: request.adminUser!.role,
        },
        targetType: "DOCTOR",
        targetId: doctor.id,
        targetName: doctor.fullName,
        summary: `Doctor ${doctor.fullName} (${doctor.doctorId}) status changed from ${previousStatus} to ${status}.`,
        reason,
        ipAddress: request.ip || "127.0.0.1",
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: `Doctor ${doctor.fullName} status updated to ${status}.`,
        previousStatus,
        newStatus: status,
      });
    },
  );
}
