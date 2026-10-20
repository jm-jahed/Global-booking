import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MOCK_SUPER_ADMIN_USERS,
  MOCK_PENDING_DOCTOR_APPLICATIONS,
  MOCK_PENDING_HOSPITAL_APPLICATIONS,
  MOCK_MANAGED_DOCTOR_ACCOUNTS,
  MOCK_MANAGED_HOSPITAL_ACCOUNTS,
  MOCK_SUBSCRIPTIONS,
  MOCK_AUDIT_LOG_ENTRIES,
  createSafeAEDAmount,
} from "../lib/data/mock-admin-data";
import type {
  SubscriptionBillingPeriod,
  SubscriptionStatus,
} from "../types/admin";

test("Super Admin RBAC fixtures contain valid administrative roles and permissions", () => {
  assert.ok(MOCK_SUPER_ADMIN_USERS.length >= 3, "Expected at least 3 mock admin users");

  const roles = new Set(MOCK_SUPER_ADMIN_USERS.map((user) => user.role));
  assert.ok(roles.has("SUPER_ADMIN"), "Must include SUPER_ADMIN role");
  assert.ok(roles.has("OPERATIONS_ADMIN"), "Must include OPERATIONS_ADMIN role");
  assert.ok(roles.has("BILLING_ADMIN"), "Must include BILLING_ADMIN role");

  for (const user of MOCK_SUPER_ADMIN_USERS) {
    assert.match(user.id, /^ADM-\d+$/, "Admin ID must follow ADM-XXXX format");
    assert.match(user.email, /^.+@globalbooking\.ae$/, "Admin email must use official domain");
    assert.ok(user.permissions.length > 0, "Admin must have at least one assigned permission");
    assert.equal(typeof user.isActive, "boolean");
  }
});

test("Pending doctor registration applications adhere to PENDING status and contain medical documents", () => {
  assert.ok(MOCK_PENDING_DOCTOR_APPLICATIONS.length >= 2, "Expected at least 2 pending doctor applications");

  for (const app of MOCK_PENDING_DOCTOR_APPLICATIONS) {
    assert.equal(app.accountType, "DOCTOR");
    assert.equal(app.status, "PENDING", "New registrations must start as PENDING");
    assert.match(app.id, /^REG-DOC-/, "Doctor application ID must have REG-DOC prefix");
    assert.ok(app.practiceDetails.primarySpecialty, "Doctor must have primary specialty");
    assert.ok(app.documents.length >= 1, "Doctor application must have submitted documents");

    // Verify document details
    const licenseDoc = app.documents.find((d) => d.documentType === "MEDICAL_LICENSE");
    assert.ok(licenseDoc, "Doctor must submit a MEDICAL_LICENSE document");
    assert.ok(licenseDoc?.documentNumber, "License document must have a documentNumber");
  }
});

test("Pending hospital registration applications adhere to PENDING status and contain facility accreditation", () => {
  assert.ok(MOCK_PENDING_HOSPITAL_APPLICATIONS.length >= 2, "Expected at least 2 pending hospital applications");

  for (const app of MOCK_PENDING_HOSPITAL_APPLICATIONS) {
    assert.equal(app.accountType, "HOSPITAL");
    assert.equal(app.status, "PENDING", "New registrations must start as PENDING");
    assert.match(app.id, /^REG-HSP-/, "Hospital application ID must have REG-HSP prefix");
    assert.ok(app.institutionName, "Institution name is required");
    assert.ok(app.facilityDetails.departments.length > 0, "Hospital must have departments");

    const accreditationDoc = app.documents.find((d) => d.documentType === "FACILITY_ACCREDITATION");
    assert.ok(accreditationDoc, "Hospital must submit FACILITY_ACCREDITATION");
  }
});

test("Managed accounts keep Doctor and Hospital entities strictly isolated and use Patient terminology", () => {
  // Verify Doctor Accounts
  for (const doc of MOCK_MANAGED_DOCTOR_ACCOUNTS) {
    assert.match(doc.id, /^ACC-DOC-/, "Account ID must have ACC-DOC prefix");
    assert.match(doc.doctorId, /^DOC-/, "Doctor ID must have DOC- prefix");
    assert.ok(doc.subscriptionId, "Doctor account must link to a subscription");
    // Explicit patient metrics verification
    assert.equal(typeof doc.assignedPatientCount, "number");
    assert.ok(doc.assignedPatientCount >= 0);
  }

  // Verify Hospital Accounts
  for (const hsp of MOCK_MANAGED_HOSPITAL_ACCOUNTS) {
    assert.match(hsp.id, /^ACC-HSP-/, "Account ID must have ACC-HSP prefix");
    assert.match(hsp.hospitalId, /^HSP-/, "Hospital ID must have HSP- prefix");
    assert.ok(hsp.subscriptionId, "Hospital account must link to a subscription");
    // Explicit patient metrics verification
    assert.equal(typeof hsp.outpatientPatientCount, "number");
    assert.ok(hsp.outpatientPatientCount >= 0);
  }

  // Ensure Doctor and Hospital IDs do not collide
  const doctorIds = new Set(MOCK_MANAGED_DOCTOR_ACCOUNTS.map((d) => d.doctorId));
  const hospitalIds = new Set(MOCK_MANAGED_HOSPITAL_ACCOUNTS.map((h) => h.hospitalId));
  for (const id of doctorIds) {
    assert.ok(!hospitalIds.has(id), `ID collision between doctor and hospital: ${id}`);
  }
});

test("Subscription contracts cover all three billing periods: MONTHLY, SIX_MONTHS, YEARLY", () => {
  const subscriptions = Object.values(MOCK_SUBSCRIPTIONS);
  assert.ok(subscriptions.length >= 4, "Expected multiple subscription fixtures");

  const billingPeriods = new Set<SubscriptionBillingPeriod>(
    subscriptions.map((sub) => sub.billingPeriod),
  );

  assert.ok(billingPeriods.has("MONTHLY"), "Must include MONTHLY billing period");
  assert.ok(billingPeriods.has("SIX_MONTHS"), "Must include SIX_MONTHS billing period");
  assert.ok(billingPeriods.has("YEARLY"), "Must include YEARLY billing period");
});

test("Subscription contracts cover key lifecycle statuses: TRIAL, ACTIVE, SUSPENDED", () => {
  const subscriptions = Object.values(MOCK_SUBSCRIPTIONS);
  const statuses = new Set<SubscriptionStatus>(subscriptions.map((sub) => sub.status));

  assert.ok(statuses.has("TRIAL"), "Must include TRIAL subscription status");
  assert.ok(statuses.has("ACTIVE"), "Must include ACTIVE subscription status");
  assert.ok(statuses.has("SUSPENDED"), "Must include SUSPENDED subscription status");
});

test("Monetary values use safe integer minor units in AED without floating-point errors", () => {
  const subscriptions = Object.values(MOCK_SUBSCRIPTIONS);

  for (const sub of subscriptions) {
    assert.equal(sub.price.currency, "AED", "Default currency must strictly be AED");
    assert.ok(
      Number.isInteger(sub.price.amountInFils),
      `amountInFils must be an integer, got: ${sub.price.amountInFils}`,
    );
    assert.ok(sub.price.amountInFils >= 0, "amountInFils must be non-negative");

    // Verify payment records
    for (const payment of sub.paymentHistory) {
      assert.equal(payment.amount.currency, "AED");
      assert.ok(Number.isInteger(payment.amount.amountInFils));
      assert.ok(payment.amount.amountInFils > 0, "Completed payments must be > 0 fils");
    }
  }

  // Test the createSafeAEDAmount helper
  const standardAED = createSafeAEDAmount(350);
  assert.equal(standardAED.amountInFils, 35000);
  assert.equal(standardAED.currency, "AED");

  // Test cents/fils rounding safety (e.g. 1890.50 -> 189050 fils)
  const decimalAED = createSafeAEDAmount(1890.5);
  assert.equal(decimalAED.amountInFils, 189050);
});

test("Audit logs contain valid actors, timestamps, categories, and target relationships", () => {
  assert.ok(MOCK_AUDIT_LOG_ENTRIES.length >= 4, "Expected at least 4 mock audit entries");

  for (const entry of MOCK_AUDIT_LOG_ENTRIES) {
    assert.match(entry.id, /^AUD-\d+$/, "Audit entry ID must match AUD-XXXX format");
    assert.ok(Date.parse(entry.timestamp), "Timestamp must be a valid ISO 8601 string");
    assert.ok(entry.actor.adminId, "Actor must have adminId");
    assert.ok(entry.actor.adminName, "Actor must have adminName");
    assert.ok(entry.summary.length > 0, "Audit entry must contain descriptive summary");
    assert.ok(["DOCTOR", "HOSPITAL", "ADMIN_USER", "SUBSCRIPTION", "PLATFORM_SETTING"].includes(entry.targetType));
  }
});
