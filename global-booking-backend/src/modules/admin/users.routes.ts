import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin, requirePermission } from "../auth/auth.guard.js";
import { normalizeEmail, hashPassword, sanitizeAdminProfile } from "../auth/auth.service.js";
import { recordAuditLogEntry } from "./audit.service.js";
import {
  SUPER_ADMIN_ROLES,
  ALL_ADMIN_PERMISSIONS,
  type SuperAdminRole,
  type AdminPermission,
  type AdminUserRecord,
} from "../auth/auth.types.js";

interface UsersQuerystring {
  search?: string;
  role?: string;
  status?: string;
  page?: string;
  limit?: string;
}

interface CreateAdminUserBody {
  name: string;
  email: string;
  password: string;
  role: SuperAdminRole;
  permissions?: AdminPermission[];
}

interface UpdateStatusBody {
  isActive: boolean;
  reason?: string;
}

interface UpdatePermissionsBody {
  role?: SuperAdminRole;
  permissions: AdminPermission[];
  reason?: string;
}

/**
 * Default permission sets by role
 */
export function getDefaultPermissionsForRole(role: SuperAdminRole): AdminPermission[] {
  switch (role) {
    case "SUPER_ADMIN":
      return [...ALL_ADMIN_PERMISSIONS];
    case "OPERATIONS_ADMIN":
      return [
        "MANAGE_REGISTRATIONS",
        "APPROVE_ACCOUNTS",
        "REJECT_ACCOUNTS",
        "VIEW_DOCTORS",
        "MANAGE_DOCTORS",
        "VIEW_HOSPITALS",
        "MANAGE_HOSPITALS",
        "SUSPEND_ACCOUNTS",
        "REACTIVATE_ACCOUNTS",
        "VIEW_AUDIT_LOGS",
      ];
    case "BILLING_ADMIN":
      return [
        "VIEW_DOCTORS",
        "VIEW_HOSPITALS",
        "MANAGE_SUBSCRIPTIONS",
        "VIEW_AUDIT_LOGS",
      ];
    case "AUDIT_VIEWER":
      return ["VIEW_AUDIT_LOGS"];
  }
}

export async function registerAdminUsersRoutes(app: FastifyInstance): Promise<void> {
  const getAdminCol = () => mongoAdapter.getAdminCollection();

  /**
   * GET /api/v1/admin/users
   * Lists administrative users with search, role filter, status filter, and pagination
   */
  app.get<{ Querystring: UsersQuerystring }>(
    "/api/v1/admin/users",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_ADMIN_USERS")],
    },
    async (request: FastifyRequest<{ Querystring: UsersQuerystring }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { search, role, status, page = "1", limit = "20" } = request.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, unknown> = {};

      if (search?.trim()) {
        const regex = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ name: regex }, { email: regex }, { adminId: regex }];
      }

      if (role && SUPER_ADMIN_ROLES.includes(role as SuperAdminRole)) {
        filter.role = role;
      }

      if (status === "ACTIVE") {
        filter.isActive = true;
      } else if (status === "INACTIVE") {
        filter.isActive = false;
      }

      const [total, records] = await Promise.all([
        getAdminCol().countDocuments(filter),
        getAdminCol()
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
      ]);

      const items = records.map(sanitizeAdminProfile);

      return reply.status(200).send({
        statusCode: 200,
        items,
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
   * GET /api/v1/admin/users/:id
   * Retrieves single admin profile by adminId
   */
  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/users/:id",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_ADMIN_USERS")],
    },
    async (request, reply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const record = await getAdminCol().findOne({ adminId: id });

      if (!record) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Administrator with ID ${id} not found.`,
        });
      }

      return reply.status(200).send({
        statusCode: 200,
        user: sanitizeAdminProfile(record),
      });
    },
  );

  /**
   * POST /api/v1/admin/users
   * Creates a new administrative user with bcrypt-hashed credentials and assigned role
   */
  app.post<{ Body: CreateAdminUserBody }>(
    "/api/v1/admin/users",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_ADMIN_USERS")],
    },
    async (request, reply) => {
      const { name, email, password, role, permissions } = request.body || {};

      if (!name?.trim() || !email?.trim() || !password || !role) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Name, email, password, and role are required.",
        });
      }

      if (typeof password !== "string" || password.length < 8) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Password must be at least 8 characters long.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      if (!SUPER_ADMIN_ROLES.includes(role)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Invalid administrator role. Allowed roles: ${SUPER_ADMIN_ROLES.join(", ")}`,
        });
      }

      // Privilege escalation guard: Only SUPER_ADMIN can create another SUPER_ADMIN
      const actor = request.adminUser!;
      if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Only a verified Super Admin can create another Super Admin account.",
        });
      }

      const normalizedEmail = normalizeEmail(email);

      // Check duplicate email
      const existing = await getAdminCol().findOne({ email: normalizedEmail });
      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `An administrator account with email ${normalizedEmail} already exists.`,
        });
      }

      // Validate or default permissions
      let finalPermissions: AdminPermission[];
      if (Array.isArray(permissions) && permissions.length > 0) {
        const invalid = permissions.filter((p) => !ALL_ADMIN_PERMISSIONS.includes(p));
        if (invalid.length > 0) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: `Invalid permissions provided: ${invalid.join(", ")}`,
          });
        }
        // Non-super-admin cannot grant MANAGE_ADMIN_USERS
        if (actor.role !== "SUPER_ADMIN" && permissions.includes("MANAGE_ADMIN_USERS")) {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Only a verified Super Admin can grant the MANAGE_ADMIN_USERS permission.",
          });
        }
        finalPermissions = [...permissions];
      } else {
        finalPermissions = getDefaultPermissionsForRole(role);
      }

      const passwordHash = await hashPassword(password);
      const adminId = `ADM-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const newRecord: AdminUserRecord = {
        adminId,
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        role,
        permissions: finalPermissions,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await getAdminCol().insertOne(newRecord);

      // Audit log
      await recordAuditLogEntry({
        category: "PERMISSIONS_UPDATE",
        action: "ACCOUNT_CREATED",
        actor: {
          adminId: actor.adminId,
          adminName: actor.email,
          adminEmail: actor.email,
          adminRole: actor.role,
        },
        targetType: "ADMIN_USER",
        targetId: adminId,
        targetName: newRecord.name,
        summary: `Created new administrator: ${newRecord.name} (${role}) with ${finalPermissions.length} permissions`,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          role,
          permissionsCount: finalPermissions.length,
        },
      });

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: "Administrator account created successfully.",
        user: sanitizeAdminProfile(newRecord),
      });
    },
  );

  /**
   * PATCH /api/v1/admin/users/:id/status
   * Activates or deactivates an administrative account
   */
  app.patch<{ Params: { id: string }; Body: UpdateStatusBody }>(
    "/api/v1/admin/users/:id/status",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_ADMIN_USERS")],
    },
    async (request, reply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const { isActive, reason } = request.body || {};

      if (typeof isActive !== "boolean") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "isActive boolean is required.",
        });
      }

      const actor = request.adminUser!;

      // Self-deactivation guard: Cannot deactivate own account
      if (actor.adminId === id && !isActive) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "You cannot deactivate your own administrative account.",
        });
      }

      const target = await getAdminCol().findOne({ adminId: id });
      if (!target) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Administrator with ID ${id} not found.`,
        });
      }

      // Sole Super Admin guard: Cannot deactivate last remaining active Super Admin
      if (target.role === "SUPER_ADMIN" && !isActive) {
        const activeSuperAdminCount = await getAdminCol().countDocuments({
          role: "SUPER_ADMIN",
          isActive: true,
        });

        if (activeSuperAdminCount <= 1) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "Cannot deactivate the sole remaining active Super Admin account. System lockout prevented.",
          });
        }
      }

      const nowIso = new Date().toISOString();
      await getAdminCol().updateOne(
        { adminId: id },
        { $set: { isActive, updatedAt: nowIso } },
      );

      const action = isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_SUSPENDED";
      const summary = `${isActive ? "Reactivated" : "Deactivated"} administrator account ${target.name} (${target.adminId})`;

      await recordAuditLogEntry({
        category: "PERMISSIONS_UPDATE",
        action,
        actor: {
          adminId: actor.adminId,
          adminName: actor.email,
          adminEmail: actor.email,
          adminRole: actor.role,
        },
        targetType: "ADMIN_USER",
        targetId: id,
        targetName: target.name,
        summary,
        reason: reason?.trim() || undefined,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          previousStatus: target.isActive ? "ACTIVE" : "INACTIVE",
          newStatus: isActive ? "ACTIVE" : "INACTIVE",
        },
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: `Administrator account ${isActive ? "reactivated" : "deactivated"} successfully.`,
        user: sanitizeAdminProfile({ ...target, isActive, updatedAt: nowIso }),
      });
    },
  );

  /**
   * PATCH /api/v1/admin/users/:id/permissions
   * Updates an administrator's role and granular permissions
   */
  app.patch<{ Params: { id: string }; Body: UpdatePermissionsBody }>(
    "/api/v1/admin/users/:id/permissions",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_ADMIN_USERS")],
    },
    async (request, reply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { id } = request.params;
      const { role, permissions, reason } = request.body || {};

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "A non-empty array of permissions is required.",
        });
      }

      const invalidPermissions = permissions.filter((p) => !ALL_ADMIN_PERMISSIONS.includes(p));
      if (invalidPermissions.length > 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Invalid permissions: ${invalidPermissions.join(", ")}`,
        });
      }

      if (role && !SUPER_ADMIN_ROLES.includes(role)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Invalid role: ${role}`,
        });
      }

      const actor = request.adminUser!;
      const target = await getAdminCol().findOne({ adminId: id });

      if (!target) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Administrator with ID ${id} not found.`,
        });
      }

      // Sole Super Admin demotion guard
      const newRole = role || target.role;
      if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
        const activeSuperAdminCount = await getAdminCol().countDocuments({
          role: "SUPER_ADMIN",
          isActive: true,
        });

        if (activeSuperAdminCount <= 1) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "Cannot demote the sole remaining active Super Admin account. System lockout prevented.",
          });
        }
      }

      // Non-super-admin privilege escalation guard
      if (actor.role !== "SUPER_ADMIN") {
        if (newRole === "SUPER_ADMIN") {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Only a verified Super Admin can assign the SUPER_ADMIN role.",
          });
        }
        if (permissions.includes("MANAGE_ADMIN_USERS")) {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Only a verified Super Admin can grant the MANAGE_ADMIN_USERS permission.",
          });
        }
      }

      const nowIso = new Date().toISOString();
      await getAdminCol().updateOne(
        { adminId: id },
        {
          $set: {
            role: newRole,
            permissions,
            updatedAt: nowIso,
          },
        },
      );

      await recordAuditLogEntry({
        category: "PERMISSIONS_UPDATE",
        action: "PERMISSIONS_MODIFIED",
        actor: {
          adminId: actor.adminId,
          adminName: actor.email,
          adminEmail: actor.email,
          adminRole: actor.role,
        },
        targetType: "ADMIN_USER",
        targetId: id,
        targetName: target.name,
        summary: `Updated role to ${newRole} and assigned ${permissions.length} permissions for ${target.name}`,
        reason: reason?.trim() || undefined,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          previousRole: target.role,
          newRole,
          previousPermissionsCount: target.permissions.length,
          newPermissionsCount: permissions.length,
        },
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Administrator permissions updated successfully.",
        user: sanitizeAdminProfile({
          ...target,
          role: newRole,
          permissions,
          updatedAt: nowIso,
        }),
      });
    },
  );
}
