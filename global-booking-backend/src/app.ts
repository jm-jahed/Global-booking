import Fastify, { type FastifyInstance } from "fastify";

import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { INDUSTRY_CATEGORIES } from "./shared/configuration/industry-categories.js";
import { validateIndustryCategories } from "./shared/configuration/validate-industry-categories.js";

export function buildApp(): FastifyInstance {
  validateIndustryCategories(INDUSTRY_CATEGORIES);

  const app = Fastify({ logger: true });
  app.register(registerHealthRoutes);

  return app;
}
