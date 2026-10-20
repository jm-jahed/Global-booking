import assert from "node:assert/strict";
import { test } from "node:test";

import { SUPER_ADMIN_NAV_MODULES } from "../components/admin/admin-sidebar";
import { ROUTES } from "../config/routes";
import {
  MOCK_PENDING_DOCTOR_APPLICATIONS,
  MOCK_PENDING_HOSPITAL_APPLICATIONS,
} from "../lib/data/mock-admin-data";

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

test("Pending registration badge strictly sources its count from Phase 1 mock data fixtures", () => {
  const expectedMockCount =
    MOCK_PENDING_DOCTOR_APPLICATIONS.length +
    MOCK_PENDING_HOSPITAL_APPLICATIONS.length;

  const registrationModule = SUPER_ADMIN_NAV_MODULES[0];
  assert.equal(
    registrationModule.badge,
    String(expectedMockCount),
    "Pending registration badge count must match total mock pending applications (4)",
  );
  assert.equal(
    registrationModule.badgeLabel,
    "MOCK",
    "Badge must be explicitly identified with MOCK label",
  );

  // Other 5 modules must NOT have pending badges
  for (let i = 1; i < SUPER_ADMIN_NAV_MODULES.length; i++) {
    assert.equal(
      SUPER_ADMIN_NAV_MODULES[i].badge,
      null,
      `Module ${SUPER_ADMIN_NAV_MODULES[i].label} should not have a pending badge`,
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
