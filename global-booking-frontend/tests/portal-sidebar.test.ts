import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOCTOR_NAV_ITEMS,
  HOSPITAL_NAV_ITEMS,
} from "../components/portal/portal-sidebar";

test("Doctor Dashboard Sidebar contains exactly 11 approved menus in strict order", () => {
  const expectedDoctorLabels = [
    "Dashboard",
    "Live Queue",
    "My Patients",
    "Availability & Schedule",
    "Reports",
    "QR Code & Booking Link",
    "Staff Management",
    "Subscription & Billing",
    "Notifications",
    "My Profile & Portfolio",
    "Logout",
  ];

  assert.equal(
    DOCTOR_NAV_ITEMS.length,
    11,
    `Expected exactly 11 Doctor sidebar menus, found ${DOCTOR_NAV_ITEMS.length}`,
  );

  const actualLabels = DOCTOR_NAV_ITEMS.map((m) => m.label);
  assert.deepEqual(
    actualLabels,
    expectedDoctorLabels,
    "Doctor sidebar modules must follow the exact approved specification order",
  );
});

test("Doctor account contains NO Hospital or Clinic menus", () => {
  const doctorLabels = DOCTOR_NAV_ITEMS.map((m) => m.label);

  const hospitalOnlyMenus = [
    "Doctors & Specialists",
    "Departments & Specializations",
    "Hospital / Clinic Profile",
    "Account Settings",
  ];

  for (const menu of hospitalOnlyMenus) {
    assert.equal(
      doctorLabels.includes(menu),
      false,
      `Doctor sidebar must NOT include Hospital/Clinic menu: ${menu}`,
    );
  }

  // Strictly uses "My Patients"
  assert.ok(doctorLabels.includes("My Patients"));
  assert.equal(doctorLabels.includes("Customers"), false);
  assert.equal(doctorLabels.includes("Clients"), false);
});

test("Hospital / Clinic Dashboard Sidebar contains exactly 14 approved menus in strict order", () => {
  const expectedHospitalLabels = [
    "Dashboard",
    "Live Queue",
    "Patients",
    "Doctors & Specialists",
    "Departments & Specializations",
    "Availability & Schedule",
    "Reports",
    "QR Code & Booking Link",
    "Staff Management",
    "Subscription & Billing",
    "Notifications",
    "Hospital / Clinic Profile",
    "Account Settings",
    "Logout",
  ];

  assert.equal(
    HOSPITAL_NAV_ITEMS.length,
    14,
    `Expected exactly 14 Hospital sidebar menus, found ${HOSPITAL_NAV_ITEMS.length}`,
  );

  const actualLabels = HOSPITAL_NAV_ITEMS.map((m) => m.label);
  assert.deepEqual(
    actualLabels,
    expectedHospitalLabels,
    "Hospital sidebar modules must follow the exact approved specification order",
  );
});

test("Staff login restrictions: Staff Management & Subscription & Billing hidden by default", () => {
  // Staff restricted items in Doctor dashboard
  const staffRestrictedInDoctor = DOCTOR_NAV_ITEMS.filter((item) => !item.staffAccessible).map(
    (item) => item.label,
  );

  assert.deepEqual(staffRestrictedInDoctor, [
    "Reports",
    "Staff Management",
    "Subscription & Billing",
  ]);

  // Live Queue allows phone booking for staff
  const queueItem = DOCTOR_NAV_ITEMS.find((item) => item.label === "Live Queue");
  assert.ok(queueItem);
  assert.equal(queueItem?.phoneBookingAllowed, true);

  // Doctor has full access to all 11 items
  assert.equal(DOCTOR_NAV_ITEMS.length, 11);
});
