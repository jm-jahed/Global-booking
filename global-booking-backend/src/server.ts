import { buildApp } from "./app.js";
import { readServerEnvironment } from "./config/environment.js";
import { mongoAdapter } from "./infrastructure/database/mongo.adapter.js";
import {
  startDayEndQueueScheduler,
  stopDayEndQueueScheduler,
} from "./modules/queue/queue.scheduler.js";

const env = readServerEnvironment();
const app = buildApp(env);
let isShuttingDown = false;

async function shutDown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  app.log.info({ signal }, "Shutting down server");

  try {
    stopDayEndQueueScheduler();
    await mongoAdapter.disconnect();
    await app.close();
  } catch (error) {
    app.log.error(error, "Failed to close server cleanly");
    process.exitCode = 1;
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
  app.log.error(error);
  process.exitCode = 1;
}
