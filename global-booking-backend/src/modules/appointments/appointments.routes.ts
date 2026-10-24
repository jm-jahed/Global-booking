import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { isValidDoctorSlug } from "../portal/doctor-portal.routes.js";
import type { DoctorRecord, DoctorChamberDetail } from "../admin/admin.types.js";
import {
  AppointmentServiceError,
  createGuestAppointment,
  recoverGuestAppointment,
  getDoctorAppointmentsList,
} from "./appointments.service.js";
import type { CreateGuestAppointmentInput, RecoverAppointmentInput } from "./appointments.types.js";

async function resolveAuthenticatedDoctor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<DoctorRecord | null> {
  const session = request.adminUser;
  if (!session) {
    void reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required to access doctor appointments.",
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
      message: "Doctor account is suspended. Appointment operations are blocked.",
    });
    return null;
  }

  return doctor;
}

export async function registerAppointmentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/public/doctors/:slug/appointments
   * Creates a persistent guest patient appointment in MongoDB.
   * Completely decoupled from live OPD queue tickets.
   */
  app.post<{ Params: { slug: string }; Body: CreateGuestAppointmentInput }>(
    "/api/v1/public/doctors/:slug/appointments",
    async (
      request: FastifyRequest<{ Params: { slug: string }; Body: CreateGuestAppointmentInput }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params;
      const normalizedSlug = (slug || "").trim().toLowerCase();

      if (!isValidDoctorSlug(normalizedSlug)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid doctor slug format.",
        });
      }

      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence is currently unavailable.",
        });
      }

      const body = request.body || ({} as CreateGuestAppointmentInput);
      const patientName = (body.patientName || "").trim();
      const patientPhone = (body.patientPhone || "").trim();

      if (!patientName || patientName.length < 2) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "patientName is required and must be at least 2 characters.",
        });
      }

      if (!patientPhone || patientPhone.length < 5) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "patientPhone is required and must be at least 5 digits.",
        });
      }

      const docCol = mongoAdapter.getDoctorCollection();
      let doctor = await docCol.findOne({
        slug: normalizedSlug,
        accountStatus: "ACTIVE",
        isPublished: true,
      });

      if (!doctor && typeof docCol.find === "function") {
        try {
          const candidateDocs = await docCol
            .find({ accountStatus: "ACTIVE", isPublished: true })
            .toArray();
          const match = candidateDocs?.find((d) => {
            if (d.slug && d.slug.toLowerCase() === normalizedSlug) return true;
            if (d.slug && (d.slug.toLowerCase().startsWith(normalizedSlug + "-") || normalizedSlug.startsWith(d.slug.toLowerCase() + "-"))) {
              return true;
            }
            return false;
          });
          if (match) doctor = match;
        } catch {}
      }

      if (!doctor) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Doctor profile not found or unavailable for online booking.",
        });
      }

      // Resolve chamber
      const requestedChamberId = body.chamberId ? String(body.chamberId).trim() : "";
      let chamber: DoctorChamberDetail | undefined;

      if (requestedChamberId && Array.isArray(doctor.chambers)) {
        chamber = doctor.chambers.find((c) => c.id === requestedChamberId);
      }

      if (!chamber) {
        chamber = doctor.chambers?.[0] || {
          id: "chamber-primary",
          facilityName: doctor.chamberLocationsSummary || "Primary Consultation Chamber",
          city: "Dubai",
          timezone: "Asia/Dubai",
        };
      }

      const chamberWithTz: DoctorChamberDetail = {
        ...chamber,
        timezone: chamber.timezone || "Asia/Dubai",
      };

      try {
        const result = await createGuestAppointment(doctor, chamberWithTz, body);

        return reply.status(201).send({
          statusCode: 201,
          success: true,
          appointment: result.appointment,
          isReplay: result.isReplay,
        });
      } catch (err: any) {
        if (err instanceof AppointmentServiceError) {
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
   * POST /api/v1/public/appointments/recover
   * Secure recovery using booking reference + complete phone number.
   * Uses POST body to prevent phone numbers appearing in browser history or access logs.
   */
  app.post<{ Body: RecoverAppointmentInput }>(
    "/api/v1/public/appointments/recover",
    async (
      request: FastifyRequest<{ Body: RecoverAppointmentInput }>,
      reply: FastifyReply,
    ) => {
      const body = request.body || ({} as RecoverAppointmentInput);
      const referenceNumber = (body.referenceNumber || "").trim();
      const patientPhone = (body.patientPhone || "").trim();

      if (!referenceNumber || !patientPhone) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Both booking reference number and contact phone number are required.",
        });
      }

      const clientIp = request.ip || "127.0.0.1";

      try {
        const appointment = await recoverGuestAppointment(referenceNumber, patientPhone, clientIp);

        return reply.status(200).send({
          statusCode: 200,
          success: true,
          appointment,
        });
      } catch (err: any) {
        if (err instanceof AppointmentServiceError) {
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
   * GET /api/v1/portal/doctor/appointments
   * Retrieves persistent appointments for the authenticated doctor.
   */
  app.get<{ Querystring: { chamberId?: string; appointmentDate?: string; status?: string } }>(
    "/api/v1/portal/doctor/appointments",
    {
      preHandler: [authenticateAdmin],
    },
    async (
      request: FastifyRequest<{
        Querystring: { chamberId?: string; appointmentDate?: string; status?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      const { chamberId, appointmentDate, status } = request.query || {};

      try {
        const appointments = await getDoctorAppointmentsList(doctor.doctorId, {
          chamberId,
          appointmentDate,
          status,
        });

        return reply.status(200).send({
          statusCode: 200,
          items: appointments,
          count: appointments.length,
          doctorId: doctor.doctorId,
        });
      } catch (err: any) {
        if (err instanceof AppointmentServiceError) {
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
