try {
  process.loadEnvFile?.();
} catch {
  // Ignored if .env is missing or already loaded
}

import { mongoAdapter } from "../infrastructure/database/mongo.adapter.js";
import { readServerEnvironment } from "../config/environment.js";
import { normalizeEmail, hashPassword } from "../modules/auth/auth.service.js";

async function main() {
  readServerEnvironment();

  console.log("Connecting to MongoDB Atlas...");
  await mongoAdapter.connect();

  const docCol = mongoAdapter.getDoctorCollection();
  const targetEmail = normalizeEmail(process.env.DOCTOR_EMAIL || "doctor@booking.com");
  const targetPassword = process.env.DOCTOR_PASSWORD || "1234@1234";

  console.log(`Checking doctor account: ${targetEmail}`);
  const existing = await docCol.findOne({ email: targetEmail });

  if (!existing) {
    console.error(`No doctor found with email: ${targetEmail}`);
    await mongoAdapter.disconnect();
    process.exit(1);
  }

  const passwordHash = await hashPassword(targetPassword);
  const nowIso = new Date().toISOString();

  console.log(`Updating password for Doctor ${existing.fullName} (${existing.id})...`);
  await docCol.updateOne(
    { id: existing.id },
    {
      $set: {
        passwordHash,
        accountStatus: "ACTIVE",
        updatedAt: nowIso,
      },
    },
  );

  console.log("DOCTOR_CREDENTIALS_UPDATED");
  console.log(`Doctor Email: ${targetEmail}`);
  console.log(`Doctor Password: ${targetPassword}`);

  await mongoAdapter.disconnect();
}

main().catch((err) => {
  console.error("Failed to update doctor credentials:", err);
  process.exit(1);
});
