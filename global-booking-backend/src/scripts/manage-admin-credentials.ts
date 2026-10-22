try {
  process.loadEnvFile?.();
} catch {
  // Ignored if .env is missing or already loaded
}

import { mongoAdapter } from "../infrastructure/database/mongo.adapter.js";
import { readServerEnvironment } from "../config/environment.js";
import { normalizeEmail, hashPassword } from "../modules/auth/auth.service.js";
import { ALL_ADMIN_PERMISSIONS, type AdminUserRecord } from "../modules/auth/auth.types.js";

async function main() {
  readServerEnvironment();

  console.log("Connecting to MongoDB Atlas...");
  await mongoAdapter.connect();

  const adminCol = mongoAdapter.getAdminCollection();
  const targetEmail = normalizeEmail(process.env.ADMIN_EMAIL || "superadmin@globalbooking.ae");
  const targetPassword = process.env.ADMIN_PASSWORD || "SuperAdmin@2026!";
  const targetName = process.env.ADMIN_NAME || "Super Admin";

  console.log(`Checking admin user: ${targetEmail}`);
  const existing = await adminCol.findOne({ email: targetEmail });

  const passwordHash = await hashPassword(targetPassword);
  const nowIso = new Date().toISOString();

  if (existing) {
    console.log(`Updating existing Super Admin account (${existing.adminId})...`);
    await adminCol.updateOne(
      { adminId: existing.adminId },
      {
        $set: {
          passwordHash,
          name: targetName,
          role: "SUPER_ADMIN",
          permissions: [...ALL_ADMIN_PERMISSIONS],
          isActive: true,
          updatedAt: nowIso,
        },
      },
    );
    console.log("SUPER_ADMIN_CREDENTIALS_UPDATED");
  } else {
    const adminId = "ADM-1001";
    console.log(`Creating new Super Admin account (${adminId})...`);
    const record: AdminUserRecord = {
      adminId,
      email: targetEmail,
      passwordHash,
      name: targetName,
      role: "SUPER_ADMIN",
      permissions: [...ALL_ADMIN_PERMISSIONS],
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await adminCol.insertOne(record);
    console.log("SUPER_ADMIN_CREDENTIALS_CREATED");
  }

  const allAdmins = await adminCol.find({}, { projection: { passwordHash: 0 } }).toArray();
  console.log("\nCurrent Admin Users in Database:");
  console.log(JSON.stringify(allAdmins, null, 2));

  console.log("\n=======================================================");
  console.log("  SUPER ADMIN LOGIN CREDENTIALS:");
  console.log(`  Login URL: http://localhost:3000/admin/login`);
  console.log(`  Email:    ${targetEmail}`);
  console.log(`  Password: ${targetPassword}`);
  console.log("=======================================================\n");

  await mongoAdapter.disconnect();
}

main().catch((err) => {
  console.error("Error managing admin credentials:", err);
  process.exit(1);
});
