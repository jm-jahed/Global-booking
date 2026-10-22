import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { requirePermission } from "../auth/auth.guard.js";
import { normalizeEmail, hashPassword } from "../auth/auth.service.js";
import { recordAuditLogEntry } from "./audit.service.js";
import { createDefaultSubscription } from "./subscription.service.js";
import type { HospitalRecord, SafeHospitalProfile, AccountStatus } from "./admin.types.js";

/**
 * Sanitizes internal HospitalRecord into a client-safe profile.
 * Excludes invitationTokenHash, passwordHash, and internal MongoDB _id.
 */
export function sanitizeHospitalProfile(hospital: HospitalRecord): SafeHospitalProfile {
  const { invitationTokenHash: _hash, passwordHash: _pHash, ...safeProfile } = hospital;
  if ("_id" in safeProfile) {
    delete (safeProfile as Record<string, unknown>)._id;
  }
  return safeProfile;
}

interface HospitalQuerystring {
  search?: string | undefined;
  status?: string | undefined;
  city?: string | undefined;
  page?: string | undefined;
  limit?: string | undefined;
}

interface CreateHospitalBody {
  institutionName: string;
  email: string;
  phone: string;
  password?: string | undefined;
  facilityType?: string | undefined;
  licenseNumber?: string | undefined;
  city?: string | undefined;
  emirateOrState?: string | undefined;
  addressLine1?: string | undefined;
  departments?: string[] | undefined;
  bedCapacity?: number | undefined;
  emergencyUnitAvailable?: boolean | undefined;
  accountStatus?: AccountStatus | undefined;
}

interface UpdateHospitalStatusBody {
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  reason?: string | undefined;
}

export async function registerHospitalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/admin/hospitals
   * Lists managed hospitals and clinics with filtering, search, and pagination.
   */
  app.get<{ Querystring: HospitalQuerystring }>(
    "/api/v1/admin/hospitals",
    {
      preHandler: [authenticateAdmin, requirePermission("VIEW_HOSPITALS")],
    },
    async (request: FastifyRequest<{ Querystring: HospitalQuerystring }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { search, status, city, page = "1", limit = "20" } = request.query;
      const query: Record<string, unknown> = {};

      if (status) {
        query.accountStatus = status.toUpperCase();
      }

      if (city) {
        query.city = { $regex: city, $options: "i" };
      }

      if (search) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        query.$or = [
          { institutionName: searchRegex },
          { email: searchRegex },
          { licenseNumber: searchRegex },
          { hospitalId: searchRegex },
        ];
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const hspCol = mongoAdapter.getHospitalCollection();
      const [items, total] = await Promise.all([
        hspCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
        hspCol.countDocuments(query),
      ]);

      return reply.status(200).send({
        statusCode: 200,
        items: items.map(sanitizeHospitalProfile),
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
   * GET /api/v1/admin/hospitals/:id
   * Retrieves single hospital/clinic account detail with active subscription.
   */
  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/hospitals/:id",
    {
      preHandler: [authenticateAdmin, requirePermission("VIEW_HOSPITALS")],
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
      const hspCol = mongoAdapter.getHospitalCollection();
      const hospital = await hspCol.findOne({
        $or: [{ id }, { hospitalId: id }],
      });

      if (!hospital) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Hospital/Clinic account ${id} not found.`,
        });
      }

      // Fetch linked subscription
      const sub = await mongoAdapter.getSubscriptionCollection().findOne({ accountId: hospital.id });

      return reply.status(200).send({
        statusCode: 200,
        hospital: sanitizeHospitalProfile(hospital),
        subscription: sub || null,
      });
    },
  );

  /**
   * POST /api/v1/admin/hospitals
   * Manual creation of a Hospital or Clinic account by Super Admin.
   * Validates duplicate email and license, generates secure activation token,
   * creates trial subscription in AED, and persists audit log.
   */
  app.post<{ Body: CreateHospitalBody }>(
    "/api/v1/admin/hospitals",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_HOSPITALS")],
    },
    async (request: FastifyRequest<{ Body: CreateHospitalBody }>, reply: FastifyReply) => {
      const {
        institutionName,
        email,
        password,
        phone,
        facilityType = "GENERAL_HOSPITAL",
        licenseNumber,
        city = "Dubai",
        emirateOrState = "Dubai",
        addressLine1 = "Healthcare City Phase 2",
        departments = ["General Medicine", "Emergency Care"],
        bedCapacity = 100,
        emergencyUnitAvailable = true,
        accountStatus = "TRIAL",
      } = request.body || {};

      if (!institutionName || !email || !phone) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "institutionName, email, and phone are required fields.",
        });
      }

      if (password && typeof password === "string" && password.trim().length < 8) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Hospital account password must be at least 8 characters.",
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
      const normalizedLicense =
        licenseNumber && licenseNumber.trim()
          ? licenseNumber.trim().toUpperCase()
          : `DHA-HSP-${Date.now().toString().slice(-6)}`;

      const hspCol = mongoAdapter.getHospitalCollection();

      // Check duplicate email
      const existingEmail = await hspCol.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `Hospital/Clinic account with email ${normalizedEmail} already exists.`,
        });
      }

      // Check duplicate license only if an explicit license was provided
      if (licenseNumber && licenseNumber.trim()) {
        const existingLicense = await hspCol.findOne({ licenseNumber: normalizedLicense });
        if (existingLicense) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: `Hospital/Clinic account with license number ${normalizedLicense} already exists.`,
          });
        }
      }

      const adminUser = request.adminUser!;
      const nowIso = new Date().toISOString();

      const accountId = `ACC-HSP-${Date.now().toString().slice(-6)}`;
      const hospitalId = `HSP-${Date.now().toString().slice(-4)}`;

      // Generate or assign secure account password
      const assignedPassword =
        password && typeof password === "string" && password.trim().length >= 8
          ? password.trim()
          : `Hsp!${crypto.randomBytes(4).toString("hex")}2026`;

      const passwordHash = await hashPassword(assignedPassword);

      // Generate secure activation / invitation token
      const rawInvitationToken = crypto.randomBytes(32).toString("hex");
      const invitationTokenHash = crypto.createHash("sha256").update(rawInvitationToken).digest("hex");
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create subscription in AED
      const subscription = createDefaultSubscription({
        accountId,
        accountType: "HOSPITAL",
        accountHolderName: institutionName.trim(),
        actorAdminName: adminUser.email,
      });

      await mongoAdapter.getSubscriptionCollection().insertOne(subscription);

      const deptList = Array.isArray(departments) ? departments : ["General Medicine"];

      const newHospital: HospitalRecord = {
        id: accountId,
        hospitalId,
        institutionName: institutionName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        avatar: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80",
        facilityType,
        licenseNumber: normalizedLicense,
        accountStatus,
        approvedAt: nowIso,
        subscriptionId: subscription.id,
        departmentCount: deptList.length,
        affiliatedDoctorCount: 0,
        outpatientPatientCount: 0,
        totalAppointmentsCount: 0,
        city: city.trim(),
        emirateOrState: emirateOrState.trim(),
        departments: deptList,
        bedCapacity: Number(bedCapacity) || 50,
        emergencyUnitAvailable: Boolean(emergencyUnitAvailable),
        location: {
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          stateOrEmirate: emirateOrState.trim(),
          country: "United Arab Emirates",
        },
        invitationTokenHash,
        invitationTokenExpiresAt: tokenExpiresAt,
        passwordHash,
        isActivated: accountStatus === "ACTIVE",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await hspCol.insertOne(newHospital);

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
        targetType: "HOSPITAL",
        targetId: accountId,
        targetName: institutionName.trim(),
        summary: `Super Admin ${adminUser.email} manually created Hospital/Clinic account ${accountId} (${hospitalId}).`,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          hospitalId,
          email: normalizedEmail,
          licenseNumber: normalizedLicense,
          subscriptionId: subscription.id,
        },
      });

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: `Hospital/Clinic account ${institutionName.trim()} created successfully.`,
        hospital: sanitizeHospitalProfile(newHospital),
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
   * PATCH /api/v1/admin/hospitals/:id/status
   * Suspends, reactivates, or updates Hospital/Clinic account status.
   */
  app.patch<{ Params: { id: string }; Body: UpdateHospitalStatusBody }>(
    "/api/v1/admin/hospitals/:id/status",
    {
      preHandler: [authenticateAdmin],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateHospitalStatusBody;
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

      const requiredPerm = status === "SUSPENDED" ? "SUSPEND_ACCOUNTS" : "REACTIVATE_ACCOUNTS";
      if (!request.adminUser?.permissions.includes(requiredPerm) && request.adminUser?.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: `Permission denied: Missing required permission ${requiredPerm}.`,
        });
      }

      const hspCol = mongoAdapter.getHospitalCollection();
      const hospital = await hspCol.findOne({ $or: [{ id }, { hospitalId: id }] });

      if (!hospital) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Hospital/Clinic account ${id} not found.`,
        });
      }

      const nowIso = new Date().toISOString();
      const previousStatus = hospital.accountStatus;

      await hspCol.updateOne(
        { id: hospital.id },
        {
          $set: {
            accountStatus: status,
            updatedAt: nowIso,
          },
        },
      );

      // Also update linked subscription status
      const subCol = mongoAdapter.getSubscriptionCollection();
      const subStatus = status === "SUSPENDED" ? "SUSPENDED" : status === "ACTIVE" ? "ACTIVE" : "TRIAL";
      await subCol.updateOne(
        { accountId: hospital.id },
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
        targetType: "HOSPITAL",
        targetId: hospital.id,
        targetName: hospital.institutionName,
        summary: `Hospital/Clinic ${hospital.institutionName} (${hospital.hospitalId}) status changed from ${previousStatus} to ${status}.`,
        reason,
        ipAddress: request.ip || "127.0.0.1",
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: `Hospital/Clinic ${hospital.institutionName} status updated to ${status}.`,
        previousStatus,
        newStatus: status,
      });
    },
  );
}
