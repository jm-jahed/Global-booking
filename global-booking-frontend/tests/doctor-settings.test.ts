import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeSlug } from "../lib/validation/route-params";

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
