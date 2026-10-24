/**
 * GLOBAL BOOKING — Server Lifecycle & Controlled Shutdown Handler
 *
 * Enforces production-grade graceful shutdown and failure cleanup:
 * 1. Shuts down background scheduler and safely drains active in-flight jobs.
 * 2. Stops Fastify HTTP listener and drains active in-flight HTTP requests.
 * 3. Safely disconnects MongoDB Atlas connection pool after all requests and jobs complete.
 * 4. Ensures startup listen failures (e.g. EADDRINUSE) clean up open sockets before exit.
 */

export interface FastifyAppLike {
  close: () => Promise<void>;
  log: {
    info: (objOrMsg: unknown, msg?: string) => void;
    warn: (objOrMsg: unknown, msg?: string) => void;
    error: (objOrMsg: unknown, msg?: string) => void;
  };
}

export interface MongoAdapterLike {
  disconnect: () => Promise<void>;
}

export interface SchedulerDrainResult {
  drained: boolean;
  activeJobWasRunning: boolean;
}

export type StopSchedulerFn = (drainTimeoutMs: number) => Promise<SchedulerDrainResult>;

export interface ShutdownOptions {
  drainTimeoutMs?: number;
  signal?: string;
}

export interface ShutdownResult {
  success: boolean;
  schedulerDrained: boolean;
  executionOrder: string[];
  error?: unknown | undefined;
  errors?: unknown[] | undefined;
}

/**
 * Executes a controlled, staged graceful shutdown sequence:
 * Order:
 *   1. Stop background scheduler and drain active jobs (prevents severed queries mid-job).
 *   2. Close Fastify app and drain in-flight HTTP requests (prevents 502/504 while DB is alive).
 *   3. Disconnect MongoDB Atlas connection pool (all handlers are finished).
 *
 * Error isolation:
 * - A failure in stopping the scheduler logs an error but does not prevent closing Fastify or disconnecting MongoDB.
 * - A failure in closing Fastify logs an error but does NOT skip disconnecting MongoDB.
 * - Any cleanup failure marks success as false and surfaces the error(s).
 */
export async function shutdownServer(
  app: FastifyAppLike,
  mongoAdapter: MongoAdapterLike,
  stopScheduler: StopSchedulerFn,
  options: ShutdownOptions = {},
): Promise<ShutdownResult> {
  const signal = options.signal ?? "SIGTERM";
  const drainTimeoutMs = options.drainTimeoutMs ?? 5000;
  const executionOrder: string[] = [];
  const errors: unknown[] = [];

  app.log.info({ signal }, "Initiating graceful server shutdown");

  let schedulerDrained = true;

  // Step 1: Stop and drain scheduler
  executionOrder.push("STOP_SCHEDULER");
  try {
    const drain = await stopScheduler(drainTimeoutMs);
    schedulerDrained = drain.drained;
    if (!drain.drained) {
      app.log.warn(
        "Day-End Queue scheduler active job exceeded drain window; lease will safely expire in MongoDB",
      );
    }
  } catch (schedulerErr) {
    app.log.error(schedulerErr, "Error while stopping Day-End Queue scheduler during shutdown");
    errors.push(schedulerErr);
    schedulerDrained = false;
  }

  // Step 2: Drain Fastify HTTP server
  executionOrder.push("CLOSE_APP");
  try {
    await app.close();
    app.log.info("Fastify HTTP server closed and in-flight requests drained");
  } catch (appCloseErr) {
    app.log.error(appCloseErr, "Error while closing Fastify server during shutdown");
    errors.push(appCloseErr);
  }

  // Step 3: Disconnect database (always attempted, even if previous steps failed)
  executionOrder.push("DISCONNECT_MONGO");
  try {
    await mongoAdapter.disconnect();
    app.log.info("MongoDB client disconnected cleanly");
  } catch (mongoErr) {
    app.log.error(mongoErr, "Error while disconnecting MongoDB during shutdown");
    errors.push(mongoErr);
  }

  const success = errors.length === 0;
  if (!success) {
    app.log.error(
      { errorCount: errors.length },
      "Graceful shutdown finished with cleanup error(s)",
    );
  }

  return {
    success,
    schedulerDrained,
    executionOrder,
    error: errors.length > 0 ? errors[0] : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}


/**
 * Cleans up initialized resources when app.listen() fails (e.g. EADDRINUSE on startup).
 * Ensures open database sockets and scheduler intervals do not leave a stalled zombie process.
 */
export async function cleanupStartupFailure(
  app: FastifyAppLike,
  mongoAdapter: MongoAdapterLike,
  stopScheduler: StopSchedulerFn,
): Promise<{ success: boolean; cleanupOrder: string[]; error?: unknown }> {
  const cleanupOrder: string[] = [];

  try {
    cleanupOrder.push("STOP_SCHEDULER");
    await stopScheduler(2000).catch((err) => {
      app.log.warn(err, "Scheduler stop encountered non-fatal error during startup cleanup");
    });

    cleanupOrder.push("DISCONNECT_MONGO");
    await mongoAdapter.disconnect().catch((err) => {
      app.log.warn(err, "MongoDB disconnect encountered non-fatal error during startup cleanup");
    });

    cleanupOrder.push("CLOSE_APP");
    await app.close().catch((err) => {
      app.log.warn(err, "Fastify close encountered non-fatal error during startup cleanup");
    });

    return { success: true, cleanupOrder };
  } catch (error) {
    app.log.error(error, "Failed during startup resource cleanup");
    return { success: false, cleanupOrder, error };
  }
}
