import assert from "node:assert/strict";
import { test } from "node:test";

import { INDUSTRIES } from "../config/industries";
import { ROUTES, ROUTE_PATTERNS, STATIC_ROUTE_PATHS } from "../config/routes";

const REQUIRED_STATIC_ROUTES = [
  "/", "/about", "/industries", "/features", "/how-it-works", "/pricing",
  "/contact", "/privacy", "/terms", "/book", "/booking/confirmation",
  "/booking/status", "/login", "/register", "/forgot-password",
  "/reset-password", "/dashboard", "/appointments", "/patients", "/customers",
  "/clients", "/services", "/staff", "/availability", "/locations",
  "/notifications", "/settings", "/admin", "/admin/registrations",
  "/admin/doctors", "/admin/hospitals", "/admin/audit-logs",
  "/admin/businesses", "/admin/users",
  "/admin/industries", "/admin/appointments", "/admin/reports", "/admin/settings",
  "/api/backend-health",
] as const;

test("central route configuration contains every required static route", () => {
  assert.deepEqual([...STATIC_ROUTE_PATHS].sort(), [...REQUIRED_STATIC_ROUTES].sort());
  assert.equal(new Set(STATIC_ROUTE_PATHS).size, STATIC_ROUTE_PATHS.length);
});

test("dynamic route patterns remain explicit and conflict-free", () => {
  assert.deepEqual(ROUTE_PATTERNS, {
    industry: "/[industry]",
    business: "/[industry]/[businessSlug]",
    businessBook: "/[industry]/[businessSlug]/book",
    businessServices: "/[industry]/[businessSlug]/services",
    appointment: "/appointments/[appointmentId]",
  });
  assert.equal(ROUTES.services, "/services");
});

test("industry configuration preserves recipient terminology", () => {
  const bySlug = Object.fromEntries(INDUSTRIES.map((industry) => [industry.slug, industry]));
  assert.equal(bySlug.doctors?.recipientTerm, "Patient");
  assert.equal(bySlug.hospitals?.recipientTerm, "Patient");
  assert.equal(new Set(INDUSTRIES.map((industry) => industry.slug)).size, INDUSTRIES.length);
  assert.equal(INDUSTRIES.length, 2);
});
