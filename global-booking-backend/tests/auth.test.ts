import assert from "node:assert/strict";
import { test } from "node:test";

import { readServerEnvironment } from "../src/config/environment.js";
import {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  sanitizeAdminProfile,
} from "../src/modules/auth/auth.service.js";
import { buildApp } from "../src/app.js";
import { ADMIN_COOKIE_NAME, requirePermission } from "../src/modules/auth/auth.guard.js";
import {
  checkRateLimit,
  resetLoginRateLimit,
  pruneExpiredLoginAttempts,
  getLoginAttemptCount,
} from "../src/modules/auth/auth.routes.js";
import type { AdminUserRecord } from "../src/modules/auth/auth.types.js";

/* =========================================================================
   1. ENVIRONMENT CONFIGURATION & VALIDATION
   ========================================================================= */

test("Environment validation accepts valid server configuration", () => {
  const env = readServerEnvironment({
    HOST: "127.0.0.1",
    PORT: "3001",
    NODE_ENV: "development",
  });

  assert.equal(env.host, "127.0.0.1");
  assert.equal(env.port, 3001);
  assert.equal(env.nodeEnv, "development");
  assert.ok(env.jwtSecret.length >= 32);
  assert.ok(env.cookieSecret.length >= 32);
});

test("Environment validation defaults to port 3003 when PORT is omitted", () => {
  const env = readServerEnvironment({});
  assert.equal(env.port, 3003);
});

test("Environment validation throws when PORT is invalid", () => {
  assert.throws(
    () => readServerEnvironment({ PORT: "invalid_port" }),
    /PORT must be an integer between 1 and 65535/,
  );
  assert.throws(
    () => readServerEnvironment({ PORT: "999999" }),
    /PORT must be an integer between 1 and 65535/,
  );
});

test("Environment validation enforces production security requirements", () => {
  // In production, MONGODB_URI is required
  assert.throws(
    () =>
      readServerEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "a_very_long_production_secret_key_32chars!",
        COOKIE_SECRET: "a_very_long_cookie_secret_key_32chars!",
      }),
    /MONGODB_URI is required/,
  );

  // In production, JWT_SECRET must be at least 32 characters
  assert.throws(
    () =>
      readServerEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://localhost:27017",
        JWT_SECRET: "short_secret",
        COOKIE_SECRET: "a_very_long_cookie_secret_key_32chars!",
      }),
    /JWT_SECRET must be at least 32 characters/,
  );
});

/* =========================================================================
   2. PASSWORD HASHING, VERIFICATION & EMAIL NORMALIZATION
   ========================================================================= */

test("Email normalization consistently trims and lowercases addresses", () => {
  assert.equal(normalizeEmail("  Admin@GlobalBooking.AE  "), "admin@globalbooking.ae");
  assert.equal(normalizeEmail("SUPERADMIN@DOMAIN.COM"), "superadmin@domain.com");
});

test("Password hashing generates secure bcrypt hash and verifies correctly", async () => {
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.ok(hash.startsWith("$2"), "Hash must be standard bcrypt hash");

  const isMatch = await verifyPassword(password, hash);
  assert.equal(isMatch, true);

  const isWrongMatch = await verifyPassword("WrongPassword123!", hash);
  assert.equal(isWrongMatch, false);
});

test("Password hashing rejects passwords shorter than 8 characters", async () => {
  await assert.rejects(
    async () => hashPassword("short"),
    /Password must be a string with at least 8 characters/,
  );
});

test("Profile sanitization never exposes passwordHash or internal fields", () => {
  const rawRecord: AdminUserRecord = {
    adminId: "ADM-1001",
    email: "admin@globalbooking.ae",
    passwordHash: "$2a$12$eXampleHashedPasswordStringThatMustNotBeExposed",
    name: "Dr. Tariq Al-Hashimi",
    role: "SUPER_ADMIN",
    permissions: ["MANAGE_REGISTRATIONS", "APPROVE_ACCOUNTS"],
    isActive: true,
    lastLoginAt: "2026-10-20T12:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-20T12:00:00Z",
  };

  const safe = sanitizeAdminProfile(rawRecord);
  assert.equal(safe.id, "ADM-1001");
  assert.equal(safe.email, "admin@globalbooking.ae");
  assert.equal("passwordHash" in safe, false, "passwordHash must be stripped");
  assert.deepEqual(safe.permissions, ["MANAGE_REGISTRATIONS", "APPROVE_ACCOUNTS"]);
});

/* =========================================================================
   3. FASTIFY AUTHENTICATION HTTP ENDPOINTS (MOCKED/INJECTED)
   ========================================================================= */

test("POST /api/v1/auth/admin/login rejects missing email or password", async (context) => {
  const app = buildApp({ nodeEnv: "test" });
  context.after(async () => app.close());

  // Empty body
  const resEmpty = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/login",
    payload: {},
  });
  assert.equal(resEmpty.statusCode, 400);

  // Missing password
  const resNoPass = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/login",
    payload: { email: "admin@test.com" },
  });
  assert.equal(resNoPass.statusCode, 400);
});

test("GET /api/v1/auth/admin/me returns 401 when unauthenticated", async (context) => {
  const app = buildApp({ nodeEnv: "test" });
  context.after(async () => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/auth/admin/me",
  });

  assert.equal(response.statusCode, 401);
  const body = response.json();
  assert.equal(body.error, "Unauthorized");
});

test("GET /api/v1/auth/admin/me rejects invalid or forged JWT token", async (context) => {
  const app = buildApp({ nodeEnv: "test" });
  context.after(async () => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/auth/admin/me",
    headers: {
      authorization: "Bearer forged.invalid.token",
    },
  });

  assert.equal(response.statusCode, 401);
});

test("POST /api/v1/auth/admin/logout clears session cookie and returns success", async (context) => {
  const app = buildApp({ nodeEnv: "test" });
  context.after(async () => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/logout",
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json<{ success: boolean }>();
  assert.equal(payload.success, true);

  // Check Set-Cookie header clears cookie
  const setCookie = response.headers["set-cookie"];
  assert.ok(setCookie);
  assert.match(String(setCookie), new RegExp(ADMIN_COOKIE_NAME));
});

/* =========================================================================
   4. SERVER-SIDE AUTHORIZATION PERMISSION GUARD
   ========================================================================= */

test("Server-side permission guard allows authorized roles and rejects missing permissions", async (context) => {
  const app = buildApp({ nodeEnv: "test" });
  context.after(async () => app.close());

  // Test route 1: protected by requirePermission("MANAGE_REGISTRATIONS")
  app.get(
    "/test-protected",
    {
      preHandler: [
        async (req) => {
          // Mock authenticated session
          req.adminUser = {
            adminId: "ADM-999",
            email: "viewer@globalbooking.ae",
            role: "AUDIT_VIEWER",
            permissions: ["VIEW_AUDIT_LOGS"],
          };
        },
        requirePermission("MANAGE_REGISTRATIONS"),
      ],
    },
    async () => ({ ok: true }),
  );

  // Test route 2: Super Admin role bypass
  app.get(
    "/test-superadmin-bypass",
    {
      preHandler: [
        async (req) => {
          req.adminUser = {
            adminId: "ADM-1001",
            email: "superadmin@globalbooking.ae",
            role: "SUPER_ADMIN",
            permissions: [],
          };
        },
        requirePermission("MANAGE_REGISTRATIONS"),
      ],
    },
    async () => ({ granted: true }),
  );

  // 1. User lacking "MANAGE_REGISTRATIONS" should be denied with 403 Forbidden
  const deniedRes = await app.inject({
    method: "GET",
    url: "/test-protected",
  });
  assert.equal(deniedRes.statusCode, 403);
  assert.equal(deniedRes.json().error, "Forbidden");

  // 2. User with SUPER_ADMIN role bypass should be allowed
  const allowedRes = await app.inject({
    method: "GET",
    url: "/test-superadmin-bypass",
  });
  assert.equal(allowedRes.statusCode, 200);
  assert.equal(allowedRes.json().granted, true);
});

test("checkRateLimit tracks attempts, enforces 5 attempt limit, and resetLoginRateLimit clears counter", () => {
  const testKey = "127.0.0.1:ratelimit_test@globalbooking.ae";
  resetLoginRateLimit(testKey);

  // 1 to 5 attempts should pass
  assert.equal(checkRateLimit(testKey), true);
  assert.equal(checkRateLimit(testKey), true);
  assert.equal(checkRateLimit(testKey), true);
  assert.equal(checkRateLimit(testKey), true);
  assert.equal(checkRateLimit(testKey), true);
  assert.equal(getLoginAttemptCount(testKey), 5);

  // 6th attempt within same minute should be rejected
  assert.equal(checkRateLimit(testKey), false);

  // Successful login clears rate limit
  resetLoginRateLimit(testKey);
  assert.equal(getLoginAttemptCount(testKey), 0);
  assert.equal(checkRateLimit(testKey), true);

  // Cleanup
  resetLoginRateLimit(testKey);
});

test("pruneExpiredLoginAttempts cleans up records whose window has elapsed", () => {
  const expiredKey = "127.0.0.1:expired@globalbooking.ae";
  const now = Date.now();

  // Create attempt at timestamp 'now'
  checkRateLimit(expiredKey, now);
  assert.equal(getLoginAttemptCount(expiredKey), 1);

  // Prune with timestamp within window should not prune (window is 60s)
  pruneExpiredLoginAttempts(now + 10_000);
  assert.equal(getLoginAttemptCount(expiredKey), 1);

  // Prune after 61s should prune the entry
  pruneExpiredLoginAttempts(now + 61_000);
  assert.equal(getLoginAttemptCount(expiredKey), 0);
});

