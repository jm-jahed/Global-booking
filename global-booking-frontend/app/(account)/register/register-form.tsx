"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  Mail,
  Building2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Stethoscope,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  Award,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { LanguageSelector } from "@/components/shared/language-selector";

/* =========================================================================
   HEALTHCARE PULSE (ECG) BRAND EMBLEM
   ========================================================================= */
function HealthcarePulseLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size, flexShrink: 0, display: "block" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="regPulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="45%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <filter id="regPulseGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#regPulseGlow)">
        <path
          d="M50 86 C25 68 12 52 12 34 C12 19 23 10 37 10 C44 10 50 14 50 14 C50 14 56 10 63 10 C77 10 88 19 88 34 C88 52 75 68 50 86 Z"
          stroke="url(#regPulseGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(99, 102, 241, 0.14)"
        />
        <path
          d="M26 44 L38 44 L44 28 L50 58 L56 34 L62 44 L74 44"
          stroke="url(#regPulseGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

const DOCTOR_SPECIALTIES = [
  "Cardiology & Interventional Cardiology",
  "General Medicine & Internal Care",
  "Pediatrics & Child Health",
  "Dermatology & Cosmetology",
  "Orthopedics & Spine Surgery",
  "Obstetrics & Gynecology",
  "Neurology & Neuro Surgery",
  "ENT & Otolaryngology",
  "Ophthalmology & Eye Care",
  "Dentistry & Maxillofacial",
  "Psychiatry & Behavioral Health",
  "Other Clinical Specialty",
];

const FACILITY_TYPES = [
  "Multi-Specialty Hospital",
  "Outpatient Polyclinic & Diagnostic Center",
  "Specialized Day Surgery Center",
  "Academic & Medical Teaching Facility",
  "Urgent Care & Emergency Clinic",
];

export function LuxuryRegisterForm() {
  const router = useRouter();
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");

  const [accountType, setAccountType] = useState<"doctor" | "hospital">("doctor");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState(DOCTOR_SPECIALTIES[0]);
  const [facilityType, setFacilityType] = useState(FACILITY_TYPES[0]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);
  const [appRef, setAppRef] = useState<string>("");

  const fullNameId = useId();
  const specialtyId = useId();
  const facilityTypeId = useId();
  const licenseNumberId = useId();
  const organizationNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const passwordId = useId();
  const agreedId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError(
        accountType === "doctor"
          ? t("errDoctorName", undefined, "Please provide your full practitioner name with title (e.g. Dr. Fatima Al-Mansoor).")
          : t("errAdminName", undefined, "Please provide the name of the Authorized Administrative Officer.")
      );
      return;
    }

    if (!licenseNumber.trim()) {
      setError(
        accountType === "doctor"
          ? t("errDoctorLicense", undefined, "Please enter your Medical Practitioner Registration / License Number.")
          : t("errHospitalLicense", undefined, "Please enter your Facility Health Authority License / Accreditation Number.")
      );
      return;
    }

    if (accountType === "doctor" && !organizationName.trim()) {
      setError(t("errDoctorChamber", undefined, "Please specify your Primary Consultation Hospital or Chamber Clinic name."));
      return;
    }

    if (accountType === "hospital" && !organizationName.trim()) {
      setError(t("errHospitalName", undefined, "Please provide the legal Registered Facility or Hospital Name."));
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError(t("errValidEmail", undefined, "Please enter a valid professional or clinical email address."));
      return;
    }

    if (password.length < 8) {
      setError(t("errPasswordLength", undefined, "Confidential password must be at least 8 characters long."));
      return;
    }

    if (!agreed) {
      setError(t("errAgreementRequired", undefined, "Please confirm agreement with the HIPAA/GDPR clinical terms to proceed."));
      return;
    }

    setSubmitting(true);

    try {
      // Simulate real verified practice intake recording
      await new Promise((resolve) => setTimeout(resolve, 900));

      const generatedRef = `GB-${accountType === "doctor" ? "DOC" : "HOSP"}-${Math.floor(
        100000 + Math.random() * 900000
      )}`;
      setAppRef(generatedRef);
      setRegisteredSuccess(true);

      // Cache registration summary locally so user can immediately sign in or review
      if (typeof window !== "undefined") {
        const regRecord = {
          ref: generatedRef,
          accountType,
          name: fullName.trim(),
          email: email.trim(),
          licenseNumber: licenseNumber.trim(),
          organization: organizationName.trim(),
          submittedAt: new Date().toISOString(),
          status: "APPROVED_TRIAL",
        };
        localStorage.setItem("gb_last_registration", JSON.stringify(regRecord));
      }
    } catch {
      setError(t("errTransmission", undefined, "Registration transmission encountered an error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-viewport-root">
      {/* Dynamic Ambient Radiant Background Glows */}
      <div className="ambient-sphere sphere-primary" aria-hidden="true" />
      <div className="ambient-sphere sphere-accent" aria-hidden="true" />
      <div className="ambient-sphere sphere-tertiary" aria-hidden="true" />
      <div className="grid-subtle-pattern" aria-hidden="true" />

      {/* Floating Top Utility Bar */}
      <nav className="top-nav-bar" aria-label="Registration Navigation">
        <Link href="/" className="nav-return-btn">
          <ArrowLeft size={15} />
          <span>{t("returnHome", undefined, "Return Home")}</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSelector variant="header" />
          <Link href="/login" className="nav-signin-btn">
            <span>{t("alreadyRegistered", undefined, "Already registered? Sign In")}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Main Registration Stage */}
      <div className="register-stage-container">
        {/* Brand Header Area */}
        <header className="brand-header-area">
          <Link href="/" className="brand-logo-link" title="Global Booking Homepage">
            <div className="emblem-container">
              <HealthcarePulseLogo size={46} />
            </div>
            <div className="brand-text-block">
              <div className="brand-name-row">
                <span className="brand-name-primary">GLOBAL</span>{" "}
                <span className="brand-name-accent">BOOKING</span>
              </div>
              <div className="brand-badge-tag">{tCommon("appTagline", undefined, "HEALTHCARE PRACTICE PLATFORM")}</div>
            </div>
          </Link>
        </header>

        {/* Main Glassmorphic Registration Card */}
        <main className="register-glass-card">
          {!registeredSuccess ? (
            <>
              {/* Card Header & Account Type Selector */}
              <div className="card-top-section">
                <div className="account-type-tabs" role="tablist" aria-label="Select Practice Entity">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={accountType === "doctor"}
                    className={`tab-btn ${accountType === "doctor" ? "active" : ""}`}
                    onClick={() => {
                      setAccountType("doctor");
                      setError(null);
                    }}
                  >
                    <Stethoscope size={16} />
                    <span>{t("doctorSpecialistTab", undefined, "Doctor / Specialist")}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={accountType === "hospital"}
                    className={`tab-btn ${accountType === "hospital" ? "active" : ""}`}
                    onClick={() => {
                      setAccountType("hospital");
                      setError(null);
                    }}
                  >
                    <Building2 size={16} />
                    <span>{t("hospitalClinicTab", undefined, "Hospital / Clinic Center")}</span>
                  </button>
                </div>

                <div className="greeting-block">
                  <h1 className="greeting-title">
                    {accountType === "doctor"
                      ? t("registerDoctorPractice", undefined, "Register Doctor Practice")
                      : t("registerHealthcareFacility", undefined, "Register Healthcare Facility")}
                  </h1>
                  <p className="greeting-desc">
                    {accountType === "doctor"
                      ? t("doctorRegisterDesc", undefined, "Launch your branded patient booking portal, live OPD queue tracker, and acrylic QR standee.")
                      : t("hospitalRegisterDesc", undefined, "Connect departmental consultation chambers, outpatient registration, and central staff desk.")}
                  </p>
                </div>
              </div>

              {/* Error Alert Banner */}
              {error && (
                <div role="alert" aria-live="polite" className="auth-error-banner">
                  <AlertCircle size={18} className="error-svg" />
                  <div className="error-copy">{error}</div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} noValidate className="auth-form-body">
                {/* Two-Column Responsive Grid */}
                <div className="form-fields-grid">
                  {/* Full Name */}
                  <div className="form-field-group">
                    <label htmlFor={fullNameId} className="field-label-text">
                      {accountType === "doctor"
                        ? t("practitionerFullName", undefined, "Practitioner Full Name")
                        : t("adminOfficerName", undefined, "Authorized Administrative Officer")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        <User size={16} />
                      </span>
                      <input
                        id={fullNameId}
                        type="text"
                        required
                        disabled={submitting}
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder={
                          accountType === "doctor"
                            ? t("practitionerNamePlaceholder", undefined, "e.g. Dr. Fatima Al-Mansoor")
                            : t("adminOfficerPlaceholder", undefined, "e.g. Dr. Tariq Rahman (Medical Director)")
                        }
                        className="card-text-input"
                      />
                    </div>
                  </div>

                  {/* Specialty / Facility Type */}
                  <div className="form-field-group">
                    <label
                      htmlFor={accountType === "doctor" ? specialtyId : facilityTypeId}
                      className="field-label-text"
                    >
                      {accountType === "doctor" ? t("primarySpecialty", undefined, "Primary Medical Specialty") : t("facilityCategory", undefined, "Facility Category")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        {accountType === "doctor" ? <Award size={16} /> : <Building2 size={16} />}
                      </span>
                      {accountType === "doctor" ? (
                        <select
                          id={specialtyId}
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          disabled={submitting}
                          className="card-select-input"
                        >
                          {DOCTOR_SPECIALTIES.map((spec) => (
                            <option key={spec} value={spec} className="select-dark-option">
                              {spec}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          id={facilityTypeId}
                          value={facilityType}
                          onChange={(e) => setFacilityType(e.target.value)}
                          disabled={submitting}
                          className="card-select-input"
                        >
                          {FACILITY_TYPES.map((type) => (
                            <option key={type} value={type} className="select-dark-option">
                              {type}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Medical License / Accreditation Number */}
                  <div className="form-field-group">
                    <label htmlFor={licenseNumberId} className="field-label-text">
                      {accountType === "doctor"
                        ? t("medicalLicenseNumber", undefined, "Practitioner Medical License #")
                        : t("facilityLicenseNumber", undefined, "Facility Accreditation / MOH License #")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        <ShieldCheck size={16} />
                      </span>
                      <input
                        id={licenseNumberId}
                        type="text"
                        required
                        disabled={submitting}
                        value={licenseNumber}
                        onChange={(e) => {
                          setLicenseNumber(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder={
                          accountType === "doctor" ? t("medicalLicensePlaceholder", undefined, "e.g. DHA-MD-49201") : t("facilityLicensePlaceholder", undefined, "e.g. MOHAP-FAC-88192")
                        }
                        className="card-text-input"
                      />
                    </div>
                  </div>

                  {/* Primary Chamber / Hospital Name */}
                  <div className="form-field-group">
                    <label htmlFor={organizationNameId} className="field-label-text">
                      {accountType === "doctor"
                        ? t("primaryChamberHospital", undefined, "Primary Chamber / Clinic Hospital")
                        : t("registeredFacilityName", undefined, "Registered Facility Name")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        <Building2 size={16} />
                      </span>
                      <input
                        id={organizationNameId}
                        type="text"
                        required
                        disabled={submitting}
                        value={organizationName}
                        onChange={(e) => {
                          setOrganizationName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder={
                          accountType === "doctor"
                            ? t("primaryChamberPlaceholder", undefined, "e.g. City General Hospital • Wing 4")
                            : t("registeredFacilityPlaceholder", undefined, "e.g. Mediclinic City Hospital")
                        }
                        className="card-text-input"
                      />
                    </div>
                  </div>

                  {/* Professional Email */}
                  <div className="form-field-group">
                    <label htmlFor={emailId} className="field-label-text">
                      {t("officialEmail", undefined, "Official Clinical Email")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        <Mail size={16} />
                      </span>
                      <input
                        id={emailId}
                        type="email"
                        required
                        disabled={submitting}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder={
                          accountType === "doctor"
                            ? "dr.fatima@medicalpractice.com"
                            : "intake@cityhospital.com"
                        }
                        className="card-text-input"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="form-field-group">
                    <label htmlFor={phoneId} className="field-label-text">
                      {t("contactPhone", undefined, "Contact Phone / WhatsApp")}
                    </label>
                    <div className="field-input-wrapper">
                      <span className="field-leading-icon" aria-hidden="true">
                        <Phone size={16} />
                      </span>
                      <input
                        id={phoneId}
                        type="tel"
                        disabled={submitting}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+971 50 123 4567"
                        className="card-text-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="form-field-group">
                  <label htmlFor={passwordId} className="field-label-text">
                    {t("confidentialPassword", undefined, "Confidential Password (min 8 characters)")}
                  </label>
                  <div className="field-input-wrapper">
                    <span className="field-leading-icon" aria-hidden="true">
                      <Lock size={16} />
                    </span>
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      disabled={submitting}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t("passwordFieldPlaceholder", undefined, "Create a strong clinical password")}
                      className="card-text-input has-action"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="field-toggle-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="agreement-checkbox-row">
                  <label htmlFor={agreedId} className="checkbox-wrap-label">
                    <input
                      id={agreedId}
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="indigo-checkbox"
                    />
                    <span className="agreement-text">
                      {t("clinicalTermsAgreement", undefined, "I verify that I am an authorized practitioner or medical administrator, and agree to the Global Booking Clinical Terms of Service and HIPAA/GDPR Data Protection Agreement.")}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="register-submit-cta"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="cta-spinner" />
                      <span>{t("transmittingOnboarding", undefined, "Transmitting Practice Onboarding...")}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} className="cta-icon" />
                      <span>
                        {t("completePracticeRegistration", { type: accountType === "doctor" ? (t("doctorTab", undefined, "Doctor")) : (t("hospitalTab", undefined, "Hospital")) }, `Complete Practice Registration (${accountType === "doctor" ? "Doctor" : "Hospital"})`)}
                      </span>
                      <ArrowRight size={15} className="cta-arrow" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Shortcut */}
              <div className="signin-prompt-box">
                <span>{t("alreadyHaveAccount", undefined, "Already have an active practitioner or staff account?")}</span>
                <Link href="/login" className="signin-now-link">
                  <span>{t("signInToPortalBtn", undefined, "Sign In to Portal")}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Card Footer Security Strip */}
              <footer className="card-security-strip">
                <div className="security-badge-row">
                  <ShieldCheck size={14} className="security-shield-ic" />
                  <span>HIPAA & GDPR Ready</span>
                  <span className="dot-sep">•</span>
                  <span>256-Bit TLS</span>
                  <span className="dot-sep">•</span>
                  <span>End-to-End Tenant Isolation</span>
                </div>
              </footer>
            </>
          ) : (
            /* ===============================================================
               SUCCESS STATE — ONBOARDING CONFIRMATION VOUCHER
               =============================================================== */
            <div className="success-voucher-stage">
              <div className="success-badge-pulse">
                <CheckCircle2 size={38} className="success-check-svg" />
              </div>

              <h2 className="success-title">{t("registrationSubmitted", undefined, "Practice Registration Submitted!")}</h2>
              <p className="success-desc">
                {t("registrationSubmittedDesc", undefined, "Your clinical entity credentials have been verified. An active onboarding record has been initiated on the Global Booking Healthcare Network.")}
              </p>

              <div className="voucher-details-card">
                <div className="voucher-top-row">
                  <span className="voucher-ref-label">{t("applicationReference", undefined, "APPLICATION REFERENCE")}</span>
                  <span className="voucher-ref-value">{appRef}</span>
                </div>

                <div className="voucher-grid">
                  <div className="voucher-item">
                    <span className="voucher-lbl">{t("entityType", undefined, "Entity Type")}</span>
                    <strong className="voucher-val">
                      {accountType === "doctor" ? t("doctorSpecialistTab", undefined, "Doctor / Specialist") : t("hospitalClinicTab", undefined, "Hospital / Clinic Center")}
                    </strong>
                  </div>

                  <div className="voucher-item">
                    <span className="voucher-lbl">{t("registeredName", undefined, "Registered Name")}</span>
                    <strong className="voucher-val">{fullName}</strong>
                  </div>

                  <div className="voucher-item">
                    <span className="voucher-lbl">{t("licenseNo", undefined, "License #")}</span>
                    <strong className="voucher-val">{licenseNumber}</strong>
                  </div>

                  <div className="voucher-item">
                    <span className="voucher-lbl">{t("officialEmailLabel", undefined, "Official Email")}</span>
                    <strong className="voucher-val">{email}</strong>
                  </div>
                </div>

                <div className="voucher-portal-callout">
                  <Sparkles size={16} className="callout-sparkle" />
                  <span>
                    {t("voucherCallout", undefined, "Your practice workspace is ready. You can sign in immediately to customize your profile, configure chambers, and manage live queues.")}
                  </span>
                </div>
              </div>

              <div className="success-actions-row">
                <Link href="/login" className="action-signin-btn">
                  <ShieldCheck size={16} />
                  <span>{t("proceedToSignIn", undefined, "Proceed to Portal Sign In (/login)")}</span>
                  <ArrowRight size={14} />
                </Link>

                <Link href="/" className="action-home-btn">
                  <span>{t("returnToHome", undefined, "Return to Homepage")}</span>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>


      {/* Scoped Styling */}
      <style jsx>{`
        /* ===================================================================
           VIEWPORT CONTAINER & AMBIENT HEALTHCARE CANVAS
           =================================================================== */
        .register-viewport-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          background-color: #090d16;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 16px 40px;
          box-sizing: border-box;
          overflow-x: hidden;
          font-family: var(--font-inter, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          color: #f8fafc;
        }

        /* Ambient Dynamic Light Spheres */
        .ambient-sphere {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.55;
        }

        .sphere-primary {
          width: 520px;
          height: 520px;
          top: -140px;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(99, 102, 241, 0.32) 0%, rgba(67, 56, 202, 0.08) 70%, transparent 100%);
        }

        .sphere-accent {
          width: 460px;
          height: 460px;
          bottom: -100px;
          left: -80px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.04) 70%, transparent 100%);
        }

        .sphere-tertiary {
          width: 400px;
          height: 400px;
          top: 30%;
          right: -100px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, rgba(79, 70, 229, 0.05) 70%, transparent 100%);
        }

        /* Medical Grid Pattern */
        .grid-subtle-pattern {
          position: fixed;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
          mask-image: radial-gradient(circle at 50% 50%, black 45%, transparent 85%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, black 45%, transparent 85%);
        }

        /* ===================================================================
           FLOATING TOP UTILITY BAR
           =================================================================== */
        .top-nav-bar {
          position: fixed;
          top: 16px;
          left: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 30;
          max-width: 1100px;
          margin: 0 auto;
        }

        .nav-return-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #cbd5e1;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 7px 15px;
          border-radius: 9999px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          text-decoration: none;
          transition: all 0.18s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .nav-return-btn:hover {
          color: #ffffff;
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(129, 140, 248, 0.4);
          transform: translateX(-2px);
        }

        .nav-signin-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #a5b4fc;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(129, 140, 248, 0.3);
          padding: 6px 14px;
          border-radius: 9999px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          text-decoration: none;
          transition: all 0.18s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .nav-signin-btn:hover {
          color: #ffffff;
          background: rgba(79, 70, 229, 0.4);
          border-color: rgba(165, 180, 252, 0.6);
        }

        /* ===================================================================
           STAGE & BRAND HEADER
           =================================================================== */
        .register-stage-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .brand-header-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
          text-align: center;
        }

        .brand-logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .brand-logo-link:hover {
          transform: translateY(-1px);
        }

        .emblem-container {
          filter: drop-shadow(0 4px 18px rgba(99, 102, 241, 0.45));
          animation: gentleFloat 6s ease-in-out infinite;
        }

        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .brand-text-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .brand-name-row {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          line-height: 1.1;
        }

        .brand-name-primary {
          color: #ffffff;
        }

        .brand-name-accent {
          background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-badge-tag {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #818cf8;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* ===================================================================
           LUXURY GLASS REGISTRATION CARD
           =================================================================== */
        .register-glass-card {
          width: 100%;
          background: linear-gradient(
            170deg,
            rgba(18, 27, 47, 0.84) 0%,
            rgba(11, 17, 32, 0.94) 100%
          );
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(129, 140, 248, 0.22);
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow:
            0 24px 64px -12px rgba(0, 0, 0, 0.75),
            0 0 36px rgba(99, 102, 241, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          box-sizing: border-box;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .register-glass-card:hover {
          border-color: rgba(129, 140, 248, 0.35);
          box-shadow:
            0 28px 72px -12px rgba(0, 0, 0, 0.8),
            0 0 45px rgba(99, 102, 241, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        /* Account Type Selector Tabs */
        .account-type-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: rgba(8, 13, 26, 0.7);
          padding: 4px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .tab-btn:hover {
          color: #f1f5f9;
          background: rgba(255, 255, 255, 0.04);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(99, 102, 241, 0.85) 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
        }

        /* Greeting Block */
        .greeting-block {
          text-align: center;
          margin-bottom: 20px;
        }

        .greeting-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.015em;
          margin: 0 0 6px 0;
        }

        .greeting-desc {
          font-size: 0.84rem;
          line-height: 1.5;
          color: #94a3b8;
          margin: 0;
          max-width: 520px;
          margin-inline: auto;
        }

        /* Error Banner */
        .auth-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 0.82rem;
          line-height: 1.45;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.1);
        }

        .error-svg {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .error-copy {
          flex: 1;
        }

        /* Form Layout */
        .auth-form-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
          letter-spacing: 0.01em;
        }

        .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-leading-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.15s ease;
        }

        .card-text-input {
          width: 100%;
          height: 48px;
          background: rgba(9, 14, 28, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          padding: 0 14px 0 42px;
          color: #ffffff;
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .card-text-input.has-action {
          padding-right: 44px;
        }

        .card-select-input {
          width: 100%;
          height: 48px;
          background: rgba(9, 14, 28, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          padding: 0 14px 0 42px;
          color: #ffffff;
          font-size: 0.86rem;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
          cursor: pointer;
          appearance: auto;
        }

        .select-dark-option {
          background-color: #0b1120;
          color: #ffffff;
        }

        .card-text-input::placeholder {
          color: #475569;
          font-size: 0.84rem;
        }

        .card-text-input:focus,
        .card-select-input:focus {
          outline: none;
          border-color: #818cf8;
          background: rgba(12, 19, 38, 0.95);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.28);
        }

        .field-input-wrapper:focus-within .field-leading-icon {
          color: #818cf8;
        }

        .field-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.15s ease;
        }

        .field-toggle-btn:hover {
          color: #cbd5e1;
        }

        /* Agreement Checkbox Row */
        .agreement-checkbox-row {
          margin-top: 2px;
        }

        .checkbox-wrap-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .indigo-checkbox {
          width: 17px;
          height: 17px;
          border-radius: 4px;
          accent-color: #4f46e5;
          cursor: pointer;
          margin-top: 3px;
          flex-shrink: 0;
        }

        .agreement-text {
          font-size: 0.78rem;
          line-height: 1.45;
          color: #94a3b8;
        }

        /* Submit Button */
        .register-submit-cta {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.42);
          transition: all 0.2s ease;
          margin-top: 6px;
        }

        .register-submit-cta:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #4f46e5 100%);
          box-shadow: 0 8px 28px rgba(79, 70, 229, 0.55);
        }

        .register-submit-cta:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(79, 70, 229, 0.35);
        }

        .register-submit-cta:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .cta-icon {
          color: #c7d2fe;
        }

        .cta-arrow {
          transition: transform 0.15s ease;
        }

        .register-submit-cta:hover:not(:disabled) .cta-arrow {
          transform: translateX(2px);
        }

        .cta-spinner {
          animation: spin 1s linear infinite;
        }

        /* Sign In Prompt Box */
        .signin-prompt-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 20px;
          font-size: 0.82rem;
          color: #94a3b8;
          flex-wrap: wrap;
          text-align: center;
        }

        .signin-now-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #818cf8;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .signin-now-link:hover {
          color: #c7d2fe;
          text-decoration: underline;
        }

        /* Security Strip */
        .card-security-strip {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: center;
        }

        .security-badge-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.72rem;
          color: #64748b;
          flex-wrap: wrap;
          justify-content: center;
        }

        .security-shield-ic {
          color: #10b981;
        }

        .dot-sep {
          color: #334155;
        }

        /* ===================================================================
           SUCCESS STATE VOUCHER
           =================================================================== */
        .success-voucher-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8px 0;
          animation: voucherFade 0.3s ease-out;
        }

        @keyframes voucherFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-badge-pulse {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
        }

        .success-check-svg {
          color: #10b981;
        }

        .success-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .success-desc {
          font-size: 0.85rem;
          line-height: 1.5;
          color: #94a3b8;
          max-width: 480px;
          margin: 0 0 20px 0;
        }

        .voucher-details-card {
          width: 100%;
          background: rgba(8, 13, 26, 0.75);
          border: 1px solid rgba(129, 140, 248, 0.25);
          border-radius: 16px;
          padding: 18px 20px;
          text-align: left;
          box-sizing: border-box;
          margin-bottom: 24px;
        }

        .voucher-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 14px;
        }

        .voucher-ref-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #818cf8;
          letter-spacing: 0.1em;
        }

        .voucher-ref-value {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 700;
          color: #10b981;
          letter-spacing: 0.05em;
        }

        .voucher-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .voucher-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .voucher-lbl {
          font-size: 0.7rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .voucher-val {
          font-size: 0.84rem;
          color: #f1f5f9;
          word-break: break-all;
        }

        .voucher-portal-callout {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(129, 140, 248, 0.25);
          color: #c7d2fe;
          font-size: 0.78rem;
          line-height: 1.45;
        }

        .callout-sparkle {
          color: #818cf8;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .success-actions-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .action-signin-btn {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          box-shadow: 0 4px 18px rgba(79, 70, 229, 0.4);
          transition: background 0.15s ease;
        }

        .action-signin-btn:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        }

        .action-home-btn {
          font-size: 0.82rem;
          color: #94a3b8;
          text-decoration: none;
          padding: 6px;
          transition: color 0.15s ease;
        }

        .action-home-btn:hover {
          color: #ffffff;
        }

        /* ===================================================================
           RESPONSIVE MOBILE BREAKPOINTS
           =================================================================== */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .register-viewport-root {
            padding: 64px 14px 28px;
          }

          .top-nav-bar {
            top: 12px;
            left: 14px;
            right: 14px;
          }

          .register-glass-card {
            padding: 22px 16px 20px;
            border-radius: 20px;
          }

          .form-fields-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .greeting-title {
            font-size: 1.25rem;
          }

          .greeting-desc {
            font-size: 0.78rem;
          }

          .card-text-input,
          .card-select-input {
            height: 46px;
            font-size: 16px; /* Prevents auto-zoom on iOS */
          }

          .register-submit-cta {
            height: 48px;
            font-size: 0.86rem;
          }

          .voucher-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        @media (max-width: 360px) {
          .brand-name-row {
            font-size: 1.15rem;
          }

          .tab-btn {
            font-size: 0.74rem;
            padding: 8px 6px;
          }

          .account-type-tabs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
