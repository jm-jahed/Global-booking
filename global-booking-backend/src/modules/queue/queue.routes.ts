import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import {
  createQueueTicket,
  getDoctorQueueTickets,
  callQueueTicket,
  finishQueueTicket,
  skipQueueTicket,
  noShowQueueTicket,
  archiveDoctorQueueDayEnd,
  QueueServiceError,
} from "./queue.service.js";
import type { CreateQueueTicketBody, QueueQuery } from "./queue.types.js";
import type { DoctorRecord } from "../admin/admin.types.js";
import { createNotification } from "../notifications/notification.service.js";

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

    if (session.role !== "DOCTOR" && session.role !== "STAFF") {
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

    let targetDoctorId: string | undefined;

    if (session.role === "DOCTOR") {
      targetDoctorId = session.adminId;
    } else if (session.role === "STAFF") {
      if (!session.doctorId) {
        void reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Staff member is not assigned to a doctor.",
        });
        return null;
      }

      const staffCol = mongoAdapter.getStaffCollection();
      const staff = await staffCol.findOne({ id: session.adminId });
      if (!staff || staff.accountStatus === "SUSPENDED") {
        void reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Staff account is suspended or inactive.",
        });
        return null;
      }

      if (staff.permissions && staff.permissions.canManageQueue === false) {
        void reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Staff member does not have permission to manage live queue.",
        });
        return null;
      }

      targetDoctorId = session.doctorId;
    } else {
      void reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Access restricted to verified Doctor or authorized Staff accounts.",
      });
      return null;
    }

    const docCol = mongoAdapter.getDoctorCollection();
    const doctor = await docCol.findOne({ id: targetDoctorId });

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

        // Business event 2: Queue ticket successfully called (error isolated)
        const targetDoctorId = doctor.id || doctor.doctorId;
        createNotification({
          id: `notif_queue_call_${ticket.id}`,
          doctorId: targetDoctorId,
          type: "queue",
          priority: "urgent",
          title: `Patient in Chamber — Token ${ticket.ticketNumber}`,
          message: `Patient ${ticket.patientName} (Token ${ticket.ticketNumber}) called into consultation chamber.`,
          read: false,
          chamberId: ticket.chamberId,
          patientName: ticket.patientName,
          patientPhone: ticket.patientPhone,
          tokenNumber: ticket.ticketNumber,
          actionLink: "/live-queue",
          actionLabel: "Open Live Queue",
          eventRef: `queue_call:${ticket.id}`,
        }).catch((notifErr) => {
          request.log.error(notifErr, "Failed to create queue call notification record");
        });

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

  /**
   * PATCH /api/v1/portal/doctor/queue/tickets/:id/skip
   * Marks a ticket as skipped.
   */
  app.patch<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/queue/tickets/:id/skip",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { id } = request.params;

      try {
        const ticket = await skipQueueTicket(doctor.doctorId, id);
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
   * PATCH /api/v1/portal/doctor/queue/tickets/:id/noshow
   * Marks a ticket as no-show.
   */
  app.patch<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/queue/tickets/:id/noshow",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { id } = request.params;

      try {
        const ticket = await noShowQueueTicket(doctor.doctorId, id);
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
   * POST /api/v1/portal/doctor/queue/day-end
   * Executes idempotent day-end cleanup for the authenticated doctor.
   * Archives tickets for past dates or specified date without deleting any records.
   */
  app.post<{
    Body: { chamberId?: string; targetDateKey?: string; forceToday?: boolean };
  }>(
    "/api/v1/portal/doctor/queue/day-end",
    {
      preHandler: [authenticateAdmin],
    },
    async (
      request: FastifyRequest<{
        Body: { chamberId?: string; targetDateKey?: string; forceToday?: boolean };
      }>,
      reply: FastifyReply,
    ) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const body = request.body || {};

      try {
        const result = await archiveDoctorQueueDayEnd(doctor.doctorId, {
          chamberId: body.chamberId,
          targetDateKey: body.targetDateKey,
          forceToday: body.forceToday,
        });

        return reply.status(200).send({
          statusCode: 200,
          ...result,
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
