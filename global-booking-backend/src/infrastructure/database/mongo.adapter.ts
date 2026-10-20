import dns from "node:dns";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { DatabasePort, DatabaseConnectionSettings } from "./database.port.js";
import type { AdminUserRecord } from "../../modules/auth/auth.types.js";

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
        const servers = dns.getServers();
        if (!servers.includes("8.8.8.8") && !servers.includes("1.1.1.1")) {
          dns.setServers([...servers, "8.8.8.8", "1.1.1.1"]);
        }
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

      // Ensure required indexes for Phase A
      await this.ensurePhaseAIndexes();
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
}

// Global singleton instance for application lifecycle
export const mongoAdapter = new MongoDatabaseAdapter();
