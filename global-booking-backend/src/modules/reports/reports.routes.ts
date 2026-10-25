import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { getDoctorReportsData } from "./reports.service.js";
import { ReportsServiceError } from "./reports.types.js";
import type { DoctorReportQuery } from "./reports.types.js";
import type { DoctorRecord } from "../admin/admin.types.js";

/**
 * Resolves authenticated doctor entity from verified session.
 * Strictly guarantees that doctor sees only their own clinical records.
 */
async function resolveAuthenticatedDoctor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ doctorId: string; doctor: DoctorRecord } | null> {
  const session = request.adminUser;

  if (!session) {
    void reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required to access clinical reports.",
    });
    return null;
  }

  if (session.role !== "DOCTOR") {
    void reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message: "Access restricted to verified Doctor accounts.",
    });
    return null;
  }

  if (!mongoAdapter.isConnected()) {
    void reply.status(503).send({
      statusCode: 503,
      error: "Service Unavailable",
      message: "Database persistence is currently unavailable.",
    });
    return null;
  }

  const docCol = mongoAdapter.getDoctorCollection();
  const doctor = await docCol.findOne({
    $or: [{ id: session.adminId }, { doctorId: session.adminId }],
  });

  if (!doctor) {
    void reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Authorized doctor record not found.",
    });
    return null;
  }

  if (doctor.accountStatus === "SUSPENDED") {
    void reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message: "Doctor account is suspended. Clinical reports are unavailable.",
    });
    return null;
  }

  return {
    doctorId: doctor.doctorId || doctor.id,
    doctor,
  };
}

export async function registerDoctorReportsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/portal/doctor/reports
   * Retrieves aggregated clinical reports, visit trends, and paginated encounters.
   */
  app.get<{ Querystring: DoctorReportQuery }>(
    "/api/v1/portal/doctor/reports",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Querystring: DoctorReportQuery }>, reply: FastifyReply) => {
      const auth = await resolveAuthenticatedDoctor(request, reply);
      if (!auth) return;

      try {
        const reports = await getDoctorReportsData(auth.doctorId, request.query || {});
        return reply.status(200).send(reports);
      } catch (err: any) {
        if (err instanceof ReportsServiceError) {
          return reply.status(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        throw err;
      }
    },
  );

  /**
   * GET /api/v1/portal/doctor/reports/summary
   * Lightweight endpoint returning only summary KPI cards & distribution.
   */
  app.get<{ Querystring: DoctorReportQuery }>(
    "/api/v1/portal/doctor/reports/summary",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Querystring: DoctorReportQuery }>, reply: FastifyReply) => {
      const auth = await resolveAuthenticatedDoctor(request, reply);
      if (!auth) return;

      try {
        const reports = await getDoctorReportsData(auth.doctorId, request.query || {});
        return reply.status(200).send({
          statusCode: 200,
          doctorId: auth.doctorId,
          dateRange: reports.dateRange,
          summary: reports.summary,
          visitTrend: reports.visitTrend,
          visitTypeBreakdown: reports.visitTypeBreakdown,
        });
      } catch (err: any) {
        if (err instanceof ReportsServiceError) {
          return reply.status(err.statusCode).send({
            statusCode: err.statusCode,
            error: err.code,
            message: err.message,
          });
        }
        throw err;
      }
    },
  );
}
