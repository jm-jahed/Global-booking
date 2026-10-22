import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOCTOR_NAV_ITEMS,
  HOSPITAL_NAV_ITEMS,
} from "../components/portal/portal-sidebar";

test("Doctor Dashboard Sidebar contains exactly 12 approved menus in strict order", () => {
  const expectedDoctorLabels = [
    "Dashboard",
    "Appointments",
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
    12,
    `Expected exactly 12 Doctor sidebar menus, found ${DOCTOR_NAV_ITEMS.length}`,
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

test("Hospital / Clinic Dashboard Sidebar contains exactly 15 approved menus in strict order", () => {
  const expectedHospitalLabels = [
    "Dashboard",
    "Appointments",
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
    15,
    `Expected exactly 15 Hospital sidebar menus, found ${HOSPITAL_NAV_ITEMS.length}`,
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
    "Staff Management",
    "Subscription & Billing",
  ]);

  // Appointments allows phone booking for staff
  const appointmentsItem = DOCTOR_NAV_ITEMS.find((item) => item.label === "Appointments");
  assert.ok(appointmentsItem);
  assert.equal(appointmentsItem?.phoneBookingAllowed, true);

  // Doctor has full access to all 12 items
  assert.equal(DOCTOR_NAV_ITEMS.length, 12);
});
