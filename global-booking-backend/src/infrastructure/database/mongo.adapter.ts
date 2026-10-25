import dns from "node:dns";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { DatabasePort, DatabaseConnectionSettings } from "./database.port.js";
import type { AdminUserRecord, StaffRecord } from "../../modules/auth/auth.types.js";
import type {
  RegistrationRecord,
  DoctorRecord,
  HospitalRecord,
  SubscriptionRecord,
  AuditLogRecord,
} from "../../modules/admin/admin.types.js";
import type { QueueTicketRecord, QueueCounterRecord } from "../../modules/queue/queue.types.js";
import type { AppointmentRecord } from "../../modules/appointments/appointments.types.js";
import type { PatientRecord } from "../../modules/patients/patients.types.js";
import type {
  NotificationRecord,
  NotificationPreferencesRecord,
} from "../../modules/notifications/notification.types.js";

export interface PatientIndexOperationResult {
  readonly spec: Record<string, 1 | -1>;
  readonly status: "CREATED" | "FAILED";
  readonly error?: string;
}

export interface PatientIndexMaintenanceReport {
  readonly success: boolean;
  readonly attempted: number;
  readonly created: number;
  readonly failed: number;
  readonly operations: PatientIndexOperationResult[];
}

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

      // Ensure required indexes for Phase A, B, Queue & Appointments
      // Note: Patient indexes are explicitly opt-in and NOT initialized automatically on connect()
      await this.ensurePhaseAIndexes();
      await this.ensurePhaseBIndexes();
      await this.ensureQueueIndexes();
      await this.ensureAppointmentIndexes();
      await this.ensureNotificationIndexes();
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

  getAppointmentCollection(): Collection<AppointmentRecord> {
    return this.getDb().collection<AppointmentRecord>("appointments");
  }

  getAppointmentCounterCollection(): Collection<{
    id: string;
    doctorId: string;
    chamberId: string;
    appointmentDate: string;
    lastSerial: number;
    updatedAt: string;
  }> {
    return this.getDb().collection("appointment_counters");
  }

  getPatientCollection(): Collection<PatientRecord> {
    return this.getDb().collection<PatientRecord>("patients");
  }

  getStaffCollection(): Collection<StaffRecord> {
    return this.getDb().collection<StaffRecord>("staff");
  }

  getNotificationCollection(): Collection<NotificationRecord> {
    return this.getDb().collection<NotificationRecord>("notifications");
  }

  getNotificationPreferencesCollection(): Collection<NotificationPreferencesRecord> {
    return this.getDb().collection<NotificationPreferencesRecord>("notification_preferences");
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

  /**
   * Ensures essential indexes for persistent Appointments:
   * 1. appointments: id (unique), referenceNumber (unique), doctorId+idempotencyKey (unique sparse)
   * 2. appointments: doctorId+appointmentDate+status, referenceNumber+patientPhone
   */
  async ensureAppointmentIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }
    const aptCol = this.getAppointmentCollection();
    await aptCol.createIndex({ id: 1 }, { unique: true, background: true });
    await aptCol.createIndex({ referenceNumber: 1 }, { unique: true, background: true });
    await aptCol.createIndex(
      { doctorId: 1, idempotencyKey: 1 },
      { unique: true, sparse: true, background: true },
    );
    await aptCol.createIndex(
      { doctorId: 1, appointmentDate: 1, status: 1 },
      { background: true },
    );
    await aptCol.createIndex(
      { referenceNumber: 1, patientPhone: 1 },
      { background: true },
    );
    try {
      await aptCol.createIndex(
        { doctorId: 1, appointmentDate: 1, bookingNumber: 1 },
        {
          unique: true,
          partialFilterExpression: { bookingNumber: { $type: "number" } },
          background: true,
        },
      );
    } catch {
      // Non-fatal if index conflicts with legacy unnumbered records
    }

    const counterCol = this.getAppointmentCounterCollection();
    try {
      await counterCol.createIndex(
        { doctorId: 1, appointmentDate: 1 },
        { unique: true, background: true },
      );
    } catch {
      // Non-fatal
    }
  }

  /**
   * Ensures essential indexes for persistent Notifications and Preferences:
   * 1. notifications: id (unique), doctorId+createdAt, doctorId+read, doctorId+type+createdAt
   * 2. notifications: doctorId+eventRef (unique, sparse for idempotency)
   * 3. notification_preferences: doctorId (unique)
   */
  async ensureNotificationIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }
    const notifCol = this.getNotificationCollection();
    await notifCol.createIndex({ id: 1 }, { unique: true, background: true });
    await notifCol.createIndex({ doctorId: 1, createdAt: -1 }, { background: true });
    await notifCol.createIndex({ doctorId: 1, read: 1 }, { background: true });
    await notifCol.createIndex({ doctorId: 1, type: 1, createdAt: -1 }, { background: true });
    await notifCol.createIndex(
      { doctorId: 1, eventRef: 1 },
      { unique: true, sparse: true, background: true },
    );

    const prefsCol = this.getNotificationPreferencesCollection();
    await prefsCol.createIndex({ doctorId: 1 }, { unique: true, background: true });
  }

  /**
   * EXPLICIT MAINTENANCE ONLY:
   * Initializes persistent Patients collection indexes on an opt-in basis.
   *
   * CRITICAL SAFETY RULES:
   * - Must NEVER be called automatically during connect(), server startup, application initialization, or request handling.
   * - Does NOT drop, alter, or replace existing indexes automatically.
   * - Operates on each index independently so that one failure does not prevent remaining operations from being attempted or diagnosed.
   * - Throws an aggregate Error if any index fails, detailing all attempted operations.
   * - Preflight Requirement: Verify legacy database does not contain duplicate IDs or conflicting unique phone indexes before calling.
   * - Note: normalizedPhone is intentionally NOT unique because family members may share a contact number.
   */
  async ensurePatientIndexes(): Promise<PatientIndexMaintenanceReport> {
    if (!this.db) {
      throw new Error("Database is not connected. Call connect() before running index maintenance.");
    }

    const patientCol = this.getPatientCollection();
    const operations: PatientIndexOperationResult[] = [];

    const indexDefinitions: Array<{
      spec: Record<string, 1 | -1>;
      options?: { unique?: boolean; background?: boolean };
    }> = [
      { spec: { id: 1 }, options: { unique: true, background: true } },
      { spec: { doctorId: 1, id: 1 }, options: { unique: true, background: true } },
      { spec: { doctorId: 1, mrn: 1 }, options: { background: true } },
      { spec: { doctorId: 1, normalizedPhone: 1 }, options: { background: true } },
      { spec: { doctorId: 1, "visitHistory.visitId": 1 }, options: { background: true } },
    ];

    for (const def of indexDefinitions) {
      try {
        await patientCol.createIndex(def.spec as any, def.options as any);
        operations.push({ spec: def.spec, status: "CREATED" });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        operations.push({ spec: def.spec, status: "FAILED", error: errorMsg });
      }
    }

    const failed = operations.filter((op) => op.status === "FAILED");
    const created = operations.filter((op) => op.status === "CREATED");

    if (failed.length > 0) {
      const details = failed.map((f) => `${JSON.stringify(f.spec)}: ${f.error}`).join("; ");
      throw new Error(
        `Patient index maintenance failed for ${failed.length}/${operations.length} index(es): ${details}`,
      );
    }

    return {
      success: true,
      attempted: operations.length,
      created: created.length,
      failed: 0,
      operations,
    };
  }
}

// Global singleton instance for application lifecycle
export const mongoAdapter = new MongoDatabaseAdapter();
