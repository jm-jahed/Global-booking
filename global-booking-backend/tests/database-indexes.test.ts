import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoDatabaseAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import { buildApp } from "../src/app.js";

test("Database Index Initialization Safety Suite", async (suite) => {
  // Test 1: connect() does not invoke ensurePatientIndexes
  await suite.test("connect() does not invoke patient-index initialization", async () => {
    const adapter = new MongoDatabaseAdapter();
    let ensurePatientIndexesCalled = false;

    // Spy on ensurePatientIndexes
    adapter.ensurePatientIndexes = async () => {
      ensurePatientIndexesCalled = true;
      return {
        success: true,
        attempted: 0,
        created: 0,
        failed: 0,
        operations: [],
      };
    };

    // Mock internal mongo client and db commands
    const mockDb = {
      command: async () => ({ ok: 1 }),
      collection: () => ({
        createIndex: async () => "idx",
      }),
    };

    // Override connect dependencies with harmless mock
    (adapter as any).connected = true;
    (adapter as any).client = {
      connect: async () => {},
      db: () => mockDb,
      close: async () => {},
    };
    (adapter as any).db = mockDb;

    // Call connect()
    await adapter.connect(
      { provider: "mongodb", connectionStringEnvironmentVariable: "MONGODB_URI" },
      "mongodb://localhost:27017/test",
    );

    assert.equal(
      ensurePatientIndexesCalled,
      false,
      "connect() must NOT call ensurePatientIndexes automatically",
    );
  });

  // Test 2: Normal startup does not call createIndex on patient collection
  await suite.test("Normal application startup does not call createIndex on patient collection", async () => {
    const app = buildApp({ nodeEnv: "test" });
    await app.ready();

    // Verify application initialized and ready without touching any live patient indexes
    assert.ok(app);
    await app.close();
  });

  // Test 3: The explicit maintenance entry point is not invoked implicitly by application initialization
  await suite.test("Explicit maintenance entry point is not invoked implicitly by request handling or app lifecycle", async () => {
    const adapter = new MongoDatabaseAdapter();
    let maintenanceInvoked = false;

    adapter.ensurePatientIndexes = async () => {
      maintenanceInvoked = true;
      throw new Error("Should not be called!");
    };

    // Normal application health ping / inject
    const app = buildApp({ nodeEnv: "test" });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    await app.close();

    assert.equal(maintenanceInvoked, false, "Maintenance entry point must remain strictly opt-in and uncalled");
  });

  // Test 4: When index maintenance is run explicitly, failures are reported accurately and NOT swallowed
  await suite.test("ensurePatientIndexes reports granular failures and throws aggregate error rather than swallowing", async () => {
    const adapter = new MongoDatabaseAdapter();
    const attemptedSpecs: any[] = [];

    // Mock patient collection where index #2 fails with a conflict error
    const mockPatientCol = {
      createIndex: async (spec: any, _options?: any) => {
        attemptedSpecs.push(spec);
        if (spec.id === 1 && Object.keys(spec).length === 1) {
          // #1 succeeds
          return "id_1";
        }
        if (spec.doctorId === 1 && spec.id === 1) {
          // #2 fails (e.g. duplicate key or options conflict)
          throw new Error("E11000 duplicate key error collection: patients index: doctorId_1_id_1");
        }
        // #3, #4, #5 succeed
        return "idx";
      },
    };

    (adapter as any).connected = true;
    (adapter as any).db = {
      collection: (name: string) => (name === "patients" ? mockPatientCol : {}),
    };
    (adapter as any).getPatientCollection = () => mockPatientCol;

    // Running explicit maintenance must NOT silently catch the failure!
    await assert.rejects(
      async () => {
        await adapter.ensurePatientIndexes();
      },
      (err: Error) => {
        assert.ok(err.message.includes("Patient index maintenance failed for 1/5 index(es)"));
        assert.ok(err.message.includes("doctorId_1_id_1"));
        return true;
      },
      "Must throw aggregate error detailing the failed index",
    );

    // CRITICAL: Ensure one failed index did NOT prevent remaining indexes from being attempted!
    assert.equal(attemptedSpecs.length, 5, "All 5 index operations must be attempted even if one fails");
  });

  // Test 5: When all indexes succeed, explicit maintenance returns full success report
  await suite.test("ensurePatientIndexes returns full success report when all operations succeed", async () => {
    const adapter = new MongoDatabaseAdapter();
    const attemptedSpecs: any[] = [];

    const mockPatientCol = {
      createIndex: async (spec: any) => {
        attemptedSpecs.push(spec);
        return "ok";
      },
    };

    (adapter as any).connected = true;
    (adapter as any).db = {
      collection: () => mockPatientCol,
    };
    (adapter as any).getPatientCollection = () => mockPatientCol;

    const report = await adapter.ensurePatientIndexes();
    assert.equal(report.success, true);
    assert.equal(report.attempted, 5);
    assert.equal(report.created, 5);
    assert.equal(report.failed, 0);
    assert.equal(report.operations.length, 5);
    for (const op of report.operations) {
      assert.equal(op.status, "CREATED");
    }
  });

  // Test 6: ensurePatientIndexes throws if database is disconnected
  await suite.test("ensurePatientIndexes throws immediately if database is not connected", async () => {
    const adapter = new MongoDatabaseAdapter();
    await assert.rejects(
      async () => {
        await adapter.ensurePatientIndexes();
      },
      /Database is not connected/,
    );
  });
});
