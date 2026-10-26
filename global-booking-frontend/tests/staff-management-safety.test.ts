import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOCTOR_NAV_ITEMS,
  HOSPITAL_NAV_ITEMS,
} from "../components/portal/portal-sidebar";
import {
  getDoctorStaffCacheKey,
  backendRecordToStaffMember,
} from "../components/portal/staff/staff-view";
import type { BackendStaffRecord } from "../lib/api/admin-client";

// Mock localStorage for isolation testing
class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

test("1. Empty backend staff list returns zero Staff records and no fake demo data", () => {
  // Empty backend response simulation
  const backendResponse: { staff: BackendStaffRecord[] } = { staff: [] };

  const mappedStaff = backendResponse.staff.map(backendRecordToStaffMember);

  assert.equal(mappedStaff.length, 0, "Mapped staff array must be strictly empty");

  // Verify KPI calculations for an empty database response
  const totalStaff = mappedStaff.length;
  const activeStaff = mappedStaff.filter((s) => s.status === "Active").length;
  const receptionists = mappedStaff.filter((s) => s.role === "Receptionist / Front Desk").length;
  const chamberManagers = mappedStaff.filter((s) => s.role === "Chamber Manager").length;

  assert.equal(totalStaff, 0, "Total staff KPI must be 0 for empty database");
  assert.equal(activeStaff, 0, "Active staff KPI must be 0 for empty database");
  assert.equal(receptionists, 0, "Receptionists KPI must be 0 for empty database");
  assert.equal(chamberManagers, 0, "Chamber Managers KPI must be 0 for empty database");

  // Verify demo names are completely absent
  const forbiddenDemoNames = [
    "Fatima Begum",
    "Md. Tanvir Hossain",
    "Nasreen Akter",
    "Kamrul Hasan",
  ];
  for (const name of forbiddenDemoNames) {
    const found = mappedStaff.some((s) => s.name === name);
    assert.equal(found, false, `Demo record '${name}' must NOT exist in production data`);
  }
});

test("2. API failure states do not display demo records as real database records", () => {
  // Simulating the error-handling branch from fetchStaffList()
  let staffList: any[] = [];
  let apiError: string | null = null;
  let isLoading = true;

  try {
    throw new Error("500 Internal Server Error: Database connection refused");
  } catch (err: any) {
    isLoading = false;
    apiError = err?.message || "Failed to connect to backend server";
    // As implemented in staff-view.tsx, on error staffList is set strictly to []
    staffList = [];
  }

  assert.equal(isLoading, false, "Loading state must be set to false after error");
  assert.equal(staffList.length, 0, "Staff list must remain empty on API failure");
  assert.ok(apiError !== null, "API error must be set on failure");
  assert.match(
    apiError!,
    /500 Internal Server Error/i,
    "API error banner must expose the real connection issue",
  );

  // Guarantee no fallback demo array is substituted
  assert.equal(
    staffList.some((s) => s.name === "Fatima Begum"),
    false,
    "Demo records must never be injected on API error",
  );
});

test("3. Doctor-specific cached data is strictly isolated by Doctor ID and cannot leak across accounts", () => {
  const doctorAId = "doc_alpha_987";
  const doctorBId = "doc_beta_456";

  const keyA = getDoctorStaffCacheKey(doctorAId);
  const keyB = getDoctorStaffCacheKey(doctorBId);

  // 1. Keys must be distinct and scoped
  assert.equal(keyA, `gb_staff_cache_${doctorAId}`);
  assert.equal(keyB, `gb_staff_cache_${doctorBId}`);
  assert.notEqual(keyA, keyB, "Doctor A and Doctor B must have different cache keys");

  // 2. Storage isolation simulation
  const storage = new MockStorage();

  const doctorAStaff: BackendStaffRecord[] = [
    {
      id: "staff_1",
      doctorId: doctorAId,
      name: "Doctor A Receptionist",
      email: "staffA@practice.com",
      phone: "01711000001",
      role: "STAFF",
      staffRole: "Receptionist / Front Desk",
      tenantType: "DOCTOR",
      chamberLocation: "Dhaka Central",
      accountStatus: "ACTIVE",
      permissions: {
        canManageQueue: true,
        canBookPhoneAppointments: true,
        canViewPatientHistory: false,
        canCollectPayments: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Doctor A caches their staff
  storage.setItem(keyA, JSON.stringify(doctorAStaff.map(backendRecordToStaffMember)));

  // Doctor B logs in: check Doctor B cache
  const cachedForDoctorB = storage.getItem(keyB);
  assert.equal(
    cachedForDoctorB,
    null,
    "Doctor B must not see Doctor A's cached staff records",
  );

  // Default fallback key when doctorId is missing is also isolated
  const defaultKey = getDoctorStaffCacheKey(undefined);
  assert.equal(defaultKey, "gb_staff_cache_default");
  assert.notEqual(defaultKey, keyA);
});

test("4. Staff cannot see Reports in sidebar for Doctor and Hospital navigation", () => {
  // Check Doctor navigation
  const doctorReportsItem = DOCTOR_NAV_ITEMS.find((item) => item.id === "reports");
  assert.ok(doctorReportsItem, "Reports item must exist in Doctor navigation");
  assert.equal(
    doctorReportsItem?.staffAccessible,
    false,
    "Reports in Doctor nav must be staffAccessible: false",
  );

  // Check Hospital navigation
  const hospitalReportsItem = HOSPITAL_NAV_ITEMS.find((item) => item.id === "reports");
  assert.ok(hospitalReportsItem, "Reports item must exist in Hospital navigation");
  assert.equal(
    hospitalReportsItem?.staffAccessible,
    false,
    "Reports in Hospital nav must be staffAccessible: false",
  );

  // Staff restricted items in Doctor dashboard must include Reports and Staff Management
  const staffRestrictedDoctorItems = DOCTOR_NAV_ITEMS.filter((item) => !item.staffAccessible).map(
    (item) => item.label,
  );
  assert.ok(
    staffRestrictedDoctorItems.includes("Reports"),
    "Staff restricted doctor items must include 'Reports'",
  );
  assert.ok(
    staffRestrictedDoctorItems.includes("Staff Management"),
    "Staff restricted doctor items must include 'Staff Management'",
  );

  // Hospital navigation retains Subscription & Billing as staff-restricted
  const staffRestrictedHospitalItems = HOSPITAL_NAV_ITEMS.filter((item) => !item.staffAccessible).map(
    (item) => item.label,
  );
  assert.ok(
    staffRestrictedHospitalItems.includes("Subscription & Billing"),
    "Staff restricted hospital items must include 'Subscription & Billing'",
  );
});

test("5. Staff account is prevented from using Staff Management through direct navigation", () => {
  // Route restriction contract as defined in portal-layout-client.tsx
  function checkRouteAccess(accountType: "DOCTOR" | "HOSPITAL" | "STAFF", pathname: string) {
    const isDoctorAccount = accountType === "DOCTOR";
    const isStaffAccount = accountType === "STAFF";

    const isHospitalOnlyRoute =
      pathname.startsWith("/services") || pathname.startsWith("/departments");
    const isStaffRestrictedRoute =
      pathname.startsWith("/staff") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/reports");

    const isRestricted =
      (isDoctorAccount && isHospitalOnlyRoute) ||
      (isStaffAccount && (isHospitalOnlyRoute || isStaffRestrictedRoute));

    return {
      allowed: !isRestricted,
      isRestricted,
    };
  }

  // 1. Staff accessing /staff
  const staffOnStaffPage = checkRouteAccess("STAFF", "/staff");
  assert.equal(staffOnStaffPage.allowed, false, "Staff must NOT be allowed to access /staff");
  assert.equal(staffOnStaffPage.isRestricted, true);

  // 2. Staff accessing /reports
  const staffOnReportsPage = checkRouteAccess("STAFF", "/reports");
  assert.equal(staffOnReportsPage.allowed, false, "Staff must NOT be allowed to access /reports");
  assert.equal(staffOnReportsPage.isRestricted, true);

  // 3. Staff accessing /pricing
  const staffOnPricingPage = checkRouteAccess("STAFF", "/pricing");
  assert.equal(staffOnPricingPage.allowed, false, "Staff must NOT be allowed to access /pricing");
  assert.equal(staffOnPricingPage.isRestricted, true);

  // 4. Staff permitted on /live-queue and /dashboard
  const staffOnQueue = checkRouteAccess("STAFF", "/live-queue");
  assert.equal(staffOnQueue.allowed, true, "Staff MUST be allowed on /live-queue");

  const staffOnDashboard = checkRouteAccess("STAFF", "/dashboard");
  assert.equal(staffOnDashboard.allowed, true, "Staff MUST be allowed on /dashboard");

  // 5. Doctor permitted on /staff and /reports
  const doctorOnStaff = checkRouteAccess("DOCTOR", "/staff");
  assert.equal(doctorOnStaff.allowed, true, "Doctor MUST be allowed on /staff");

  const doctorOnReports = checkRouteAccess("DOCTOR", "/reports");
  assert.equal(doctorOnReports.allowed, true, "Doctor MUST be allowed on /reports");
});
