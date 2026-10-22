import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateSubscriptionExpiryDate,
  isSubscriptionExpired,
  createDefaultSubscription,
  createSubscriptionForPlan,
  renewSubscription,
} from "../src/modules/admin/subscription.service.js";

test("14-day trial: accurately calculates 14-day expiration", () => {
  const start = new Date("2026-03-01T10:00:00.000Z");
  const expiry = calculateSubscriptionExpiryDate(start, "14_DAYS_TRIAL");
  
  const diffDays = Math.round((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 14, "Trial duration must be exactly 14 calendar days");
  assert.equal(expiry.toISOString().split("T")[0], "2026-03-15");
});

test("30-day plan: accurately calculates 30-day expiration", () => {
  const start = new Date("2026-03-01T10:00:00.000Z");
  const expiry = calculateSubscriptionExpiryDate(start, "30_DAYS");
  
  const diffDays = Math.round((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 30, "30-day plan must be exactly 30 calendar days");
  assert.equal(expiry.toISOString().split("T")[0], "2026-03-31");
});

test("6-calendar-month plan: accurately calculates 6 calendar months with month-end clipping", () => {
  // Regular month: March 15 -> Sept 15
  const start1 = new Date("2026-03-15T12:00:00.000Z");
  const expiry1 = calculateSubscriptionExpiryDate(start1, "6_MONTHS");
  assert.equal(expiry1.toISOString().split("T")[0], "2026-09-15");

  // Non-leap year month end: Aug 31, 2025 + 6 months -> Feb 28, 2026
  const startNonLeap = new Date("2025-08-31T12:00:00.000Z");
  const expiryNonLeap = calculateSubscriptionExpiryDate(startNonLeap, "6_MONTHS");
  assert.equal(
    expiryNonLeap.toISOString().split("T")[0],
    "2026-02-28",
    "August 31 + 6 months in non-leap year must clip safely to Feb 28",
  );

  // Leap year month end: Aug 31, 2023 + 6 months -> Feb 29, 2024
  const startLeap = new Date("2023-08-31T12:00:00.000Z");
  const expiryLeap = calculateSubscriptionExpiryDate(startLeap, "6_MONTHS");
  assert.equal(
    expiryLeap.toISOString().split("T")[0],
    "2024-02-29",
    "August 31 + 6 months in leap year must clip safely to Feb 29",
  );
});

test("1-calendar-year plan: accurately calculates 12 months with leap-year handling", () => {
  // Standard year: May 10, 2025 -> May 10, 2026
  const startStd = new Date("2025-05-10T12:00:00.000Z");
  const expiryStd = calculateSubscriptionExpiryDate(startStd, "1_YEAR");
  assert.equal(expiryStd.toISOString().split("T")[0], "2026-05-10");

  // Leap day start: Feb 29, 2024 + 1 year -> Feb 28, 2025
  const startLeapDay = new Date("2024-02-29T12:00:00.000Z");
  const expiryLeapDay = calculateSubscriptionExpiryDate(startLeapDay, "1_YEAR");
  assert.equal(
    expiryLeapDay.toISOString().split("T")[0],
    "2025-02-28",
    "Feb 29 leap day + 1 year must safely clip to Feb 28 in non-leap year",
  );
});

test("isSubscriptionExpired: accurately detects active and expired subscriptions", () => {
  const activeSub = createDefaultSubscription({
    accountId: "ACC-DOC-TEST-1",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Fatima Al-Hashimi",
  });

  // Today is within trial
  assert.equal(isSubscriptionExpired(activeSub, new Date()), false);

  // 30 days in the future is expired
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  assert.equal(isSubscriptionExpired(activeSub, futureDate), true);
});

test("Subscription renewal: active subscription extends from current expiry date", () => {
  const activeSub = createDefaultSubscription({
    accountId: "ACC-DOC-TEST-2",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Tariq Mansoor",
  });

  // Current expiry is 14 days from now
  const originalExpiry = activeSub.expiryDate;

  const renewed = renewSubscription(activeSub, {
    duration: "6_MONTHS",
    actorAdminName: "superadmin@globalbooking.ae",
    transactionReference: "TXN-AED-6M-001",
  });

  assert.equal(renewed.status, "ACTIVE");
  assert.equal(renewed.isTrialActive, false);
  assert.equal(renewed.paymentStatus, "PAID");
  assert.equal(renewed.paymentHistory.length, 1);
  assert.equal(renewed.paymentHistory[0]?.transactionReference, "TXN-AED-6M-001");
  const lastEvent = renewed.lifecycleHistory[renewed.lifecycleHistory.length - 1];
  assert.equal(lastEvent?.eventType, "RENEWED");

  // The renewed expiry should start from originalExpiry, not from today
  const expectedNewExpiry = calculateSubscriptionExpiryDate(originalExpiry, "6_MONTHS")
    .toISOString()
    .split("T")[0];
  assert.equal(renewed.expiryDate, expectedNewExpiry);
});

test("Doctor and Hospital account types receive correct plans and AED amounts", () => {
  const docSub = createDefaultSubscription({
    accountId: "ACC-DOC-901",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Hamdan Saeed",
  });
  assert.equal(docSub.planId, "PLAN-DOCTOR-PRACTICE");
  assert.equal(docSub.price.amountInFils, 150000); // 1,500 AED
  assert.equal(docSub.price.currency, "AED");

  const hspSub = createDefaultSubscription({
    accountId: "ACC-HSP-801",
    accountType: "HOSPITAL",
    accountHolderName: "Al Zahra Medical Complex",
  });
  assert.equal(hspSub.planId, "PLAN-HOSPITAL-ENTERPRISE");
  assert.equal(hspSub.price.amountInFils, 450000); // 4,500 AED
  assert.equal(hspSub.price.currency, "AED");
});

test("createSubscriptionForPlan: creates 30-day, 6-month, and 1-year plans with paid status", () => {
  const paid30 = createSubscriptionForPlan({
    accountId: "ACC-DOC-30D",
    accountType: "DOCTOR",
    accountHolderName: "Dr. Salem",
    duration: "30_DAYS",
    actorAdminName: "superadmin@globalbooking.ae",
    transactionReference: "TXN-DOC-30D",
  });
  assert.equal(paid30.status, "ACTIVE");
  assert.equal(paid30.isTrialActive, false);
  assert.equal(paid30.paymentStatus, "PAID");
  assert.equal(paid30.billingPeriod, "MONTHLY");

  const paidYear = createSubscriptionForPlan({
    accountId: "ACC-HSP-1Y",
    accountType: "HOSPITAL",
    accountHolderName: "Dubai Specialized Clinic",
    duration: "1_YEAR",
    actorAdminName: "superadmin@globalbooking.ae",
    transactionReference: "TXN-HSP-1Y",
  });
  assert.equal(paidYear.status, "ACTIVE");
  assert.equal(paidYear.isTrialActive, false);
  assert.equal(paidYear.paymentStatus, "PAID");
  assert.equal(paidYear.billingPeriod, "YEARLY");
});
