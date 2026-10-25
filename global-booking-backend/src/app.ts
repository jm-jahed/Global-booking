import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";

import { readServerEnvironment, type ServerEnvironment } from "./config/environment.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerRegistrationRoutes } from "./modules/admin/registrations.routes.js";
import { registerDoctorRoutes } from "./modules/admin/doctors.routes.js";
import { registerHospitalRoutes } from "./modules/admin/hospitals.routes.js";
import { registerAuditLogRoutes } from "./modules/admin/audit-logs.routes.js";
import { registerAdminUsersRoutes } from "./modules/admin/users.routes.js";
import { registerPlatformSettingsRoutes } from "./modules/admin/settings.routes.js";
import { registerDoctorPortalRoutes } from "./modules/portal/doctor-portal.routes.js";
import { registerDoctorPublicRoutes } from "./modules/public/doctors-public.routes.js";
import { registerDoctorQueueRoutes } from "./modules/queue/queue.routes.js";
import { registerAppointmentRoutes } from "./modules/appointments/appointments.routes.js";
import { registerPatientRoutes } from "./modules/patients/patients.routes.js";
import { registerDoctorReportsRoutes } from "./modules/reports/reports.routes.js";
import { registerStaffRoutes } from "./modules/staff/staff.routes.js";
import { registerNotificationRoutes } from "./modules/notifications/notification.routes.js";
import { INDUSTRY_CATEGORIES } from "./shared/configuration/industry-categories.js";
import { validateIndustryCategories } from "./shared/configuration/validate-industry-categories.js";

export function buildApp(customEnv?: Partial<ServerEnvironment>): FastifyInstance {
  validateIndustryCategories(INDUSTRY_CATEGORIES);

  const env = { ...readServerEnvironment(), ...customEnv };
  const app = Fastify({
    logger: env.nodeEnv !== "test",
    trustProxy: env.nodeEnv === "production",
  });

  const allowedOrigins = new Set([
    env.frontendOrigin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ]);

  // 1. CORS plugin with explicit allowed origins & credentials
  app.register(cors, {
    origin: Array.from(allowedOrigins),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Support empty JSON body on PATCH / POST / PUT requests without failing
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    if (!body || (typeof body === "string" && body.trim() === "")) {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(typeof body === "string" ? body : body.toString("utf-8"));
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Server-side CSRF defense-in-depth: validate Origin header on mutating requests
  app.addHook("onRequest", async (request, reply) => {
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Cross-site request rejected: Untrusted origin.",
        });
      }
    }
  });

  // Centralized Error Handler: prevents internal database / driver details leaking on 500
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const errRecord = (typeof error === "object" && error !== null ? error : {}) as {
      statusCode?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const statusCode =
      typeof errRecord.statusCode === "number" && errRecord.statusCode >= 400 && errRecord.statusCode < 500
        ? errRecord.statusCode
        : 500;

    const message =
      statusCode >= 500 && env.nodeEnv === "production"
        ? "An internal server error occurred."
        : typeof errRecord.message === "string" && errRecord.message
          ? errRecord.message
          : "An unexpected error occurred.";

    return reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? "Internal Server Error" : (typeof errRecord.name === "string" ? errRecord.name : "Bad Request"),
      message,
    });
  });

  // 2. Cookie plugin with signing secret for secure session cookies
  app.register(cookie, {
    secret: env.cookieSecret,
    hook: "onRequest",
  });

  // 3. JWT plugin for session signing & verification
  app.register(jwt, {
    secret: env.jwtSecret,
  });

  // 4. Register health monitoring endpoints
  app.register(registerHealthRoutes);

  // 5. Register Super Admin authentication endpoints
  app.register(registerAuthRoutes);

  // 6. Register Phase B Super Admin business endpoints
  app.register(registerRegistrationRoutes);
  app.register(registerDoctorRoutes);
  app.register(registerHospitalRoutes);
  app.register(registerAuditLogRoutes);
  app.register(registerAdminUsersRoutes);
  app.register(registerPlatformSettingsRoutes);

  // 7. Register Doctor Portal self-service endpoints
  app.register(registerDoctorPortalRoutes);

  // 8. Register Public Doctor Portfolio endpoints
  app.register(registerDoctorPublicRoutes);

  // 9. Register Doctor Live Queue foundation endpoints
  app.register(registerDoctorQueueRoutes);

  // 10. Register Persistent Patient Appointment endpoints
  app.register(registerAppointmentRoutes);

  // 11. Register Patients Directory endpoints
  app.register(registerPatientRoutes);

  // 12. Register Doctor Reports endpoints
  app.register(registerDoctorReportsRoutes);

  // 13. Register Doctor Practice Staff Management endpoints
  app.register(registerStaffRoutes);

  // 14. Register Doctor Practice Notifications endpoints
  app.register(registerNotificationRoutes);

  return app;
}
