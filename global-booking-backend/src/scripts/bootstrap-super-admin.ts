// Ensure local .env is loaded if running directly
try {
  process.loadEnvFile?.();
} catch {
  // Ignored if .env is missing or already loaded
}

import { mongoAdapter } from "../infrastructure/database/mongo.adapter.js";
import { readServerEnvironment } from "../config/environment.js";
import { normalizeEmail, hashPassword } from "../modules/auth/auth.service.js";
import { ALL_ADMIN_PERMISSIONS, type AdminUserRecord } from "../modules/auth/auth.types.js";

/**
 * Super Admin Bootstrap CLI Script.
 * Adapted for GLOBAL BOOKING architecture.
 * Enforces atomic single-Super-Admin rule and never hardcodes credentials.
 */
export async function runBootstrap(customConfig?: {
  email?: string;
  password?: string;
  name?: string;
}): Promise<{ success: boolean; message: string; adminId?: string }> {
  readServerEnvironment();

  const emailInput = customConfig?.email ?? process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const passwordInput = customConfig?.password ?? process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const nameInput = customConfig?.name ?? process.env.BOOTSTRAP_SUPER_ADMIN_NAME ?? "Super Admin";

  if (!emailInput || !passwordInput) {
    const errorMsg =
      "Bootstrap configuration missing: Please set BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_PASSWORD environment variables.";
    return { success: false, message: errorMsg };
  }

  const normalizedEmail = normalizeEmail(emailInput);
  if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
    return { success: false, message: "Invalid email format for Super Admin bootstrap." };
  }

  if (passwordInput.length < 10) {
    return { success: false, message: "Bootstrap password must be at least 10 characters long for security." };
  }

  // Connect to MongoDB using validated environment
  if (!mongoAdapter.isConnected()) {
    await mongoAdapter.connect();
  }

  const adminCol = mongoAdapter.getAdminCollection();

  // Atomically check if any Super Admin account already exists
  const existingSuperAdmin = await adminCol.findOne({ role: "SUPER_ADMIN" });
  if (existingSuperAdmin) {
    return {
      success: false,
      message: `[BOOTSTRAP REFUSED] A Super Admin account (${existingSuperAdmin.adminId}) already exists. Single-Super-Admin bootstrap rule enforced. Aborting.`,
    };
  }

  // Check if target email is already taken
  const emailCollision = await adminCol.findOne({ email: normalizedEmail });
  if (emailCollision) {
    return {
      success: false,
      message: `[BOOTSTRAP REFUSED] An account with email ${normalizedEmail} already exists. Aborting.`,
    };
  }

  // Hash password with bcrypt (minimum 12 rounds)
  const passwordHash = await hashPassword(passwordInput);

  const nowIso = new Date().toISOString();
  const adminId = "ADM-1001";

  const newAdminRecord: AdminUserRecord = {
    adminId,
    email: normalizedEmail,
    passwordHash,
    name: nameInput.trim(),
    role: "SUPER_ADMIN",
    permissions: [...ALL_ADMIN_PERMISSIONS],
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await adminCol.insertOne(newAdminRecord);

  return {
    success: true,
    message: `[BOOTSTRAP SUCCESS] Super Admin (${adminId}) successfully created with 13 platform permissions.`,
    adminId,
  };
}

// Direct CLI execution guard
if (process.argv[1]?.endsWith("bootstrap-super-admin.ts") || process.argv[1]?.endsWith("bootstrap-super-admin.js")) {
  runBootstrap()
    .then((result) => {
      console.log(result.message);
      process.exitCode = result.success ? 0 : 1;
    })
    .catch((err) => {
      console.error("[BOOTSTRAP ERROR]", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => {
      void mongoAdapter.disconnect();
    });
}
