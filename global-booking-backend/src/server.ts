import { buildApp } from "./app.js";
import { readServerEnvironment } from "./config/environment.js";
import { mongoAdapter } from "./infrastructure/database/mongo.adapter.js";
import {
  startDayEndQueueScheduler,
  stopDayEndQueueScheduler,
} from "./modules/queue/queue.scheduler.js";
import {
  cleanupStartupFailure,
  shutdownServer,
} from "./server.lifecycle.js";

const env = readServerEnvironment();
const app = buildApp(env);
let isShuttingDown = false;

async function shutDown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  // Emergency safety timer: if graceful shutdown hangs beyond 10s, force exit
  const forceExitTimer = setTimeout(() => {
    app.log.error({ signal }, "Graceful shutdown timed out after 10s; forcing exit");
    process.exit(1);
  }, 10_000);
  if (typeof forceExitTimer.unref === "function") {
    forceExitTimer.unref();
  }

  const result = await shutdownServer(
    app,
    mongoAdapter,
    stopDayEndQueueScheduler,
    { signal, drainTimeoutMs: 5000 },
  );

  clearTimeout(forceExitTimer);

  if (!result.success) {
    process.exitCode = 1;
    process.exit(1);
  }
}

process.once("SIGINT", () => {
  void shutDown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutDown("SIGTERM");
});

// Connect to MongoDB Atlas if connection URI is provided in environment
if (env.mongoUri) {
  try {
    await mongoAdapter.connect();
    app.log.info("MongoDB connection initialized successfully");
    // Start automated Day-End Queue background cleanup scheduler
    startDayEndQueueScheduler();
  } catch (error) {
    app.log.error(error, "Failed to connect to MongoDB on startup");
  }
} else {
  app.log.warn("MONGODB_URI is not set in environment. Database-backed features will return 503 until configured.");
}

try {
  await app.listen({ host: env.host, port: env.port });
} catch (error) {
  app.log.error(error, "Failed to bind listen port; cleaning up initialized resources");
  await cleanupStartupFailure(app, mongoAdapter, stopDayEndQueueScheduler);
  process.exitCode = 1;
  process.exit(1);
}
