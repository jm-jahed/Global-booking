import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import {
  syncDoctorLiveQueuePatients,
  getDoctorPatientsList,
  getDoctorPatientById,
  createDoctorPatientRecord,
} from "./patients.service.js";
import { PatientServiceError } from "./patients.types.js";
import type { CreatePatientBody, PatientQuery } from "./patients.types.js";

async function resolveAuthenticatedDoctor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ doctorId: string; doctorName: string } | null> {
  const session = request.adminUser;

  if (!session) {
    void reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required to access patient directory.",
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
      message: "Doctor account is suspended.",
    });
    return null;
  }

  return {
    doctorId: doctor.doctorId || doctor.id,
    doctorName: doctor.fullName,
  };
}

export async function registerPatientRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/portal/doctor/patients
   * Retrieves tenant-isolated patients list for authenticated doctor.
   */
  app.get<{ Querystring: PatientQuery }>(
    "/api/v1/portal/doctor/patients",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Querystring: PatientQuery }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      try {
        const result = await getDoctorPatientsList(doctor.doctorId, request.query || {});
        return reply.status(200).send({
          statusCode: 200,
          items: result.items,
          total: result.total,
          doctorId: doctor.doctorId,
        });
      } catch (err: any) {
        if (err instanceof PatientServiceError) {
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
   * GET /api/v1/portal/doctor/patients/:id
   * Retrieves detailed patient record including visit history.
   */
  app.get<{ Params: { id: string } }>(
    "/api/v1/portal/doctor/patients/:id",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      try {
        const patient = await getDoctorPatientById(doctor.doctorId, request.params.id);
        return reply.status(200).send({
          statusCode: 200,
          patient,
        });
      } catch (err: any) {
        if (err instanceof PatientServiceError) {
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
   * POST /api/v1/portal/doctor/patients
   * Manually registers a new patient in doctor's clinic.
   */
  app.post<{ Body: CreatePatientBody }>(
    "/api/v1/portal/doctor/patients",
    {
      preHandler: [authenticateAdmin],
    },
    async (request: FastifyRequest<{ Body: CreatePatientBody }>, reply: FastifyReply) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      try {
        const patient = await createDoctorPatientRecord(doctor.doctorId, request.body || ({} as any));
        return reply.status(201).send({
          statusCode: 201,
          success: true,
          patient,
        });
      } catch (err: any) {
        if (err instanceof PatientServiceError) {
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
   * POST /api/v1/portal/doctor/patients/sync
   * Triggers idempotent synchronization of Live Queue & Appointments into Patient Registry.
   */
  app.post<{ Body: { chamberId?: string; dateKey?: string } }>(
    "/api/v1/portal/doctor/patients/sync",
    {
      preHandler: [authenticateAdmin],
    },
    async (
      request: FastifyRequest<{ Body: { chamberId?: string; dateKey?: string } }>,
      reply: FastifyReply,
    ) => {
      const doctor = await resolveAuthenticatedDoctor(request, reply);
      if (!doctor) return;

      try {
        const result = await syncDoctorLiveQueuePatients(doctor.doctorId, request.body || {});
        return reply.status(200).send({
          statusCode: 200,
          success: true,
          message: "Live Queue patients synchronized successfully.",
          ...result,
        });
      } catch (err: any) {
        if (err instanceof PatientServiceError) {
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
