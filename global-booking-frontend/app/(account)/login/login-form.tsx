"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  HelpCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  Stethoscope,
  Building2,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { adminLogin } from "@/lib/api/admin-client";

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
        <linearGradient id="loginPulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="45%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <filter id="loginPulseGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#loginPulseGlow)">
        <path
          d="M50 86 C25 68 12 52 12 34 C12 19 23 10 37 10 C44 10 50 14 50 14 C50 14 56 10 63 10 C77 10 88 19 88 34 C88 52 75 68 50 86 Z"
          stroke="url(#loginPulseGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(99, 102, 241, 0.14)"
        />
        <path
          d="M26 44 L38 44 L44 28 L50 58 L56 34 L62 44 L74 44"
          stroke="url(#loginPulseGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function LuxuryLoginForm() {
  const router = useRouter();

  const [portalType, setPortalType] = useState<"doctor" | "hospital">("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const rememberMeId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your registered doctor or clinical staff email address.");
      return;
    }

    if (!password) {
      setError("Please enter your secure password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminLogin({ email: trimmedEmail, password });
      if (res?.user) {
        if (
          res.user.role === "SUPER_ADMIN" ||
          res.user.role === "OPERATIONS_ADMIN" ||
          res.user.role === "BILLING_ADMIN" ||
          res.user.role === "AUDIT_VIEWER"
        ) {
          router.push("/admin/registrations");
        } else if (typeof window !== "undefined" && window.innerWidth <= 768) {
          router.push("/live-queue");
        } else {
          router.push("/dashboard");
        }
        return;
      }
      setError("Authentication failed: Invalid credentials or unverified clinical account.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError(
          "Unable to connect to the authentication server. Please check your network connection or verify backend service is running on port 3003."
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-viewport-root">
      {/* Dynamic Ambient Radiant Background Glows */}
      <div className="ambient-sphere sphere-primary" aria-hidden="true" />
      <div className="ambient-sphere sphere-accent" aria-hidden="true" />
      <div className="ambient-sphere sphere-tertiary" aria-hidden="true" />
      <div className="grid-subtle-pattern" aria-hidden="true" />

      {/* Floating Top Utility Bar */}
      <nav className="top-nav-bar" aria-label="Portal Navigation">
        <Link href="/" className="nav-return-btn">
          <ArrowLeft size={15} />
          <span>Return Home</span>
        </Link>

        <div className="system-health-pill">
          <span className="live-radar-dot" />
          <span className="health-label">Clinical Network Active</span>
        </div>
      </nav>

      {/* Main Luxury Login Card Stage */}
      <div className="login-stage-container">
        {/* Brand Header */}
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
              <div className="brand-badge-tag">HEALTHCARE PRACTICE PLATFORM</div>
            </div>
          </Link>
        </header>

        {/* Glassmorphic Portal Login Card */}
        <main className="login-glass-card">
          {/* Card Header & Portal Type Switcher */}
          <div className="card-top-section">
            <div className="portal-selector-tabs" role="tablist" aria-label="Select Account Type">
              <button
                type="button"
                role="tab"
                aria-selected={portalType === "doctor"}
                className={`tab-btn ${portalType === "doctor" ? "active" : ""}`}
                onClick={() => setPortalType("doctor")}
              >
                <Stethoscope size={15} />
                <span>Doctor & Specialist</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={portalType === "hospital"}
                className={`tab-btn ${portalType === "hospital" ? "active" : ""}`}
                onClick={() => setPortalType("hospital")}
              >
                <Building2 size={15} />
                <span>Hospital & Clinic</span>
              </button>
            </div>

            <div className="greeting-block">
              <h1 className="greeting-title">
                {portalType === "doctor" ? "Doctor Practice Sign In" : "Hospital Administration Sign In"}
              </h1>
              <p className="greeting-desc">
                {portalType === "doctor"
                  ? "Access your live OPD queue, patient appointments, and chamber schedule."
                  : "Centralize outpatient registration, multi-department intake, and OPD roster."}
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

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} noValidate className="auth-form-body">
            {/* Email Field */}
            <div className="form-field-group">
              <label htmlFor={emailId} className="field-label-text">
                {portalType === "doctor" ? "Doctor Email or Username" : "Staff or Facility Email"}
              </label>
              <div className="field-input-wrapper">
                <span className="field-leading-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={
                    portalType === "doctor"
                      ? "doctor@globalbooking.com"
                      : "reception@cityhospital.com"
                  }
                  className="card-text-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-field-group">
              <label htmlFor={passwordId} className="field-label-text">
                Password
              </label>
              <div className="field-input-wrapper">
                <span className="field-leading-icon" aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your confidential password"
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

            {/* Remember & Assistance Row */}
            <div className="remember-assistance-row">
              <label htmlFor={rememberMeId} className="checkbox-wrap-label">
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="indigo-checkbox"
                />
                <span>Keep session active</span>
              </label>

              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="forgot-pass-btn"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="login-submit-cta"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="cta-spinner" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="cta-icon" />
                  <span>
                    Sign In to {portalType === "doctor" ? "Doctor Portal" : "Hospital Portal"}
                  </span>
                  <ArrowRight size={15} className="cta-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="registration-prompt-box">
            <span>New medical practitioner or facility?</span>
            <Link href="/register" className="register-now-link">
              <span>Register Practice</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card Footer Security Trust Strip */}
          <footer className="card-security-strip">
            <div className="security-badge-row">
              <ShieldCheck size={14} className="security-shield-ic" />
              <span>HIPAA & GDPR Ready</span>
              <span className="dot-sep">•</span>
              <span>256-Bit TLS</span>
              <span className="dot-sep">•</span>
              <span>Role-Isolated Architecture</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Forgot Password / Assistance Modal */}
      {supportModalOpen && (
        <div className="modal-root-overlay" role="dialog" aria-modal="true">
          <div className="modal-glass-container">
            <div className="modal-top-bar">
              <div className="modal-icon-badge">
                <KeyRound size={20} />
              </div>
              <div className="modal-header-copy">
                <h2 className="modal-heading">Clinical Security Assistance</h2>
                <span className="modal-subheading">Healthcare Tenant Isolation Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="modal-dismiss-x"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-content-area">
              <p className="modal-intro-text">
                To guarantee zero patient record leakage and uphold strict medical confidentiality,
                password re-issuance is governed by verified administrator audit controls.
              </p>

              <div className="modal-steps-card">
                <div className="step-row">
                  <CheckCircle2 size={16} className="step-check-ic" />
                  <span>
                    Contact your clinic&apos;s <strong>Clinical Administrator</strong> or IT Security Lead to generate an authenticated reset token.
                  </span>
                </div>
                <div className="step-row">
                  <CheckCircle2 size={16} className="step-check-ic" />
                  <span>
                    Super Administrators can verify medical practitioner identity and issue temporary passcodes via the <strong>Admin Roster Portal</strong>.
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-action-row">
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="modal-acknowledge-btn"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS Stylesheet */}
      <style jsx>{`
        /* ===================================================================
           VIEWPORT CONTAINER & AMBIENT HEALTHCARE CANVAS
           =================================================================== */
        .login-viewport-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          background-color: #090d16;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 16px 36px;
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
          width: 500px;
          height: 500px;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(99, 102, 241, 0.32) 0%, rgba(67, 56, 202, 0.08) 70%, transparent 100%);
        }

        .sphere-accent {
          width: 440px;
          height: 440px;
          bottom: -100px;
          left: -80px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.04) 70%, transparent 100%);
        }

        .sphere-tertiary {
          width: 380px;
          height: 380px;
          top: 30%;
          right: -100px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, rgba(79, 70, 229, 0.05) 70%, transparent 100%);
        }

        /* Subtle Medical Tech Grid Pattern */
        .grid-subtle-pattern {
          position: fixed;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
          mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 80%);
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

        .system-health-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #94a3b8;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 14px;
          border-radius: 9999px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .live-radar-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
          animation: pulseGreen 2.2s infinite ease-in-out;
        }

        @keyframes pulseGreen {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(0.8);
          }
        }

        /* ===================================================================
           CENTERED STAGE CONTAINER & BRAND HEADER
           =================================================================== */
        .login-stage-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .brand-header-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 22px;
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
           LUXURY GLASS CARD
           =================================================================== */
        .login-glass-card {
          width: 100%;
          background: linear-gradient(
            170deg,
            rgba(18, 27, 47, 0.82) 0%,
            rgba(11, 17, 32, 0.92) 100%
          );
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(129, 140, 248, 0.22);
          border-radius: 24px;
          padding: 26px 28px 24px;
          box-shadow:
            0 24px 64px -12px rgba(0, 0, 0, 0.75),
            0 0 36px rgba(99, 102, 241, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          box-sizing: border-box;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .login-glass-card:hover {
          border-color: rgba(129, 140, 248, 0.35);
          box-shadow:
            0 28px 72px -12px rgba(0, 0, 0, 0.8),
            0 0 45px rgba(99, 102, 241, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        /* Portal Selector Tabs */
        .portal-selector-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: rgba(8, 13, 26, 0.7);
          padding: 4px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 18px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.8rem;
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
          margin-bottom: 16px;
        }

        .greeting-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.015em;
          margin: 0 0 5px 0;
        }

        .greeting-desc {
          font-size: 0.82rem;
          line-height: 1.45;
          color: #94a3b8;
          margin: 0;
        }

        /* Error Banner */
        .auth-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 0.82rem;
          line-height: 1.45;
          margin-bottom: 18px;
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

        /* Auth Form Elements */
        .auth-form-body {
          display: flex;
          flex-direction: column;
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

        .card-text-input::placeholder {
          color: #475569;
          font-size: 0.85rem;
        }

        .card-text-input:focus {
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

        /* Remember & Assistance Row */
        .remember-assistance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-top: -2px;
        }

        .checkbox-wrap-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          cursor: pointer;
          user-select: none;
        }

        .indigo-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #4f46e5;
          cursor: pointer;
        }

        .forgot-pass-btn {
          background: none;
          border: none;
          color: #818cf8;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .forgot-pass-btn:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        /* Submit Button */
        .login-submit-cta {
          width: 100%;
          height: 48px;
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

        .login-submit-cta:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #4f46e5 100%);
          box-shadow: 0 8px 28px rgba(79, 70, 229, 0.55);
        }

        .login-submit-cta:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(79, 70, 229, 0.35);
        }

        .login-submit-cta:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .cta-icon {
          color: #c7d2fe;
        }

        .cta-arrow {
          transition: transform 0.15s ease;
        }

        .login-submit-cta:hover:not(:disabled) .cta-arrow {
          transform: translateX(2px);
        }

        .cta-spinner {
          animation: spin 1s linear infinite;
        }

        /* Register Prompt Box */
        .registration-prompt-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 18px;
          font-size: 0.82rem;
          color: #94a3b8;
          flex-wrap: wrap;
          text-align: center;
        }

        .register-now-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #818cf8;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .register-now-link:hover {
          color: #c7d2fe;
          text-decoration: underline;
        }

        /* Card Security Strip */
        .card-security-strip {
          margin-top: 20px;
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
           ASSISTANCE MODAL
           =================================================================== */
        .modal-root-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 100;
        }

        .modal-glass-container {
          width: 100%;
          max-width: 450px;
          background: linear-gradient(165deg, #131c33 0%, #0d1322 100%);
          border: 1px solid rgba(129, 140, 248, 0.35);
          border-radius: 20px;
          padding: 24px;
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.9),
            0 0 35px rgba(99, 102, 241, 0.15);
          box-sizing: border-box;
          animation: modalPop 0.22s ease-out;
        }

        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-top-bar {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .modal-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(129, 140, 248, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          flex-shrink: 0;
        }

        .modal-header-copy {
          flex: 1;
        }

        .modal-heading {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 2px 0;
        }

        .modal-subheading {
          font-size: 0.72rem;
          color: #818cf8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .modal-dismiss-x {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .modal-dismiss-x:hover {
          color: #ffffff;
        }

        .modal-content-area {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }

        .modal-intro-text {
          font-size: 0.84rem;
          line-height: 1.5;
          color: #94a3b8;
          margin: 0;
        }

        .modal-steps-card {
          background-color: rgba(8, 13, 26, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .step-row {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 0.8rem;
          color: #f1f5f9;
          line-height: 1.45;
        }

        .step-check-ic {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .modal-action-row {
          display: flex;
          justify-content: flex-end;
        }

        .modal-acknowledge-btn {
          width: 100%;
          height: 44px;
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          color: #ffffff;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .modal-acknowledge-btn:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        }

        /* ===================================================================
           ANIMATIONS & MOBILE RESPONSIVE
           =================================================================== */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .login-viewport-root {
            padding: 64px 14px 28px;
          }

          .top-nav-bar {
            top: 12px;
            left: 14px;
            right: 14px;
          }

          .login-glass-card {
            padding: 22px 18px 20px;
            border-radius: 20px;
          }

          .greeting-title {
            font-size: 1.25rem;
          }

          .greeting-desc {
            font-size: 0.78rem;
          }

          .card-text-input {
            height: 46px;
            font-size: 16px; /* Prevents auto-zoom on iOS */
          }

          .login-submit-cta {
            height: 48px;
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

          .portal-selector-tabs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
