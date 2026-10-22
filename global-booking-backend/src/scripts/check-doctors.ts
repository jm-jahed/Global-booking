import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

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

  console.log("=== TOTAL DOCTORS FOUND: " + docs.length + " ===");
  const { verifyPassword, hashPassword } = await import("../modules/auth/auth.service.js");
  for (const d of docs) {
    let matches1234 = false;
    if (d.passwordHash) {
      matches1234 = await verifyPassword("1234@1234", d.passwordHash);
    } else {
      const defaultHash = await hashPassword("1234@1234");
      await db.collection("doctors").updateOne({ _id: d._id }, { $set: { passwordHash: defaultHash, accountStatus: "ACTIVE" } });
      matches1234 = true;
      console.log(`Set password 1234@1234 for ${d.fullName} (${d.email})`);
    }
    console.log({
      _id: d._id.toString(),
      id: d.id,
      doctorId: d.doctorId,
      fullName: d.fullName,
      email: d.email,
      slug: d.slug,
      accountStatus: d.accountStatus,
      isPublished: d.isPublished,
      hasPassword: true,
      passwordIs1234: matches1234,
    });
  }

  await client.close();
}

run().catch(console.error);
