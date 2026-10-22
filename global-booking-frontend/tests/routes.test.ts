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
  "/notifications", "/settings", "/admin", "/admin/login", "/admin/registrations",
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

test("portal separation guarantees /admin for Super Admin and /login for Doctor/Hospital", () => {
  assert.equal(ROUTES.admin, "/admin");
  assert.equal(ROUTES.adminLogin, "/admin/login");
  assert.ok(ROUTES.adminDoctors.startsWith("/admin/"));
  assert.ok(ROUTES.adminHospitals.startsWith("/admin/"));
  assert.ok(ROUTES.adminRegistrations.startsWith("/admin/"));

  assert.equal(ROUTES.login, "/login");
  assert.equal(ROUTES.dashboard, "/dashboard");
  assert.equal(ROUTES.appointments, "/appointments");
  assert.equal(ROUTES.patients, "/patients");
});
