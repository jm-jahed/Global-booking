import type { FastifyRequest, FastifyReply } from "fastify";
import type { AdminPermission, AdminSessionPayload } from "./auth.types.js";

// Extend FastifyRequest type to include adminUser
declare module "fastify" {
  interface FastifyRequest {
    adminUser?: AdminSessionPayload;
  }
}

export const ADMIN_COOKIE_NAME = "gb_admin_session";

/**
 * Server-side authentication guard for protected Super Admin routes.
 * Verifies JWT session token from HTTP-only cookie or Bearer Authorization header.
 */
export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let token: string | undefined;

  // 1. Check HTTP-only signed session cookie first (preferred)
  const cookieValue = request.cookies[ADMIN_COOKIE_NAME];
  if (cookieValue) {
    const unsigned = request.unsignCookie(cookieValue);
    if (unsigned.valid && unsigned.value) {
      token = unsigned.value;
    }
  }

  // 2. Fallback to Bearer token in Authorization header if provided
  if (!token && request.headers.authorization) {
    const [scheme, credentials] = request.headers.authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && credentials) {
      token = credentials;
    }
  }

  if (!token) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required to access administrative resource.",
    });
  }

  try {
    const payload = await request.server.jwt.verify<AdminSessionPayload>(token);
    request.adminUser = payload;
  } catch {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Session is invalid or has expired. Please sign in again.",
    });
  }
}

/**
 * Server-side authorization guard checking specific AdminPermission.
 * Never relies on client-side state.
 */
export function requirePermission(permission: AdminPermission) {
  return async function permissionGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.adminUser) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    const { role, permissions } = request.adminUser;

    // SUPER_ADMIN role possesses master bypass, or check explicit permission grant
    const hasPermission = role === "SUPER_ADMIN" || permissions.includes(permission);

    if (!hasPermission) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: `Administrative access denied. Missing required permission: ${permission}`,
      });
    }
  };
}
