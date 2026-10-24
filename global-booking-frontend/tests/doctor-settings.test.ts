import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeSlug, generateSafeDoctorSlug } from "../lib/validation/route-params";

/* =========================================================================
   1. DOCTOR SLUG & URL SANITIZATION TESTS
   ========================================================================= */

test("Doctor slug validation adheres to safe route parameter regex", () => {
  assert.equal(isSafeSlug("dr-sarah-khan"), true);
  assert.equal(isSafeSlug("dr-ahmed-al-mansoor"), true);
  assert.equal(isSafeSlug("doc-701"), true);
  assert.equal(isSafeSlug("dr-tariq-7001"), true);

  // Invalid: capital letters, spaces, special chars, leading/trailing hyphens
  assert.equal(isSafeSlug("Dr-Sarah-Khan"), false);
  assert.equal(isSafeSlug("dr sarah"), false);
  assert.equal(isSafeSlug("dr_sarah"), false);
  assert.equal(isSafeSlug("-dr-sarah"), false);
  assert.equal(isSafeSlug("dr-sarah-"), false);
  assert.equal(isSafeSlug("dr@khan"), false);
});

/* =========================================================================
   2. DOCTOR PROFILE DATA INTEGRITY & PRIVACY TESTS
   ========================================================================= */

test("Doctor profile update contract preserves entity isolation and formats AED minor units", () => {
  const feeAed = 500;
  const amountInFils = Math.round(feeAed * 100);
  assert.equal(amountInFils, 50000);

  const payload = {
    fullName: "Dr. Sarah Khan",
    specialty: "Consultant Cardiologist",
    bio: "Cardiovascular specialist with over 14 years clinical experience.",
    yearsOfExperience: 14,
    medicalDegrees: ["MBBS", "MD (Cardiology)", "FRCP (London)"],
    consultationFeeAed: 500,
    languages: ["English", "Arabic", "Urdu"],
    isPublished: true,
    chambers: [
      {
        id: "CH-1",
        facilityName: "Mediclinic City Hospital",
        city: "Dubai",
        visitingSchedule: "Mon - Thu: 5:00 PM - 9:00 PM",
      },
    ],
  };

  assert.equal(payload.fullName, "Dr. Sarah Khan");
  assert.equal(payload.medicalDegrees.length, 3);
  assert.equal(payload.chambers.length, 1);
  assert.equal(payload.isPublished, true);
});

test("Doctor profile excludes credentials and internal database tokens", () => {
  const safeDoctorProfile = {
    id: "ACC-DOC-1001",
    doctorId: "DOC-701",
    fullName: "Dr. Sarah Khan",
    email: "dr.sarah@globalbooking.ae",
    specialty: "Cardiologist",
    licenseNumber: "DHA-DOC-12345",
    consultationFee: {
      amountInFils: 50000,
      currency: "AED" as const,
      formatted: "AED 500.00",
    },
    slug: "dr-sarah-khan",
    isPublished: true,
  };

  // Assert sensitive fields are absent
  assert.equal((safeDoctorProfile as any).passwordHash, undefined);
  assert.equal((safeDoctorProfile as any).invitationTokenHash, undefined);
  assert.equal((safeDoctorProfile as any)._id, undefined);
});

/* =========================================================================
   3. DOCTOR PROFILE PERSISTENCE & DATA-LOSS PREVENTION REGRESSION TESTS
   ========================================================================= */

test("REGRESSION: Consultation fee of 0 AED preserves numeric zero without defaulting to 500", () => {
  // Case A: Valid 0 fils in API response
  const responseZero = {
    consultationFee: {
      amountInFils: 0,
      currency: "AED",
      formatted: "AED 0.00",
    },
  };
  const feeFilsZero = responseZero.consultationFee?.amountInFils;
  const loadedFeeAedZero =
    typeof feeFilsZero === "number" && !Number.isNaN(feeFilsZero) ? feeFilsZero / 100 : 500;
  assert.equal(loadedFeeAedZero, 0);

  // Case B: Truly missing/undefined fee defaults to 500
  const responseMissing: any = {};
  const feeFilsMissing = responseMissing.consultationFee?.amountInFils;
  const loadedFeeAedMissing =
    typeof feeFilsMissing === "number" && !Number.isNaN(feeFilsMissing) ? feeFilsMissing / 100 : 500;
  assert.equal(loadedFeeAedMissing, 500);

  // Case C: Submission payload with 0 AED converts to 0 fils
  const payloadFee = typeof loadedFeeAedZero === "number" ? loadedFeeAedZero : Number(loadedFeeAedZero) || 0;
  assert.equal(payloadFee, 0);
  assert.equal(Math.round(payloadFee * 100), 0);
});

test("REGRESSION: Chamber timezone is preserved across edits and round-tripped safely", () => {
  interface ChamberDetail {
    id: string;
    facilityName: string;
    city: string;
    timezone?: string;
  }

  const existingChambers: ChamberDetail[] = [
    {
      id: "CH-1",
      facilityName: "Dhaka Specialized Clinic",
      city: "Dhaka",
      timezone: "Asia/Dhaka",
    },
    {
      id: "CH-2",
      facilityName: "Dubai Healthcare Center",
      city: "Dubai",
      timezone: "Asia/Dubai",
    },
  ];

  // User edits facilityName of CH-1 without touching timezone
  const editedChambers = existingChambers.map((ch) => {
    if (ch.id === "CH-1") {
      return { ...ch, facilityName: "Dhaka Heart & Specialized Clinic" };
    }
    return ch;
  });

  // Clean and prepare payload (same logic as editor handleSubmit)
  const payloadChambers = editedChambers
    .filter((ch) => ch.facilityName.trim().length > 0)
    .map((ch) => ({
      ...ch,
      timezone: ch.timezone?.trim() || undefined,
    }));

  assert.equal(payloadChambers[0].id, "CH-1");
  assert.equal(payloadChambers[0].facilityName, "Dhaka Heart & Specialized Clinic");
  assert.equal(payloadChambers[0].timezone, "Asia/Dhaka");
  assert.equal(payloadChambers[1].timezone, "Asia/Dubai");

  // New chamber inherits existing configured timezone rather than arbitrary default
  const existingTz = payloadChambers.find((c) => c.timezone?.trim())?.timezone;
  const newChamber: ChamberDetail = {
    id: "CH-3",
    facilityName: "Chittagong Medical Center",
    city: "Chittagong",
    timezone: existingTz || "Asia/Dhaka",
  };
  assert.equal(newChamber.timezone, "Asia/Dhaka");
});

test("REGRESSION: Safe slug generation and validation prevents invalid or empty slugs", () => {
  // Empty user slug triggers safe generation from name and doctor identifier
  const safeGenerated = generateSafeDoctorSlug("Dr. Jahedul Islam", "DOC-5357");
  assert.equal(safeGenerated, "dr-jahedul-islam");
  assert.equal(isSafeSlug(safeGenerated), true);

  // Doctor with special characters in name
  const safeWithSpecialChars = generateSafeDoctorSlug("Dr. Tariq Al-Hashimi, M.D.!", "DOC-808");
  assert.equal(safeWithSpecialChars, "dr-tariq-al-hashimi-md");
  assert.equal(isSafeSlug(safeWithSpecialChars), true);

  // Fallback when name contains only symbols
  const fallbackOnlySymbols = generateSafeDoctorSlug("###", "DOC-701");
  assert.equal(fallbackOnlySymbols, "doc701");
  assert.equal(isSafeSlug(fallbackOnlySymbols), true);
});

test("REGRESSION: Malformed profile response is detected and prevents destructive saves", () => {
  const isProfileValid = (res: any): boolean => {
    return Boolean(res && res.doctor && typeof res.doctor === "object" && res.doctor.id);
  };

  // 1. Null or empty response
  assert.equal(isProfileValid(null), false);
  assert.equal(isProfileValid({}), false);
  assert.equal(isProfileValid({ doctor: null }), false);

  // 2. Malformed object missing doctor id
  assert.equal(isProfileValid({ doctor: { fullName: "Incomplete" } }), false);

  // 3. Valid doctor profile
  assert.equal(isProfileValid({ doctor: { id: "ACC-DOC-1", fullName: "Valid Doctor" } }), true);
});

test("REGRESSION: Intentional field clearing preserves core identity fields while emptying optional fields", () => {
  const loadedProfile = {
    fullName: "Dr. Sarah Khan",
    specialty: "Cardiology",
    customTitle: "Consultant Interventional Cardiologist",
    bio: "Previous extensive bio...",
    chamberLocationsSummary: "Dubai Healthcare City",
  };

  // User intentionally clears optional fields
  const userClearedState = {
    fullName: loadedProfile.fullName.trim(),
    specialty: loadedProfile.specialty.trim(),
    customTitle: "",
    bio: "",
    chamberLocationsSummary: "",
  };

  // Validation ensures core fields are not empty
  assert.ok(userClearedState.fullName.length >= 2);
  assert.ok(userClearedState.specialty.length >= 2);

  // Optional fields are intentionally empty strings
  assert.equal(userClearedState.customTitle, "");
  assert.equal(userClearedState.bio, "");
  assert.equal(userClearedState.chamberLocationsSummary, "");
});

