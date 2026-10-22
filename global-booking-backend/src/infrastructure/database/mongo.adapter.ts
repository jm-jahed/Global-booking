import dns from "node:dns";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { DatabasePort, DatabaseConnectionSettings } from "./database.port.js";
import type { AdminUserRecord } from "../../modules/auth/auth.types.js";
import type {
  RegistrationRecord,
  DoctorRecord,
  HospitalRecord,
  SubscriptionRecord,
  AuditLogRecord,
} from "../../modules/admin/admin.types.js";
import type { QueueTicketRecord, QueueCounterRecord } from "../../modules/queue/queue.types.js";

export class MongoDatabaseAdapter implements DatabasePort {
  readonly providerName = "mongodb";
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected = false;

  async connect(
    settings: DatabaseConnectionSettings = {
      provider: "mongodb",
      connectionStringEnvironmentVariable: "MONGODB_URI",
    },
    explicitUri?: string,
    explicitDbName?: string,
  ): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    const uri = explicitUri ?? process.env[settings.connectionStringEnvironmentVariable]?.trim();
    if (!uri) {
      throw new Error(
        `Database configuration error: ${settings.connectionStringEnvironmentVariable} is not configured.`,
      );
    }

    const dbName = explicitDbName ?? (process.env.MONGODB_DB_NAME?.trim() || "global_booking");

    // Ensure reliable DNS resolution for Atlas SRV connection strings
    if (uri.startsWith("mongodb+srv://")) {
      try {
        const rawServers = dns.getServers();
        const validServers = rawServers.filter((s) => s !== "127.0.0.1" && s !== "::1");
        dns.setServers(["8.8.8.8", "1.1.1.1", ...validServers]);
      } catch {
        // Fallback silently if environment restricts custom DNS configuration
      }
    }

    try {
      // Driver uses secure TLS/SSL defaults for MongoDB Atlas connections (mongodb+srv://)
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8_000,
        connectTimeoutMS: 10_000,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);

      // Verify server connection with ping command
      await this.db.command({ ping: 1 });
      this.connected = true;

      // Ensure required indexes for Phase A, B & Queue
      await this.ensurePhaseAIndexes();
      await this.ensurePhaseBIndexes();
      await this.ensureQueueIndexes();
    } catch (error) {
      this.connected = false;
      this.client = null;
      this.db = null;

      // Never leak connection strings or credentials in errors
      const safeMessage = error instanceof Error ? error.message : "Connection failed";
      const sanitized = safeMessage.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, "mongodb://***:***@");
      throw new Error(`Failed to connect to MongoDB: ${sanitized}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } finally {
        this.client = null;
        this.db = null;
        this.connected = false;
      }
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  getDb(): Db {
    if (!this.db || !this.connected) {
      throw new Error("Database is not connected. Call connect() before accessing database.");
    }
    return this.db;
  }

  getAdminCollection(): Collection<AdminUserRecord> {
    return this.getDb().collection<AdminUserRecord>("admin_users");
  }

  getRegistrationCollection(): Collection<RegistrationRecord> {
    return this.getDb().collection<RegistrationRecord>("registrations");
  }

  getDoctorCollection(): Collection<DoctorRecord> {
    return this.getDb().collection<DoctorRecord>("doctors");
  }

  getHospitalCollection(): Collection<HospitalRecord> {
    return this.getDb().collection<HospitalRecord>("hospitals");
  }

  getSubscriptionCollection(): Collection<SubscriptionRecord> {
    return this.getDb().collection<SubscriptionRecord>("subscriptions");
  }

  getAuditLogCollection(): Collection<AuditLogRecord> {
    return this.getDb().collection<AuditLogRecord>("audit_logs");
  }

  getQueueTicketCollection(): Collection<QueueTicketRecord> {
    return this.getDb().collection<QueueTicketRecord>("queue_tickets");
  }

  getQueueCounterCollection(): Collection<QueueCounterRecord> {
    return this.getDb().collection<QueueCounterRecord>("queue_counters");
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  /**
   * Ensures essential indexes for Phase A:
   * 1. Unique normalized email index on admin_users
   * 2. Unique adminId index on admin_users
   */
  async ensurePhaseAIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }
    const adminCol = this.getAdminCollection();
    await adminCol.createIndex({ email: 1 }, { unique: true, background: true });
    await adminCol.createIndex({ adminId: 1 }, { unique: true, background: true });
  }

  /**
   * Ensures indexes for Phase B collections:
   * - registrations: id (unique), applicantEmail, status, accountType
   * - doctors: id (unique), doctorId (unique), email (unique), licenseNumber (unique), accountStatus
   * - hospitals: id (unique), hospitalId (unique), email (unique), licenseNumber (unique), accountStatus
   * - subscriptions: id (unique), accountId (unique), status
   * - audit_logs: id (unique), timestamp (desc), category, targetId
   */
  async ensurePhaseBIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }
    const regCol = this.getRegistrationCollection();
    await regCol.createIndex({ id: 1 }, { unique: true, background: true });
    await regCol.createIndex({ applicantEmail: 1 }, { background: true });
    await regCol.createIndex({ status: 1 }, { background: true });
    await regCol.createIndex({ accountType: 1 }, { background: true });

    const docCol = this.getDoctorCollection();
    await docCol.createIndex({ id: 1 }, { unique: true, background: true });
    await docCol.createIndex({ doctorId: 1 }, { unique: true, background: true });
    await docCol.createIndex({ email: 1 }, { unique: true, background: true });
    await docCol.createIndex({ licenseNumber: 1 }, { unique: true, background: true });
    await docCol.createIndex({ accountStatus: 1 }, { background: true });

    const hspCol = this.getHospitalCollection();
    await hspCol.createIndex({ id: 1 }, { unique: true, background: true });
    await hspCol.createIndex({ hospitalId: 1 }, { unique: true, background: true });
    await hspCol.createIndex({ email: 1 }, { unique: true, background: true });
    await hspCol.createIndex({ licenseNumber: 1 }, { unique: true, background: true });
    await hspCol.createIndex({ accountStatus: 1 }, { background: true });

    const subCol = this.getSubscriptionCollection();
    await subCol.createIndex({ id: 1 }, { unique: true, background: true });
    await subCol.createIndex({ accountId: 1 }, { unique: true, background: true });
    await subCol.createIndex({ status: 1 }, { background: true });

    const audCol = this.getAuditLogCollection();
    await audCol.createIndex({ id: 1 }, { unique: true, background: true });
    await audCol.createIndex({ timestamp: -1 }, { background: true });
    await audCol.createIndex({ category: 1 }, { background: true });
    await audCol.createIndex({ targetId: 1 }, { background: true });
  }

  /**
   * Ensures essential indexes for Phase 1B Queue engine:
   * 1. queue_tickets: id (unique), doctorId+chamberId+dateKey+serialIndex (unique), doctorId+idempotencyKey (unique sparse), doctorId+dateKey+status
   * 2. queue_counters: doctorId+chamberId+dateKey (unique compound key)
   */
  async ensureQueueIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }
    const ticketCol = this.getQueueTicketCollection();
    await ticketCol.createIndex({ id: 1 }, { unique: true, background: true });
    await ticketCol.createIndex(
      { doctorId: 1, chamberId: 1, dateKey: 1, serialIndex: 1 },
      { unique: true, background: true },
    );
    await ticketCol.createIndex(
      { doctorId: 1, idempotencyKey: 1 },
      { unique: true, sparse: true, background: true },
    );
    await ticketCol.createIndex(
      { doctorId: 1, dateKey: 1, status: 1 },
      { background: true },
    );

    const counterCol = this.getQueueCounterCollection();
    await counterCol.createIndex(
      { doctorId: 1, chamberId: 1, dateKey: 1 },
      { unique: true, background: true },
    );
  }
}

// Global singleton instance for application lifecycle
export const mongoAdapter = new MongoDatabaseAdapter();
