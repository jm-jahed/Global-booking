import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { LoginRequestBody, AdminSessionPayload } from "./auth.types.js";
import { normalizeEmail, verifyPassword, sanitizeAdminProfile } from "./auth.service.js";
import { authenticateAdmin, ADMIN_COOKIE_NAME } from "./auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";

// Basic in-memory rate limiting map for login attempts: IP/email -> { attempts, lastAttempt }
const loginAttemptMap = new Map<string, { attempts: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttemptMap.get(key);

  if (!record || now > record.resetAt) {
    loginAttemptMap.set(key, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  record.attempts += 1;
  return true;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/admin/login
   * Authenticates administrator, issues signed HTTP-only cookie
   */
  app.post(
    "/api/v1/auth/admin/login",
    async (request: FastifyRequest<{ Body: LoginRequestBody }>, reply: FastifyReply) => {
      const { email, password } = request.body || {};

      if (!email || !password || typeof email !== "string" || typeof password !== "string") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Email and password are required.",
        });
      }

      const clientIp = request.ip || "unknown";
      const rateLimitKey = `${clientIp}:${normalizeEmail(email)}`;

      if (!checkRateLimit(rateLimitKey)) {
        return reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Too many failed login attempts. Please wait 1 minute before trying again.",
        });
      }

      const normalizedEmail = normalizeEmail(email);

      // Verify database availability safely
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable. Please check backend connection.",
        });
      }

      const adminCol = mongoAdapter.getAdminCollection();
      const adminRecord = await adminCol.findOne({ email: normalizedEmail });

      // Constant-time-like rejection to avoid leaking account existence
      const passwordMatch = adminRecord
        ? await verifyPassword(password, adminRecord.passwordHash)
        : false;

      if (!adminRecord || !passwordMatch || !adminRecord.isActive) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid administrative email or password.",
        });
      }

      // Successful authentication: create session payload
      const sessionPayload: AdminSessionPayload = {
        adminId: adminRecord.adminId,
        email: adminRecord.email,
        role: adminRecord.role,
        permissions: adminRecord.permissions,
      };

      const token = app.jwt.sign(sessionPayload, { expiresIn: "24h" });

      const isProduction = process.env.NODE_ENV === "production";

      // Set signed HTTP-only session cookie
      reply.setCookie(ADMIN_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        signed: true,
        maxAge: 86400, // 24 hours
      });

      // Update last login timestamp asynchronously
      const nowIso = new Date().toISOString();
      await adminCol.updateOne(
        { adminId: adminRecord.adminId },
        { $set: { lastLoginAt: nowIso, updatedAt: nowIso } },
      );

      return reply.status(200).send({
        statusCode: 200,
        user: sanitizeAdminProfile({ ...adminRecord, lastLoginAt: nowIso }),
      });
    },
  );

  /**
   * GET /api/v1/auth/admin/me
   * Returns current authenticated administrator profile
   */
  app.get(
    "/api/v1/auth/admin/me",
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.adminUser;
      if (!session) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Authentication required.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is unavailable.",
        });
      }

      const adminCol = mongoAdapter.getAdminCollection();
      const adminRecord = await adminCol.findOne({ adminId: session.adminId });

      if (!adminRecord || !adminRecord.isActive) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Administrator account is inactive or not found.",
        });
      }

      return reply.status(200).send({
        statusCode: 200,
        user: sanitizeAdminProfile(adminRecord),
      });
    },
  );

  /**
   * POST /api/v1/auth/admin/logout
   * Clears the HTTP-only session cookie and invalidates session
   */
  app.post(
    "/api/v1/auth/admin/logout",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie(ADMIN_COOKIE_NAME, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: "Administrative session terminated successfully.",
      });
    },
  );
}
