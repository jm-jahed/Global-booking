import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { LoginRequestBody, AdminSessionPayload } from "./auth.types.js";
import { normalizeEmail, verifyPassword, sanitizeAdminProfile } from "./auth.service.js";
import { authenticateAdmin, ADMIN_COOKIE_NAME } from "./auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { generateSafeDoctorSlug } from "../portal/doctor-portal.routes.js";

// In-memory rate limiting map for login attempts: IP/email -> { attempts, resetAt }
const loginAttemptMap = new Map<string, { attempts: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// 30 Days Token Expiration and Session Cookie Lifetime (requested by user)
export const SESSION_EXPIRY_STRING = "30d";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 2,592,000 seconds (30 days)

/**
 * Prunes expired entries from login attempt tracker to prevent memory leak.
 */
export function pruneExpiredLoginAttempts(now = Date.now()): void {
  for (const [key, record] of loginAttemptMap.entries()) {
    if (now > record.resetAt) {
      loginAttemptMap.delete(key);
    }
  }
}

/**
 * Resets login attempt counter for a specific rate limit key on successful login.
 */
export function resetLoginRateLimit(key: string): void {
  loginAttemptMap.delete(key);
}

/**
 * Retrieves current attempt count for inspection or testing.
 */
export function getLoginAttemptCount(key: string): number {
  return loginAttemptMap.get(key)?.attempts || 0;
}

export function checkRateLimit(key: string, now = Date.now()): boolean {
  // Automatically prune if map grows over 50 entries
  if (loginAttemptMap.size > 50) {
    pruneExpiredLoginAttempts(now);
  }

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

      if (adminRecord) {
        const passwordMatch = await verifyPassword(password, adminRecord.passwordHash);

        if (!passwordMatch || !adminRecord.isActive) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid administrative email or password.",
          });
        }

        // Successful authentication: clear rate limiter for this user/IP
        resetLoginRateLimit(rateLimitKey);

        // Successful authentication: create session payload
        const sessionPayload: AdminSessionPayload = {
          adminId: adminRecord.adminId,
          email: adminRecord.email,
          role: adminRecord.role,
          permissions: adminRecord.permissions,
        };

        const token = app.jwt.sign(sessionPayload, { expiresIn: SESSION_EXPIRY_STRING });
        const isProduction = process.env.NODE_ENV === "production";

        // Set signed HTTP-only session cookie
        reply.setCookie(ADMIN_COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          signed: true,
          maxAge: SESSION_MAX_AGE_SECONDS,
        });

        // Update last login timestamp asynchronously
        const nowIso = new Date().toISOString();
        await adminCol.updateOne(
          { adminId: adminRecord.adminId },
          { $set: { lastLoginAt: nowIso, updatedAt: nowIso } },
        );

        return reply.status(200).send({
          statusCode: 200,
          token,
          user: sanitizeAdminProfile({ ...adminRecord, lastLoginAt: nowIso }),
        });
      }

      // If no admin record exists, check doctor accounts
      const docCol = mongoAdapter.getDoctorCollection();
      const doctorRecord = await docCol.findOne({ email: normalizedEmail });

      if (doctorRecord && doctorRecord.passwordHash) {
        const passwordMatch = await verifyPassword(password, doctorRecord.passwordHash);

        if (!passwordMatch) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password.",
          });
        }

        if (doctorRecord.accountStatus === "SUSPENDED") {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "This Doctor account is currently suspended. Please contact platform administration.",
          });
        }

        // Successful authentication: clear rate limiter
        resetLoginRateLimit(rateLimitKey);

        const sessionPayload: AdminSessionPayload = {
          adminId: doctorRecord.id,
          email: doctorRecord.email,
          role: "DOCTOR",
          permissions: ["VIEW_DOCTORS"],
        };

        const token = app.jwt.sign(sessionPayload, { expiresIn: SESSION_EXPIRY_STRING });
        const isProduction = process.env.NODE_ENV === "production";

        reply.setCookie(ADMIN_COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          signed: true,
          maxAge: SESSION_MAX_AGE_SECONDS,
        });

        const nowIso = new Date().toISOString();
        await docCol.updateOne(
          { id: doctorRecord.id },
          { $set: { updatedAt: nowIso } },
        );

        return reply.status(200).send({
          statusCode: 200,
          token,
          user: {
            id: doctorRecord.id,
            email: doctorRecord.email,
            name: doctorRecord.fullName,
            fullName: doctorRecord.fullName,
            role: "DOCTOR",
            specialty: doctorRecord.specialty,
            doctorId: doctorRecord.doctorId,
            licenseNumber: doctorRecord.licenseNumber,
            accountStatus: doctorRecord.accountStatus,
            slug: doctorRecord.slug || generateSafeDoctorSlug(doctorRecord.fullName, doctorRecord.doctorId || doctorRecord.id),
            avatar: doctorRecord.avatar,
            chamberLocationsSummary: doctorRecord.chamberLocationsSummary,
            chambers: doctorRecord.chambers,
            permissions: ["VIEW_DOCTORS"],
            isActive: true,
            createdAt: doctorRecord.createdAt,
          },
        });
      }

      // If no admin or doctor record, check hospital accounts
      const hspCol = mongoAdapter.getHospitalCollection();
      const hospitalRecord = await hspCol.findOne({ email: normalizedEmail });

      if (hospitalRecord && hospitalRecord.passwordHash) {
        const passwordMatch = await verifyPassword(password, hospitalRecord.passwordHash);

        if (!passwordMatch) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password.",
          });
        }

        if (hospitalRecord.accountStatus === "SUSPENDED") {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "This Hospital account is currently suspended. Please contact platform administration.",
          });
        }

        // Successful authentication: clear rate limiter
        resetLoginRateLimit(rateLimitKey);

        const sessionPayload: AdminSessionPayload = {
          adminId: hospitalRecord.id,
          email: hospitalRecord.email,
          role: "HOSPITAL",
          permissions: ["VIEW_HOSPITALS"],
        };

        const token = app.jwt.sign(sessionPayload, { expiresIn: SESSION_EXPIRY_STRING });
        const isProduction = process.env.NODE_ENV === "production";

        reply.setCookie(ADMIN_COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          signed: true,
          maxAge: SESSION_MAX_AGE_SECONDS,
        });

        const nowIso = new Date().toISOString();
        await hspCol.updateOne(
          { id: hospitalRecord.id },
          { $set: { updatedAt: nowIso } },
        );

        return reply.status(200).send({
          statusCode: 200,
          token,
          user: {
            id: hospitalRecord.id,
            email: hospitalRecord.email,
            name: hospitalRecord.institutionName,
            institutionName: hospitalRecord.institutionName,
            role: "HOSPITAL",
            facilityType: hospitalRecord.facilityType,
            hospitalId: hospitalRecord.hospitalId,
            licenseNumber: hospitalRecord.licenseNumber,
            accountStatus: hospitalRecord.accountStatus,
            permissions: ["VIEW_HOSPITALS"],
            isActive: true,
            createdAt: hospitalRecord.createdAt,
          },
        });
      }

      // If no admin, doctor, or hospital record, check staff accounts
      const staffCol = mongoAdapter.getStaffCollection();
      const staffRecord = await staffCol.findOne({ email: normalizedEmail });

      if (staffRecord && staffRecord.passwordHash) {
        const passwordMatch = await verifyPassword(password, staffRecord.passwordHash);

        if (!passwordMatch) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password.",
          });
        }

        if (staffRecord.accountStatus === "SUSPENDED") {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "This Staff account is currently suspended. Please contact your administrator.",
          });
        }

        // If staff is associated with a doctor, verify parent doctor is not suspended
        let parentDoctorName: string | undefined;
        if (staffRecord.tenantType === "DOCTOR" && staffRecord.doctorId) {
          const docCol = mongoAdapter.getDoctorCollection();
          const parentDoc = await docCol.findOne({ id: staffRecord.doctorId });
          if (!parentDoc || parentDoc.accountStatus === "SUSPENDED") {
            return reply.status(403).send({
              statusCode: 403,
              error: "Forbidden",
              message: "The associated Doctor account is suspended or unavailable.",
            });
          }
          parentDoctorName = parentDoc.fullName;
        }

        // Successful authentication: clear rate limiter
        resetLoginRateLimit(rateLimitKey);

        const sessionPayload: AdminSessionPayload = {
          adminId: staffRecord.id,
          email: staffRecord.email,
          role: "STAFF",
          staffRole: staffRecord.staffRole,
          doctorId: staffRecord.doctorId,
          hospitalId: staffRecord.hospitalId,
          permissions: [],
        };

        const token = app.jwt.sign(sessionPayload, { expiresIn: SESSION_EXPIRY_STRING });
        const isProduction = process.env.NODE_ENV === "production";

        reply.setCookie(ADMIN_COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          signed: true,
          maxAge: SESSION_MAX_AGE_SECONDS,
        });

        const nowIso = new Date().toISOString();
        await staffCol.updateOne(
          { id: staffRecord.id },
          { $set: { lastLoginAt: nowIso, updatedAt: nowIso } },
        );

        return reply.status(200).send({
          statusCode: 200,
          token,
          user: {
            id: staffRecord.id,
            email: staffRecord.email,
            name: staffRecord.name,
            fullName: staffRecord.name,
            role: "STAFF",
            staffRole: staffRecord.staffRole,
            tenantType: staffRecord.tenantType,
            doctorId: staffRecord.doctorId,
            hospitalId: staffRecord.hospitalId,
            chamberLocation: staffRecord.chamberLocation,
            phone: staffRecord.phone,
            permissions: staffRecord.permissions,
            accountStatus: staffRecord.accountStatus,
            parentDoctorName,
            isActive: staffRecord.accountStatus === "ACTIVE",
            createdAt: staffRecord.createdAt,
          },
        });
      }

      // Neither admin, doctor, hospital, nor staff found with valid credentials
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    },
  );

  /**
   * GET /api/v1/auth/admin/me
   * Returns current authenticated administrator, doctor, or hospital profile
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

      if (session.role === "DOCTOR") {
        const docCol = mongoAdapter.getDoctorCollection();
        const doc = await docCol.findOne({ id: session.adminId });

        if (!doc || doc.accountStatus === "SUSPENDED") {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Doctor account is inactive or not found.",
          });
        }

        return reply.status(200).send({
          statusCode: 200,
          user: {
            id: doc.id,
            email: doc.email,
            name: doc.fullName,
            fullName: doc.fullName,
            role: "DOCTOR",
            specialty: doc.specialty,
            doctorId: doc.doctorId,
            licenseNumber: doc.licenseNumber,
            accountStatus: doc.accountStatus,
            slug: doc.slug || generateSafeDoctorSlug(doc.fullName, doc.doctorId || doc.id),
            avatar: doc.avatar,
            chamberLocationsSummary: doc.chamberLocationsSummary,
            chambers: doc.chambers,
            permissions: ["VIEW_DOCTORS"],
            isActive: true,
            createdAt: doc.createdAt,
          },
        });
      }

      if (session.role === "HOSPITAL") {
        const hspCol = mongoAdapter.getHospitalCollection();
        const hsp = await hspCol.findOne({ id: session.adminId });

        if (!hsp || hsp.accountStatus === "SUSPENDED") {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Hospital account is inactive or not found.",
          });
        }

        return reply.status(200).send({
          statusCode: 200,
          user: {
            id: hsp.id,
            email: hsp.email,
            name: hsp.institutionName,
            institutionName: hsp.institutionName,
            role: "HOSPITAL",
            facilityType: hsp.facilityType,
            hospitalId: hsp.hospitalId,
            licenseNumber: hsp.licenseNumber,
            accountStatus: hsp.accountStatus,
            permissions: ["VIEW_HOSPITALS"],
            isActive: true,
            createdAt: hsp.createdAt,
          },
        });
      }

      if (session.role === "STAFF") {
        const staffCol = mongoAdapter.getStaffCollection();
        const staff = await staffCol.findOne({ id: session.adminId });

        if (!staff || staff.accountStatus === "SUSPENDED") {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Staff account is inactive or not found.",
          });
        }

        let parentDoctorName: string | undefined;
        if (staff.tenantType === "DOCTOR" && staff.doctorId) {
          const docCol = mongoAdapter.getDoctorCollection();
          const parentDoc = await docCol.findOne({ id: staff.doctorId });
          if (!parentDoc || parentDoc.accountStatus === "SUSPENDED") {
            return reply.status(403).send({
              statusCode: 403,
              error: "Forbidden",
              message: "The associated Doctor account is suspended or unavailable.",
            });
          }
          parentDoctorName = parentDoc.fullName;
        }

        return reply.status(200).send({
          statusCode: 200,
          user: {
            id: staff.id,
            email: staff.email,
            name: staff.name,
            fullName: staff.name,
            role: "STAFF",
            staffRole: staff.staffRole,
            tenantType: staff.tenantType,
            doctorId: staff.doctorId,
            hospitalId: staff.hospitalId,
            chamberLocation: staff.chamberLocation,
            phone: staff.phone,
            permissions: staff.permissions,
            accountStatus: staff.accountStatus,
            parentDoctorName,
            isActive: staff.accountStatus === "ACTIVE",
            createdAt: staff.createdAt,
          },
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
