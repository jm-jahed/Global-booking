import crypto from "node:crypto";
import type {
  MoneyAmount,
  SubscriptionRecord,
  AccountType,
  SubscriptionDuration,
  SubscriptionBillingPeriod,
  PaymentMethodType,
  SubscriptionPaymentRecord,
} from "./admin.types.js";

/**
 * Creates a safe monetary representation in AED minor units (fils).
 * 1 AED = 100 Fils.
 */
export function formatAedAmount(aedUnits: number): MoneyAmount {
  const safeUnits = Number.isFinite(aedUnits) && aedUnits >= 0 ? aedUnits : 0;
  const amountInFils = Math.round(safeUnits * 100);
  const formatted = (amountInFils / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    amountInFils,
    currency: "AED",
    formatted,
  };
}

/**
 * Accurately calculates subscription expiration date considering:
 * - 14-Day Free Trial: exact 14 calendar days
 * - 30-Day Plan: exact 30 calendar days
 * - 6-Month Plan: 6 calendar months (handles month-end e.g. Aug 31 -> Feb 28/29)
 * - 1-Year Plan: 1 calendar year / 12 months (handles leap year e.g. Feb 29 2024 -> Feb 28 2025)
 */
export function calculateSubscriptionExpiryDate(
  startDate: Date | string,
  duration: SubscriptionDuration,
): Date {
  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate.getTime());

  if (duration === "14_DAYS_TRIAL") {
    const result = new Date(start.getTime());
    result.setDate(result.getDate() + 14);
    return result;
  }

  if (duration === "30_DAYS") {
    const result = new Date(start.getTime());
    result.setDate(result.getDate() + 30);
    return result;
  }

  if (duration === "6_MONTHS") {
    const year = start.getFullYear();
    const month = start.getMonth(); // 0-indexed (0=Jan, 11=Dec)
    const day = start.getDate();

    const targetMonth = month + 6;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;

    // Day clipping to month end: e.g. Aug 31 -> Feb 28 (or 29 in leap year)
    const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    const result = new Date(start.getTime());
    result.setDate(1); // Set to day 1 first to avoid month overflow
    result.setFullYear(targetYear);
    result.setMonth(normalizedMonth);
    result.setDate(targetDay);
    return result;
  }

  if (duration === "1_YEAR") {
    const year = start.getFullYear() + 1;
    const month = start.getMonth();
    const day = start.getDate();

    // Day clipping for leap year: e.g. Feb 29 2024 -> Feb 28 2025
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    const result = new Date(start.getTime());
    result.setDate(1); // Set to day 1 first to avoid month overflow
    result.setFullYear(year);
    result.setMonth(month);
    result.setDate(targetDay);
    return result;
  }

  throw new Error(`Unsupported subscription duration: ${duration}`);
}

/**
 * Determines whether a subscription is currently expired based on date comparison.
 */
export function isSubscriptionExpired(sub: SubscriptionRecord, now = new Date()): boolean {
  const expiry = new Date(sub.expiryDate);
  expiry.setHours(23, 59, 59, 999);
  return now.getTime() > expiry.getTime();
}

/**
 * Maps subscription duration to the appropriate billing period token.
 */
function durationToBillingPeriod(duration: SubscriptionDuration): SubscriptionBillingPeriod {
  switch (duration) {
    case "14_DAYS_TRIAL":
    case "30_DAYS":
      return "MONTHLY";
    case "6_MONTHS":
      return "SIX_MONTHS";
    case "1_YEAR":
      return "YEARLY";
  }
}

/**
 * Initializes a default subscription record with an approved 14-day trial in AED.
 */
export function createDefaultSubscription(params: {
  accountId: string;
  accountType: AccountType;
  accountHolderName: string;
  actorAdminName?: string;
}): SubscriptionRecord {
  const prefix = params.accountType === "DOCTOR" ? "SUB-DOC" : "SUB-HSP";
  const subId = `${prefix}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const now = new Date();
  const startDateStr = now.toISOString().split("T")[0]!;

  const expiryDate = calculateSubscriptionExpiryDate(now, "14_DAYS_TRIAL");
  const expiryDateStr = expiryDate.toISOString().split("T")[0]!;
  const nowIso = now.toISOString();

  const isDoctor = params.accountType === "DOCTOR";
  const planId = isDoctor ? "PLAN-DOCTOR-PRACTICE" : "PLAN-HOSPITAL-ENTERPRISE";
  const planName = isDoctor ? "Doctor Practice Standard" : "Hospital Enterprise Suite";
  const standardPrice = isDoctor ? formatAedAmount(1500) : formatAedAmount(4500);

  return {
    id: subId,
    accountId: params.accountId,
    accountType: params.accountType,
    accountHolderName: params.accountHolderName,
    planId,
    planName,
    billingPeriod: "MONTHLY",
    status: "TRIAL",
    isTrialActive: true,
    trialDaysAllocated: 14,
    trialDaysRemaining: 14,
    price: standardPrice,
    startDate: startDateStr,
    expiryDate: expiryDateStr,
    renewalDate: expiryDateStr,
    autoRenew: false,
    renewalStatus: "RENEWAL_DUE",
    paymentStatus: "PAID",
    paymentHistory: [],
    lifecycleHistory: [
      {
        id: `EVT-${Date.now().toString().slice(-6)}`,
        timestamp: nowIso,
        eventType: "TRIAL_ACTIVATED",
        actorAdminName: params.actorAdminName || "Super Admin",
        note: "Initial 14-day trial granted upon account approval/creation.",
        newExpiryDate: expiryDateStr,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Creates or activates a subscription with a specific plan duration:
 * - 14-Day Free Trial
 * - 30-Day Plan
 * - 6-Month Plan
 * - 1-Year Plan
 */
export function createSubscriptionForPlan(params: {
  accountId: string;
  accountType: AccountType;
  accountHolderName: string;
  duration: SubscriptionDuration;
  actorAdminName?: string;
  paymentMethod?: PaymentMethodType;
  transactionReference?: string;
}): SubscriptionRecord {
  const prefix = params.accountType === "DOCTOR" ? "SUB-DOC" : "SUB-HSP";
  const subId = `${prefix}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const now = new Date();
  const startDateStr = now.toISOString().split("T")[0]!;

  const expiryDate = calculateSubscriptionExpiryDate(now, params.duration);
  const expiryDateStr = expiryDate.toISOString().split("T")[0]!;
  const nowIso = now.toISOString();

  const isDoctor = params.accountType === "DOCTOR";
  const isTrial = params.duration === "14_DAYS_TRIAL";
  const planId = isDoctor ? "PLAN-DOCTOR-PRACTICE" : "PLAN-HOSPITAL-ENTERPRISE";
  const planName = isDoctor ? "Doctor Practice Standard" : "Hospital Enterprise Suite";
  const price = isDoctor ? formatAedAmount(1500) : formatAedAmount(4500);

  const initialPayments: SubscriptionPaymentRecord[] = [];
  if (!isTrial && params.transactionReference) {
    initialPayments.push({
      id: `PAY-${Date.now().toString().slice(-6)}`,
      subscriptionId: subId,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      amount: price,
      paymentDate: startDateStr,
      paymentMethod: params.paymentMethod || "MANUAL_ADMIN_OVERRIDE",
      transactionReference: params.transactionReference,
      status: "PAID",
      recordedByAdminName: params.actorAdminName || "Super Admin",
    });
  }

  return {
    id: subId,
    accountId: params.accountId,
    accountType: params.accountType,
    accountHolderName: params.accountHolderName,
    planId,
    planName,
    billingPeriod: durationToBillingPeriod(params.duration),
    status: isTrial ? "TRIAL" : "ACTIVE",
    isTrialActive: isTrial,
    trialDaysAllocated: isTrial ? 14 : 0,
    trialDaysRemaining: isTrial ? 14 : 0,
    price,
    startDate: startDateStr,
    expiryDate: expiryDateStr,
    renewalDate: expiryDateStr,
    autoRenew: !isTrial,
    renewalStatus: isTrial ? "RENEWAL_DUE" : "RENEWED",
    paymentStatus: isTrial ? "PAID" : (initialPayments.length > 0 ? "PAID" : "PENDING"),
    paymentHistory: initialPayments,
    lifecycleHistory: [
      {
        id: `EVT-${Date.now().toString().slice(-6)}`,
        timestamp: nowIso,
        eventType: isTrial ? "TRIAL_ACTIVATED" : "ACTIVATED",
        actorAdminName: params.actorAdminName || "Super Admin",
        note: isTrial
          ? "Initial 14-day trial granted upon account approval/creation."
          : `Activated ${params.duration} subscription plan.`,
        newExpiryDate: expiryDateStr,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Renews an existing subscription for a specified paid duration:
 * 30_DAYS, 6_MONTHS, or 1_YEAR.
 * Extends from current expiry date if still active, or from today if already expired.
 */
export function renewSubscription(
  existingSub: SubscriptionRecord,
  params: {
    duration: "30_DAYS" | "6_MONTHS" | "1_YEAR";
    actorAdminName: string;
    transactionReference?: string;
    paymentMethod?: PaymentMethodType;
  },
): SubscriptionRecord {
  const now = new Date();
  const isExpired = isSubscriptionExpired(existingSub, now);
  const baseDate = isExpired ? now : new Date(existingSub.expiryDate);

  const newExpiry = calculateSubscriptionExpiryDate(baseDate, params.duration);
  const newExpiryStr = newExpiry.toISOString().split("T")[0]!;
  const nowIso = now.toISOString();

  const paymentRecord: SubscriptionPaymentRecord | null = params.transactionReference
    ? {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        subscriptionId: existingSub.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        amount: existingSub.price,
        paymentDate: now.toISOString().split("T")[0]!,
        paymentMethod: params.paymentMethod || "MANUAL_ADMIN_OVERRIDE",
        transactionReference: params.transactionReference,
        status: "PAID",
        recordedByAdminName: params.actorAdminName,
      }
    : null;

  return {
    ...existingSub,
    status: "ACTIVE",
    isTrialActive: false,
    trialDaysRemaining: 0,
    billingPeriod: durationToBillingPeriod(params.duration),
    expiryDate: newExpiryStr,
    renewalDate: newExpiryStr,
    renewalStatus: "RENEWED",
    paymentStatus: paymentRecord ? "PAID" : existingSub.paymentStatus,
    paymentHistory: paymentRecord
      ? [...existingSub.paymentHistory, paymentRecord]
      : existingSub.paymentHistory,
    lifecycleHistory: [
      ...existingSub.lifecycleHistory,
      {
        id: `EVT-${Date.now().toString().slice(-6)}`,
        timestamp: nowIso,
        eventType: "RENEWED",
        actorAdminName: params.actorAdminName,
        note: `Subscription renewed for ${params.duration}.`,
        previousExpiryDate: existingSub.expiryDate,
        newExpiryDate: newExpiryStr,
      },
    ],
    updatedAt: nowIso,
  };
}
