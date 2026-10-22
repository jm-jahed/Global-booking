import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { generateSafeDoctorSlug } from "../modules/portal/doctor-portal.routes.js";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // ignore
}

async function run() {
  const envPath = path.resolve(process.cwd(), ".env");
  let uri = "mongodb+srv://global-booking:zL1uzjOMVA0kDsuo@cluster0.sjhnvij.mongodb.net/global_booking?retryWrites=true&w=majority";
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^MONGODB_URI=(.*)$/);
      if (match && match[1]) {
        uri = match[1].trim();
        break;
      }
    }
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("global_booking");
  const docs = await db.collection("doctors").find({}).toArray();

  for (const doc of docs) {
    const slug = doc.slug || generateSafeDoctorSlug(doc.fullName || "", doc.doctorId || doc.id || "");
    const chambers = (Array.isArray(doc.chambers) && doc.chambers.length > 0)
      ? doc.chambers
      : [
          {
            id: "CHAMBER-1",
            facilityName: doc.chamberLocationsSummary || "Main Consultation Chamber",
            city: "Dubai",
            visitingSchedule: "Daily 05:00 PM – 09:00 PM",
          },
        ];
    const services = (Array.isArray(doc.services) && doc.services.length > 0)
      ? doc.services
      : [
          {
            id: "SRV-1",
            title: `${doc.specialty || "Specialist"} Consultation`,
            category: doc.specialty || "General",
            description: "Comprehensive clinical diagnostic evaluation and patient consultation.",
          },
        ];

    await db.collection("doctors").updateOne(
      { _id: doc._id },
      {
        $set: {
          slug,
          isPublished: true,
          chambers,
          services,
        },
      }
    );
    console.log(`[MIGRATED] Doctor: ${doc.fullName} (${doc.id}) -> slug: "${slug}", isPublished: true`);
  }

  await client.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
