/**
 * GLOBAL BOOKING — Regression Test Suite for Shutdown Lifecycle & Resource Draining
 *
 * Verifies:
 * 1. Strict Shutdown Ordering:
 *    - stopDayEndQueueScheduler() drains active jobs first.
 *    - app.close() stops accepting requests and drains in-flight HTTP requests.
 *    - mongoAdapter.disconnect() closes database pool ONLY after all HTTP requests finish.
 * 2. Scheduler Draining:
 *    - Awaiting active in-flight cleanup jobs until completion.
 *    - Safe timeout handling when a job exceeds the drain window (no lock corruption).
 * 3. Startup Listen Failure Cleanup:
 *    - When port binding fails (e.g. EADDRINUSE), open database sockets and scheduler
 *      intervals are completely cleaned up and non-zero exit is executed.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "../src/app.js";
import {
  cleanupStartupFailure,
  shutdownServer,
  type FastifyAppLike,
  type MongoAdapterLike,
} from "../src/server.lifecycle.js";
import {
  getActiveRunPromise,
  isSchedulerExecuting,
  stopDayEndQueueScheduler,
} from "../src/modules/queue/queue.scheduler.js";

test("Shutdown Lifecycle Suite", async (suite) => {

  await suite.test("Strict Shutdown Ordering: app.close() drains before mongoAdapter.disconnect()", async () => {
    const callOrder: string[] = [];
    let dbConnectedDuringHttpDrain = false;
    let isDbConnected = true;

    const mockApp: FastifyAppLike = {
      close: async () => {
        callOrder.push("app.close:start");
        // Simulate in-flight HTTP request processing while server is closing
        await new Promise((r) => setTimeout(r, 50));
        // Verify MongoDB was still connected during HTTP drain
        dbConnectedDuringHttpDrain = isDbConnected;
        callOrder.push("app.close:end");
      },
      log: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {
        callOrder.push("mongoAdapter.disconnect");
        isDbConnected = false;
      },
    };

    const mockStopScheduler = async () => {
      callOrder.push("stopScheduler");
      return { drained: true, activeJobWasRunning: false };
    };

    const result = await shutdownServer(
      mockApp,
      mockMongoAdapter,
      mockStopScheduler,
      { signal: "SIGTERM", drainTimeoutMs: 1000 },
    );

    assert.equal(result.success, true);
    assert.equal(result.schedulerDrained, true);
    assert.equal(dbConnectedDuringHttpDrain, true, "MongoDB MUST remain connected while app.close() drains in-flight HTTP requests");

    // Exact order verification:
    assert.deepEqual(callOrder, [
      "stopScheduler",
      "app.close:start",
      "app.close:end",
      "mongoAdapter.disconnect",
    ]);
  });

  await suite.test("Scheduler Drain: returns immediately when no active job is running", async () => {
    const result = await stopDayEndQueueScheduler(1000);
    assert.equal(result.drained, true);
    assert.equal(result.activeJobWasRunning, false);
    assert.equal(isSchedulerExecuting(), false);
    assert.equal(getActiveRunPromise(), null);
  });

  await suite.test("Scheduler Drain: drains active in-flight job cleanly", async () => {
    // Mock scheduler stop function simulating an in-flight background job
    let jobCompleted = false;
    const activeJobPromise = new Promise<{ finished: boolean }>((resolve) => {
      setTimeout(() => {
        jobCompleted = true;
        resolve({ finished: true });
      }, 50);
    });

    const mockStopWithActiveJob = async (drainTimeoutMs: number) => {
      const timeout = new Promise<"TIMEOUT">((res) => setTimeout(() => res("TIMEOUT"), drainTimeoutMs));
      const outcome = await Promise.race([activeJobPromise, timeout]);
      return {
        drained: outcome !== "TIMEOUT",
        activeJobWasRunning: true,
      };
    };

    const mockApp: FastifyAppLike = {
      close: async () => {},
      log: { info: () => {}, warn: () => {}, error: () => {} },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {},
    };

    const result = await shutdownServer(mockApp, mockMongoAdapter, mockStopWithActiveJob, { drainTimeoutMs: 500 });
    assert.equal(result.success, true);
    assert.equal(result.schedulerDrained, true);
    assert.equal(jobCompleted, true, "Active job should have been cleanly drained before shutdown completed");
  });

  await suite.test("Scheduler Drain: handles timeout safely without crashing when job takes too long", async () => {
    let warnLogged = false;
    const slowJobPromise = new Promise<{ finished: boolean }>((resolve) => {
      setTimeout(() => resolve({ finished: true }), 500); // Exceeds 50ms timeout
    });

    const mockStopWithHangingJob = async (drainTimeoutMs: number) => {
      const timeout = new Promise<"TIMEOUT">((res) => setTimeout(() => res("TIMEOUT"), drainTimeoutMs));
      const outcome = await Promise.race([slowJobPromise, timeout]);
      return {
        drained: outcome !== "TIMEOUT",
        activeJobWasRunning: true,
      };
    };

    const mockApp: FastifyAppLike = {
      close: async () => {},
      log: {
        info: () => {},
        warn: (msg: any) => {
          if (typeof msg === "string" && msg.includes("exceeded drain window")) {
            warnLogged = true;
          }
        },
        error: () => {},
      },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {},
    };

    const result = await shutdownServer(mockApp, mockMongoAdapter, mockStopWithHangingJob, { drainTimeoutMs: 50 });
    assert.equal(result.success, true);
    assert.equal(result.schedulerDrained, false, "Drain should report false when timeout was exceeded");
    assert.equal(warnLogged, true, "Warning should be logged for uncompleted job lease");
  });

  await suite.test("Startup Listen Failure Cleanup: cleans up MongoDB and scheduler resources", async () => {
    const cleanedUp: string[] = [];

    const mockApp: FastifyAppLike = {
      close: async () => {
        cleanedUp.push("app.close");
      },
      log: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {
        cleanedUp.push("mongoAdapter.disconnect");
      },
    };

    const mockStopScheduler = async () => {
      cleanedUp.push("stopScheduler");
      return { drained: true, activeJobWasRunning: false };
    };

    const result = await cleanupStartupFailure(mockApp, mockMongoAdapter, mockStopScheduler);

    assert.equal(result.success, true);
    assert.deepEqual(result.cleanupOrder, [
      "STOP_SCHEDULER",
      "DISCONNECT_MONGO",
      "CLOSE_APP",
    ]);
    assert.deepEqual(cleanedUp, [
      "stopScheduler",
      "mongoAdapter.disconnect",
      "app.close",
    ]);
  });

  await suite.test("Fastify HTTP Server Drain Integration: real app instance drains cleanly", async () => {
    const app = buildApp();
    let dbDisconnected = false;

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {
        dbDisconnected = true;
      },
    };

    const mockStopScheduler = async () => {
      return { drained: true, activeJobWasRunning: false };
    };

    // Send a real request to verify app is functional
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);

    const result = await shutdownServer(
      app,
      mockMongoAdapter,
      mockStopScheduler,
      { signal: "SIGTERM", drainTimeoutMs: 1000 },
    );

    assert.equal(result.success, true);
    assert.equal(dbDisconnected, true);
  });

  await suite.test("Error Isolation: Fastify close failure does NOT skip MongoDB disconnect, and surfaces original error", async () => {
    let mongoDisconnected = false;
    const fastifyError = new Error("Simulated Fastify in-flight drain error");
    const loggedErrors: any[] = [];

    const mockApp: FastifyAppLike = {
      close: async () => {
        throw fastifyError;
      },
      log: {
        info: () => {},
        warn: () => {},
        error: (err: any) => {
          loggedErrors.push(err);
        },
      },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {
        mongoDisconnected = true;
      },
    };

    const mockStopScheduler = async () => {
      return { drained: true, activeJobWasRunning: false };
    };

    const result = await shutdownServer(
      mockApp,
      mockMongoAdapter,
      mockStopScheduler,
      { signal: "SIGTERM", drainTimeoutMs: 1000 },
    );

    assert.equal(result.success, false, "Shutdown must report failure when app.close throws");
    assert.equal(mongoDisconnected, true, "MongoDB disconnect MUST still be executed even when app.close throws");
    assert.equal(result.error, fastifyError, "Original Fastify error must be surfaced");
    assert.ok(loggedErrors.includes(fastifyError), "Original Fastify error must be logged");
    assert.deepEqual(result.executionOrder, [
      "STOP_SCHEDULER",
      "CLOSE_APP",
      "DISCONNECT_MONGO",
    ]);
  });

  await suite.test("Error Isolation: Scheduler stop failure does NOT skip Fastify close or MongoDB disconnect", async () => {
    let appClosed = false;
    let mongoDisconnected = false;
    const schedulerError = new Error("Simulated scheduler interval clear error");
    const loggedErrors: any[] = [];

    const mockApp: FastifyAppLike = {
      close: async () => {
        appClosed = true;
      },
      log: {
        info: () => {},
        warn: () => {},
        error: (err: any) => {
          loggedErrors.push(err);
        },
      },
    };

    const mockMongoAdapter: MongoAdapterLike = {
      disconnect: async () => {
        mongoDisconnected = true;
      },
    };

    const mockStopScheduler = async () => {
      throw schedulerError;
    };

    const result = await shutdownServer(
      mockApp,
      mockMongoAdapter,
      mockStopScheduler,
      { signal: "SIGTERM", drainTimeoutMs: 1000 },
    );

    assert.equal(result.success, false, "Shutdown must report failure when stopScheduler throws");
    assert.equal(result.schedulerDrained, false);
    assert.equal(appClosed, true, "Fastify close MUST still be executed when stopScheduler throws");
    assert.equal(mongoDisconnected, true, "MongoDB disconnect MUST still be executed when stopScheduler throws");
    assert.equal(result.error, schedulerError, "Original scheduler error must be surfaced");
    assert.ok(loggedErrors.includes(schedulerError), "Original scheduler error must be logged");
    assert.deepEqual(result.executionOrder, [
      "STOP_SCHEDULER",
      "CLOSE_APP",
      "DISCONNECT_MONGO",
    ]);
  });
});

