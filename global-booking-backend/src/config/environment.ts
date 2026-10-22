export interface ServerEnvironment {
  readonly host: string;
  readonly port: number;
  readonly nodeEnv: "development" | "production" | "test";
  readonly mongoUri?: string | undefined;
  readonly mongoDbName: string;
  readonly jwtSecret: string;
  readonly cookieSecret: string;
  readonly frontendOrigin: string;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3003;
const DEFAULT_DB_NAME = "global_booking";
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:3000";

// Fallback secrets for local testing/development only; never used in production
const DEV_FALLBACK_JWT_SECRET = "global_booking_dev_fallback_jwt_secret_key_32chars!";
const DEV_FALLBACK_COOKIE_SECRET = "global_booking_dev_fallback_cookie_secret_32chars!";

export function readServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const host = environment.HOST?.trim() || DEFAULT_HOST;
  const rawPort = environment.PORT?.trim();
  const port = rawPort === undefined ? DEFAULT_PORT : Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Configuration error: PORT must be an integer between 1 and 65535.");
  }

  const rawNodeEnv = (environment.NODE_ENV?.trim().toLowerCase() || "development") as string;
  const nodeEnv: "development" | "production" | "test" =
    rawNodeEnv === "production" ? "production" : rawNodeEnv === "test" ? "test" : "development";

  const mongoUri = environment.MONGODB_URI?.trim();
  const mongoDbName = environment.MONGODB_DB_NAME?.trim() || DEFAULT_DB_NAME;

  let jwtSecret = environment.JWT_SECRET?.trim();
  let cookieSecret = environment.COOKIE_SECRET?.trim();

  if (nodeEnv === "production") {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error("Configuration error: In production, JWT_SECRET must be at least 32 characters long.");
    }
    if (!cookieSecret || cookieSecret.length < 32) {
      throw new Error("Configuration error: In production, COOKIE_SECRET must be at least 32 characters long.");
    }
    if (!mongoUri) {
      throw new Error("Configuration error: In production, MONGODB_URI is required.");
    }
  } else {
    jwtSecret = jwtSecret || DEV_FALLBACK_JWT_SECRET;
    cookieSecret = cookieSecret || DEV_FALLBACK_COOKIE_SECRET;
  }

  const frontendOrigin = environment.FRONTEND_ORIGIN?.trim() || DEFAULT_FRONTEND_ORIGIN;

  return {
    host,
    port,
    nodeEnv,
    mongoUri,
    mongoDbName,
    jwtSecret,
    cookieSecret,
    frontendOrigin,
  };
}
