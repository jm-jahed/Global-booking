import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import {
  getDoctorNotifications,
  setNotificationReadStatus,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
  getDoctorNotificationPreferences,
  updateDoctorNotificationPreferences,
  NotificationServiceError,
} from "./notification.service.js";
import type { NotificationsQueryInput } from "./notification.types.js";

/**
 * Resolves doctor identity from authenticated session.
 * Never trusts a client-supplied doctorId.
 */
async function resolveDoctorSession(
  request: FastifyRequest,
  reply: FastifyReply,
  options: { requireDoctorOnly?: boolean } = {},
): Promise<{ doctorId: string; role: string } | null> {
  const session = request.adminUser;
  if (!session) {
    void reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required.",
    });
    return null;
  }

  if (session.role === "DOCTOR") {
    // Verify doctor exists and not suspended
    const docCol = mongoAdapter.getDoctorCollection();
    const doc = await docCol.findOne({ id: session.adminId });
    if (!doc) {
      void reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Doctor profile not found.",
      });
      return null;
    }
    if (doc.accountStatus === "SUSPENDED") {
      void reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Doctor account is suspended. Notification operations are blocked.",
      });
      return null;
    }
    return { doctorId: session.adminId, role: "DOCTOR" };
  }

  if (session.role === "STAFF") {
    if (options.requireDoctorOnly) {
      void reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Administrative notification preferences require Doctor authority.",
      });
      return null;
    }

    if (!session.doctorId) {
      void reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Staff member is not assigned to a doctor practice.",
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

    // Verify parent doctor
    const docCol = mongoAdapter.getDoctorCollection();
    const doc = await docCol.findOne({ id: session.doctorId });
    if (!doc || doc.accountStatus === "SUSPENDED") {
      void reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Parent doctor account is inactive or suspended.",
      });
      return null;
    }

    return { doctorId: session.doctorId, role: "STAFF" };
  }

  void reply.status(403).send({
    statusCode: 403,
    error: "Forbidden",
    message: "Access restricted to verified Doctor or authorized Staff accounts.",
  });
  return null;
}

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/portal/doctor/notifications
   * Retrieves notifications with pagination, category/read filters, and unread count.
   */
  app.get<{ Querystring: NotificationsQueryInput }>(
    "/api/v1/portal/doctor/notifications",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      try {
        const result = await getDoctorNotifications(auth.doctorId, request.query || {});
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          ...result,
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * PATCH /api/v1/portal/doctor/notifications/:id/read
   * Toggles or marks a specific notification as read.
   */
  app.patch<{ Params: { id: string }; Body: { read?: boolean } }>(
    "/api/v1/portal/doctor/notifications/:id/read",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      const { id } = request.params;
      const readVal = request.body?.read !== undefined ? Boolean(request.body.read) : true;

      try {
        const notification = await setNotificationReadStatus(auth.doctorId, id, readVal);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          notification,
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * POST /api/v1/portal/doctor/notifications/mark-all-read
   * Marks all unread notifications as read.
   */
  app.post(
    "/api/v1/portal/doctor/notifications/mark-all-read",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      try {
        const count = await markAllNotificationsRead(auth.doctorId);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          count,
          message: `Marked ${count} notifications as read.`,
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * DELETE /api/v1/portal/doctor/notifications/:id
   * Dismisses a single notification.
   */
  app.delete<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/notifications/:id",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      const { id } = request.params;

      try {
        const deleted = await deleteNotification(auth.doctorId, id);
        if (!deleted) {
          return reply.status(404).send({
            statusCode: 404,
            error: "NOT_FOUND",
            message: "Notification not found or access denied.",
          });
        }
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          message: "Notification dismissed successfully.",
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * DELETE /api/v1/portal/doctor/notifications/clear-read
   * Deletes all read notifications.
   */
  app.delete(
    "/api/v1/portal/doctor/notifications/clear-read",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      try {
        const count = await clearReadNotifications(auth.doctorId);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          count,
          message: `Cleared ${count} read notifications.`,
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * GET /api/v1/portal/doctor/notifications/preferences
   * Retrieves notification preferences.
   */
  app.get(
    "/api/v1/portal/doctor/notifications/preferences",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply);
      if (!auth) return;

      try {
        const preferences = await getDoctorNotificationPreferences(auth.doctorId);
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          preferences,
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
   * PUT /api/v1/portal/doctor/notifications/preferences
   * Updates notification preferences (Doctor-only).
   */
  app.put<{ Body: any }>(
    "/api/v1/portal/doctor/notifications/preferences",
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      const auth = await resolveDoctorSession(request, reply, { requireDoctorOnly: true });
      if (!auth) return;

      try {
        const preferences = await updateDoctorNotificationPreferences(
          auth.doctorId,
          request.body || {},
        );
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          preferences,
          message: "Notification preferences updated successfully.",
        });
      } catch (err: any) {
        if (err instanceof NotificationServiceError) {
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
