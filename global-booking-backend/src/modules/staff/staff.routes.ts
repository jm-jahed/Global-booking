import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { hashPassword, normalizeEmail } from "../auth/auth.service.js";
import type { StaffRecord, SafeStaffProfile } from "../auth/auth.types.js";
import { createNotification } from "../notifications/notification.service.js";

const VALID_STAFF_ROLES = [
  "Receptionist / Front Desk",
  "Clinical Nurse",
  "Chamber Manager",
  "Billing Coordinator",
] as const;

export type StaffRoleType = (typeof VALID_STAFF_ROLES)[number];

export interface CreateStaffBody {
  name?: string;
  email?: string;
  password?: string;
  role?: StaffRoleType;
  phone?: string;
  chamberLocation?: string;
  permissions?: {
    canManageQueue?: boolean;
    canBookPhoneAppointments?: boolean;
    canViewPatientHistory?: boolean;
    canCollectPayments?: boolean;
  };
}

export interface UpdateStaffBody {
  name?: string;
  phone?: string;
  role?: StaffRoleType;
  chamberLocation?: string;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  password?: string;
  permissions?: {
    canManageQueue?: boolean;
    canBookPhoneAppointments?: boolean;
    canViewPatientHistory?: boolean;
    canCollectPayments?: boolean;
  };
}

export function sanitizeStaffRecord(record: StaffRecord): SafeStaffProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = record;
  return safe;
}

/**
 * Checks across all account collections to prevent duplicate email accounts.
 */
export async function isEmailAlreadyTaken(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const [adminUser, doctor, hospital, staff] = await Promise.all([
    mongoAdapter.getAdminCollection().findOne({ email: normalized }),
    mongoAdapter.getDoctorCollection().findOne({ email: normalized }),
    mongoAdapter.getHospitalCollection().findOne({ email: normalized }),
    mongoAdapter.getStaffCollection().findOne({ email: normalized }),
  ]);
  return !!(adminUser || doctor || hospital || staff);
}

export async function registerStaffRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/portal/doctor/staff
   * Creates a new staff member account under the authenticated doctor.
   * Strictly requires role === "DOCTOR".
   */
  app.post<{ Body: CreateStaffBody }>(
    "/api/v1/portal/doctor/staff",
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest<{ Body: CreateStaffBody }>, reply: FastifyReply) => {
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
          message: "Only verified Doctor accounts may manage practice staff.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const { name, email, password, role, phone, chamberLocation, permissions } = request.body || {};

      // 1. Validate required name
      if (!name || typeof name !== "string" || !name.trim()) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Full name is required.",
        });
      }

      // 2. Validate email
      if (!email || typeof email !== "string" || !email.trim()) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Email address is required.",
        });
      }

      const normalizedEmail = normalizeEmail(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Please provide a valid email address.",
        });
      }

      // 3. Validate password (min 8 characters)
      if (!password || typeof password !== "string" || password.length < 8) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Password is required and must be at least 8 characters long.",
        });
      }

      // 4. Validate duplicate email across system
      const isTaken = await isEmailAlreadyTaken(normalizedEmail);
      if (isTaken) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "An account with this email address already exists.",
        });
      }

      // 5. Validate assigned staff role
      const effectiveRole: StaffRoleType =
        role && VALID_STAFF_ROLES.includes(role as StaffRoleType)
          ? (role as StaffRoleType)
          : "Receptionist / Front Desk";

      // 6. Hash password securely
      const passwordHash = await hashPassword(password);

      // 7. Verify doctor existence
      const docCol = mongoAdapter.getDoctorCollection();
      const doctor = await docCol.findOne({ id: session.adminId });
      if (!doctor || doctor.accountStatus === "SUSPENDED") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Your doctor account is not active or authorized.",
        });
      }

      const nowIso = new Date().toISOString();
      const staffId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newStaffRecord: StaffRecord = {
        id: staffId,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "STAFF",
        staffRole: effectiveRole,
        tenantType: "DOCTOR",
        doctorId: doctor.id,
        chamberLocation: typeof chamberLocation === "string" && chamberLocation.trim() ? chamberLocation.trim() : "All Practice Chambers",
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
        permissions: {
          canManageQueue: permissions?.canManageQueue !== false,
          canBookPhoneAppointments: permissions?.canBookPhoneAppointments !== false,
          canViewPatientHistory: permissions?.canViewPatientHistory !== false,
          canCollectPayments: permissions?.canCollectPayments === true,
        },
        accountStatus: "ACTIVE",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const staffCol = mongoAdapter.getStaffCollection();
      await staffCol.insertOne(newStaffRecord);

      // Business event 3: Staff account successfully created (error isolated)
      const targetDoctorId = doctor.id;
      createNotification({
        id: `notif_staff_created_${newStaffRecord.id}`,
        doctorId: targetDoctorId,
        type: "system",
        priority: "normal",
        title: "New Staff Account Authorized",
        message: `Staff member ${newStaffRecord.name} (${newStaffRecord.staffRole}) authorized for practice access.`,
        read: false,
        chamberName: newStaffRecord.chamberLocation,
        actionLink: "/staff",
        actionLabel: "Review Staff Access",
        eventRef: `staff_created:${newStaffRecord.id}`,
      }).catch((notifErr) => {
        request.log.error(notifErr, "Failed to create staff notification record");
      });

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: "Staff member created successfully.",
        staff: sanitizeStaffRecord(newStaffRecord),
      });
    },
  );

  /**
   * GET /api/v1/portal/doctor/staff
   * Returns all staff members belonging to the authenticated Doctor.
   * Scoped to session.adminId (tenant isolation).
   */
  app.get(
    "/api/v1/portal/doctor/staff",
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
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
          message: "Only verified Doctor accounts may access staff management.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const staffCol = mongoAdapter.getStaffCollection();
      const records = await staffCol
        .find({
          tenantType: "DOCTOR",
          doctorId: session.adminId,
        })
        .sort({ createdAt: -1 })
        .toArray();

      const safeStaff = records.map(sanitizeStaffRecord);

      return reply.status(200).send({
        statusCode: 200,
        staff: safeStaff,
      });
    },
  );

  /**
   * PATCH /api/v1/portal/doctor/staff/:id
   * Updates an existing staff member. Scoped to authenticated Doctor.
   */
  app.patch<{ Params: { id: string }; Body: UpdateStaffBody }>(
    "/api/v1/portal/doctor/staff/:id",
    { preHandler: [authenticateAdmin] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateStaffBody }>,
      reply: FastifyReply,
    ) => {
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
          message: "Only verified Doctor accounts may manage staff.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const { id } = request.params;
      const staffCol = mongoAdapter.getStaffCollection();
      const existing = await staffCol.findOne({
        id,
        tenantType: "DOCTOR",
        doctorId: session.adminId,
      });

      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Staff member not found under your practice.",
        });
      }

      const updates: Partial<StaffRecord> = {
        updatedAt: new Date().toISOString(),
      };

      const body = request.body || {};

      if (typeof body.name === "string" && body.name.trim()) {
        updates.name = body.name.trim();
      }

      if (typeof body.phone === "string") {
        updates.phone = body.phone.trim();
      }

      if (typeof body.chamberLocation === "string" && body.chamberLocation.trim()) {
        updates.chamberLocation = body.chamberLocation.trim();
      }

      if (body.role && VALID_STAFF_ROLES.includes(body.role as StaffRoleType)) {
        updates.staffRole = body.role as StaffRoleType;
      }

      if (body.accountStatus === "ACTIVE" || body.accountStatus === "SUSPENDED") {
        updates.accountStatus = body.accountStatus;
      }

      if (body.permissions && typeof body.permissions === "object") {
        updates.permissions = {
          ...existing.permissions,
          ...body.permissions,
        };
      }

      if (typeof body.password === "string" && body.password.length > 0) {
        if (body.password.length < 8) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Password must be at least 8 characters long.",
          });
        }
        updates.passwordHash = await hashPassword(body.password);
      }

      await staffCol.updateOne({ id, doctorId: session.adminId }, { $set: updates });

      const updated = await staffCol.findOne({ id, doctorId: session.adminId });
      if (!updated) {
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Failed to reload updated staff member.",
        });
      }

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Staff member updated successfully.",
        staff: sanitizeStaffRecord(updated),
      });
    },
  );

  /**
   * DELETE /api/v1/portal/doctor/staff/:id
   * Removes a staff member from the authenticated Doctor's practice.
   */
  app.delete<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/staff/:id",
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
          message: "Only verified Doctor accounts may manage staff.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const { id } = request.params;
      const staffCol = mongoAdapter.getStaffCollection();
      const result = await staffCol.deleteOne({
        id,
        tenantType: "DOCTOR",
        doctorId: session.adminId,
      });

      if (result.deletedCount === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Staff member not found under your practice.",
        });
      }

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Staff member removed successfully.",
      });
    },
  );
}
