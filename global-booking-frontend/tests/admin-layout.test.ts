import assert from "node:assert/strict";
import { test } from "node:test";

import { SUPER_ADMIN_NAV_MODULES } from "../components/admin/admin-sidebar";
import { ROUTES } from "../config/routes";

test("Super Admin Sidebar contains exactly six approved modules in strict order", () => {
  const expectedLabels = [
    "New Registration Requests",
    "Doctors & Specialists",
    "Hospitals & Clinics",
    "Security & Audit Logs",
    "Admin Users & Permissions",
    "Platform Settings",
  ];

  assert.equal(
    SUPER_ADMIN_NAV_MODULES.length,
    6,
    `Expected exactly 6 primary sidebar modules, found ${SUPER_ADMIN_NAV_MODULES.length}`,
  );

  const actualLabels = SUPER_ADMIN_NAV_MODULES.map((m) => m.label);
  assert.deepEqual(
    actualLabels,
    expectedLabels,
    "Sidebar modules must follow the exact approved specification order",
  );
});

test("Sidebar module routes correspond to approved static routes", () => {
  assert.equal(SUPER_ADMIN_NAV_MODULES[0].href, ROUTES.adminRegistrations);
  assert.equal(SUPER_ADMIN_NAV_MODULES[1].href, ROUTES.adminDoctors);
  assert.equal(SUPER_ADMIN_NAV_MODULES[2].href, ROUTES.adminHospitals);
  assert.equal(SUPER_ADMIN_NAV_MODULES[3].href, ROUTES.adminAuditLogs);
  assert.equal(SUPER_ADMIN_NAV_MODULES[4].href, ROUTES.adminUsers);
  assert.equal(SUPER_ADMIN_NAV_MODULES[5].href, ROUTES.adminSettings);
});

test("Sidebar modules do not display mock fixture badges or labels", () => {
  for (const module of SUPER_ADMIN_NAV_MODULES) {
    assert.equal(
      module.badgeLabel,
      null,
      `Module ${module.label} must not display a MOCK label`,
    );
  }
});

test("Active-route matching highlights the correct module for current paths", () => {
  const [registrations, doctors, hospitals, auditLogs, users, settings] =
    SUPER_ADMIN_NAV_MODULES;

  // New Registration Requests should match root /admin and /admin/registrations
  assert.ok(registrations.activeMatch("/admin"));
  assert.ok(registrations.activeMatch("/admin/"));
  assert.ok(registrations.activeMatch("/admin/registrations"));
  assert.ok(!registrations.activeMatch("/admin/doctors"));

  // Doctors & Specialists
  assert.ok(doctors.activeMatch("/admin/doctors"));
  assert.ok(doctors.activeMatch("/admin/doctors/DOC-701"));
  assert.ok(!doctors.activeMatch("/admin/hospitals"));

  // Hospitals & Clinics
  assert.ok(hospitals.activeMatch("/admin/hospitals"));
  assert.ok(hospitals.activeMatch("/admin/hospitals/HSP-401"));
  assert.ok(!hospitals.activeMatch("/admin/audit-logs"));

  // Security & Audit Logs
  assert.ok(auditLogs.activeMatch("/admin/audit-logs"));
  assert.ok(!auditLogs.activeMatch("/admin/users"));

  // Admin Users & Permissions
  assert.ok(users.activeMatch("/admin/users"));
  assert.ok(!users.activeMatch("/admin/settings"));

  // Platform Settings
  assert.ok(settings.activeMatch("/admin/settings"));
  assert.ok(!settings.activeMatch("/admin"));
});
