import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";

import { readServerEnvironment, type ServerEnvironment } from "./config/environment.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { INDUSTRY_CATEGORIES } from "./shared/configuration/industry-categories.js";
import { validateIndustryCategories } from "./shared/configuration/validate-industry-categories.js";

export function buildApp(customEnv?: Partial<ServerEnvironment>): FastifyInstance {
  validateIndustryCategories(INDUSTRY_CATEGORIES);

  const env = { ...readServerEnvironment(), ...customEnv };
  const app = Fastify({ logger: env.nodeEnv !== "test" });

  // 1. CORS plugin with explicit allowed origins & credentials
  app.register(cors, {
    origin: [env.frontendOrigin, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

  return app;
}
