import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin, requirePermission } from "../auth/auth.guard.js";
import { recordAuditLogEntry } from "./audit.service.js";

export interface PlatformSettingsRecord {
  id: "PLATFORM_SETTINGS";
  platformName: string;
  supportEmail: string;
  defaultCurrency: "AED";
  maintenanceMode: boolean;
  registrationAutoReviewEnabled: boolean;
  securityPolicies: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutHours: number;
    requireStrongPassword: boolean;
  };
  providerOnboardingPolicies: {
    requireLicenseVerification: boolean;
    defaultTrialDays: number;
    allowInstantDoctorAccess: boolean;
  };
  updatedAt: string;
  updatedByAdminName?: string;
  updatedByAdminId?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsRecord = {
  id: "PLATFORM_SETTINGS",
  platformName: "Global Booking Healthcare Platform",
  supportEmail: "support@globalbooking.ae",
  defaultCurrency: "AED",
  maintenanceMode: false,
  registrationAutoReviewEnabled: false,
  securityPolicies: {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 1,
    sessionTimeoutHours: 24,
    requireStrongPassword: true,
  },
  providerOnboardingPolicies: {
    requireLicenseVerification: true,
    defaultTrialDays: 14,
    allowInstantDoctorAccess: false,
  },
  updatedAt: new Date().toISOString(),
};

interface UpdateSettingsBody {
  platformName?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
  registrationAutoReviewEnabled?: boolean;
  securityPolicies?: Partial<PlatformSettingsRecord["securityPolicies"]>;
  providerOnboardingPolicies?: Partial<PlatformSettingsRecord["providerOnboardingPolicies"]>;
}

export async function registerPlatformSettingsRoutes(app: FastifyInstance): Promise<void> {
  const getCollection = () => mongoAdapter.getDb().collection("platform_settings");

  /**
   * GET /api/v1/admin/settings
   * Retrieves active platform configuration from MongoDB Atlas
   */
  app.get(
    "/api/v1/admin/settings",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_PLATFORM_SETTINGS")],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const col = getCollection();
      let settings = await col.findOne({ id: "PLATFORM_SETTINGS" });

      if (!settings) {
        const initial = {
          ...DEFAULT_PLATFORM_SETTINGS,
          updatedAt: new Date().toISOString(),
        };
        await col.insertOne(initial);
        settings = await col.findOne({ id: "PLATFORM_SETTINGS" });
      }

      const safeSettings = settings ? { ...settings } : { ...DEFAULT_PLATFORM_SETTINGS };
      delete (safeSettings as Record<string, unknown>)._id;

      return reply.status(200).send({
        statusCode: 200,
        settings: safeSettings,
      });
    },
  );

  /**
   * PATCH /api/v1/admin/settings
   * Updates platform operational and security policies
   */
  app.patch<{ Body: UpdateSettingsBody }>(
    "/api/v1/admin/settings",
    {
      preHandler: [authenticateAdmin, requirePermission("MANAGE_PLATFORM_SETTINGS")],
    },
    async (request, reply) => {
      const body = request.body || {};
      const actor = request.adminUser!;

      // Validate numeric policies if provided
      if (body.securityPolicies) {
        const { maxLoginAttempts, sessionTimeoutHours } = body.securityPolicies;
        if (maxLoginAttempts !== undefined && (maxLoginAttempts < 3 || maxLoginAttempts > 15)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Max login attempts must be between 3 and 15.",
          });
        }
        if (sessionTimeoutHours !== undefined && (sessionTimeoutHours < 1 || sessionTimeoutHours > 168)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Session timeout must be between 1 and 168 hours.",
          });
        }
      }

      if (body.providerOnboardingPolicies) {
        const { defaultTrialDays } = body.providerOnboardingPolicies;
        if (defaultTrialDays !== undefined && (defaultTrialDays < 7 || defaultTrialDays > 90)) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Default trial days must be between 7 and 90 days.",
          });
        }
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const col = getCollection();
      const existing = (await col.findOne({ id: "PLATFORM_SETTINGS" })) as PlatformSettingsRecord | null;
      const current: PlatformSettingsRecord = existing ? { ...existing } : { ...DEFAULT_PLATFORM_SETTINGS };

      const nowIso = new Date().toISOString();

      const updatedRecord: PlatformSettingsRecord = {
        id: "PLATFORM_SETTINGS",
        platformName: body.platformName?.trim() || current.platformName,
        supportEmail: body.supportEmail?.trim() || current.supportEmail,
        defaultCurrency: "AED", // Strictly locked to AED
        maintenanceMode:
          typeof body.maintenanceMode === "boolean" ? body.maintenanceMode : current.maintenanceMode,
        registrationAutoReviewEnabled:
          typeof body.registrationAutoReviewEnabled === "boolean"
            ? body.registrationAutoReviewEnabled
            : current.registrationAutoReviewEnabled,
        securityPolicies: {
          ...current.securityPolicies,
          ...(body.securityPolicies || {}),
        },
        providerOnboardingPolicies: {
          ...current.providerOnboardingPolicies,
          ...(body.providerOnboardingPolicies || {}),
        },
        updatedAt: nowIso,
        updatedByAdminId: actor.adminId,
        updatedByAdminName: actor.email,
      };

      await col.updateOne(
        { id: "PLATFORM_SETTINGS" },
        { $set: updatedRecord },
        { upsert: true },
      );

      // Audit log
      await recordAuditLogEntry({
        category: "PLATFORM_CONFIGURATION",
        action: "SETTINGS_UPDATED",
        actor: {
          adminId: actor.adminId,
          adminName: actor.email,
          adminEmail: actor.email,
          adminRole: actor.role,
        },
        targetType: "PLATFORM_SETTING",
        targetId: "PLATFORM_SETTINGS",
        targetName: updatedRecord.platformName,
        summary: `Platform settings updated by ${actor.email}. Maintenance Mode: ${updatedRecord.maintenanceMode ? "Enabled" : "Disabled"}`,
        ipAddress: request.ip || "127.0.0.1",
        metadata: {
          maintenanceMode: updatedRecord.maintenanceMode,
          securityPolicies: updatedRecord.securityPolicies,
          providerOnboardingPolicies: updatedRecord.providerOnboardingPolicies,
        },
      });

      const safeResult = { ...updatedRecord };
      delete (safeResult as Record<string, unknown>)._id;

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Platform settings updated successfully.",
        settings: safeResult,
      });
    },
  );
}
