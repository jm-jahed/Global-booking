import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import {
  createQueueTicket,
  getDoctorQueueTickets,
  callQueueTicket,
  finishQueueTicket,
  QueueServiceError,
} from "./queue.service.js";
import type { CreateQueueTicketBody, QueueQuery } from "./queue.types.js";
import type { DoctorRecord } from "../admin/admin.types.js";

export async function registerDoctorQueueRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Helper: Resolves authenticated DoctorRecord from verified JWT session.
   * Never trusts client-supplied doctorId.
   */
  async function resolveAuthenticatedDoctor(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<DoctorRecord | null> {
    const session = request.adminUser;

    if (!session) {
      void reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required to access doctor queue.",
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
    const doctor = await docCol.findOne({ id: session.adminId });

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
        message: "Doctor account is suspended. Queue operations are blocked.",
      });
      return null;
    }

    return doctor;
  }

  /**
   * GET /api/v1/portal/doctor/queue
   * Retrieves queue tickets for the authenticated doctor.
   * Filters optionally by chamberId, dateKey, and status.
   */
  app.get<{ Querystring: QueueQuery }>(
    "/api/v1/portal/doctor/queue",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Querystring: QueueQuery }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { chamberId, dateKey, status } = request.query || {};

      // If chamberId is specified, verify ownership
      if (chamberId) {
        const authorizedChambers = doctor.chambers || [];
        const chamber = authorizedChambers.find((c) => c.id === chamberId);
        if (!chamber) {
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: `Access denied: chamber '${chamberId}' does not belong to authorized doctor.`,
          });
        }
      }

      try {
        const tickets = await getDoctorQueueTickets(doctor.doctorId, {
          chamberId,
          dateKey,
          status,
        });

        return reply.status(200).send({
          statusCode: 200,
          items: tickets,
          count: tickets.length,
          doctorId: doctor.doctorId,
        });
      } catch (err: any) {
        if (err instanceof QueueServiceError) {
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
   * POST /api/v1/portal/doctor/queue/tickets
   * Issues a new walk-in OPD queue ticket.
   * Scopes daily serials to doctorId + chamberId + businessDate.
   */
  app.post<{ Body: CreateQueueTicketBody }>(
    "/api/v1/portal/doctor/queue/tickets",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Body: CreateQueueTicketBody }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const body = request.body || ({} as CreateQueueTicketBody);

      // Validate required inputs
      const chamberId = String(body.chamberId || "").trim();
      const patientName = String(body.patientName || "").trim();

      if (!chamberId) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "chamberId is required to issue a queue ticket.",
        });
      }

      if (!patientName || patientName.length < 2 || patientName.length > 100) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "patientName must be between 2 and 100 characters.",
        });
      }

      // Verify that the requested chamber belongs to the authenticated doctor
      const authorizedChambers = doctor.chambers || [];
      const chamber = authorizedChambers.find((c) => c.id === chamberId);

      if (!chamber) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: `Access denied: chamber '${chamberId}' is not registered in your doctor profile.`,
        });
      }

      try {
        const result = await createQueueTicket(
          doctor,
          chamber,
          body,
          doctor.id,
        );

        const httpStatus = result.isReplay ? 200 : 201;
        return reply.status(httpStatus).send({
          statusCode: httpStatus,
          ticket: result.ticket,
          isReplay: result.isReplay,
        });
      } catch (err: any) {
        if (err instanceof QueueServiceError) {
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
   * PATCH /api/v1/portal/doctor/queue/tickets/:id/call
   * Calls a waiting patient into the consultation chamber.
   */
  app.patch<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/queue/tickets/:id/call",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { id } = request.params;

      try {
        const ticket = await callQueueTicket(doctor.doctorId, id);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          ticket,
        });
      } catch (err: any) {
        if (err instanceof QueueServiceError) {
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
   * PATCH /api/v1/portal/doctor/queue/tickets/:id/finish
   * Marks consultation as completed.
   */
  app.patch<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/queue/tickets/:id/finish",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { id } = request.params;

      try {
        const ticket = await finishQueueTicket(doctor.doctorId, id);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          ticket,
        });
      } catch (err: any) {
        if (err instanceof QueueServiceError) {
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
