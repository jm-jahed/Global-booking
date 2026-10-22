import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { authenticateAdmin } from "../auth/auth.guard.js";
import { requirePermission } from "../auth/auth.guard.js";

interface AuditLogQuerystring {
  category?: string | undefined;
  action?: string | undefined;
  search?: string | undefined;
  page?: string | undefined;
  limit?: string | undefined;
}

export async function registerAuditLogRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/admin/audit-logs
   * Retrieves persistent administrative audit log entries with category and action filtering.
   */
  app.get<{ Querystring: AuditLogQuerystring }>(
    "/api/v1/admin/audit-logs",
    {
      preHandler: [authenticateAdmin, requirePermission("VIEW_AUDIT_LOGS")],
    },
    async (request: FastifyRequest<{ Querystring: AuditLogQuerystring }>, reply: FastifyReply) => {
      if (!mongoAdapter.isConnected()) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "Database persistence unavailable.",
        });
      }

      const { category, action, search, page = "1", limit = "30" } = request.query;
      const query: Record<string, unknown> = {};

      if (category) {
        query.category = category.toUpperCase();
      }

      if (action) {
        query.action = action.toUpperCase();
      }

      if (search) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        query.$or = [
          { targetName: searchRegex },
          { summary: searchRegex },
          { "actor.adminEmail": searchRegex },
          { targetId: searchRegex },
        ];
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
      const skip = (pageNum - 1) * limitNum;

      const audCol = mongoAdapter.getAuditLogCollection();
      const [items, total] = await Promise.all([
        audCol.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum).toArray(),
        audCol.countDocuments(query),
      ]);

      return reply.status(200).send({
        statusCode: 200,
        items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    },
  );
}
