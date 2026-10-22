import crypto from "node:crypto";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import type {
  AuditLogRecord,
  AuditCategory,
  AuditActionType,
  AuditActor,
} from "./admin.types.js";

export interface CreateAuditLogParams {
  category: AuditCategory;
  action: AuditActionType;
  actor: AuditActor;
  targetType: "DOCTOR" | "HOSPITAL" | "ADMIN_USER" | "SUBSCRIPTION" | "PLATFORM_SETTING" | "REGISTRATION";
  targetId: string;
  targetName: string;
  summary: string;
  reason?: string | undefined;
  ipAddress: string;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Records an immutable administrative audit log entry directly into MongoDB Atlas.
 */
export async function recordAuditLogEntry(params: CreateAuditLogParams): Promise<AuditLogRecord> {
  const auditId = `AUD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const record: AuditLogRecord = {
    id: auditId,
    timestamp: nowIso,
    category: params.category,
    action: params.action,
    actor: {
      adminId: params.actor.adminId,
      adminName: params.actor.adminName,
      adminEmail: params.actor.adminEmail,
      adminRole: params.actor.adminRole,
    },
    targetType: params.targetType,
    targetId: params.targetId,
    targetName: params.targetName,
    summary: params.summary,
    reason: params.reason,
    ipAddress: params.ipAddress || "127.0.0.1",
    metadata: params.metadata,
  };

  if (mongoAdapter.isConnected()) {
    try {
      await mongoAdapter.getAuditLogCollection().insertOne(record);
    } catch (err) {
      // Non-blocking log persistence failure warning
      console.error("[AUDIT LOG ERROR] Failed to persist audit entry:", err instanceof Error ? err.message : err);
    }
  }

  return record;
}
