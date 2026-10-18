import { buildApp } from "./app.js";
import { readServerEnvironment } from "./config/environment.js";

const app = buildApp();
const { host, port } = readServerEnvironment();
let isShuttingDown = false;

async function shutDown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  app.log.info({ signal }, "Shutting down server");

  try {
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

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
