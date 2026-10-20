"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Lock,
    User,
    Mail,
    Building2,
    Briefcase,
    ShieldCheck,
    AlertCircle,
    Loader2,
    ArrowLeft,
    CheckCircle2,
} from "lucide-react";

const INDUSTRIES = [
    { value: "doctors", label: "Doctors / Specialists" },
    { value: "hospitals", label: "Hospitals / Clinics" },
];

export function LuxuryRegisterForm() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [industry, setIndustry] = useState("medical");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fullNameId = useId();
    const businessNameId = useId();
    const industryId = useId();
    const emailId = useId();
    const passwordId = useId();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim()) {
            setError("Please provide your full legal or executive name.");
            return;
        }
        if (!businessName.trim()) {
            setError("Please provide your enterprise or business name.");
            return;
        }
        if (!email.trim() || !email.includes("@")) {
            setError("Please enter a valid executive email address.");
            return;
        }
        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }
        if (!agreed) {
            setError("Please accept the enterprise service terms to continue.");
            return;
        }

        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            router.push("/dashboard");
        }, 1100);
    };

    return (
        <div className="luxury-register-root">
            {/* Top Bar Floating Utilities */}
            <div className="top-utility-bar">
                <Link href="/" className="utility-nav-link">
                    <ArrowLeft size={14} />
                    <span>Return Home</span>
                </Link>
                <Link href="/login" className="utility-login-link">
                    <span>Already have an account? Sign In</span>
                </Link>
            </div>

            <div className="luxury-backdrop-overlay" />

            <div className="luxury-register-stage">
                <header className="brand-header-group">
                    <div className="brand-title-row">
                        <span className="brand-title-global">GLOBAL</span>{" "}
                        <span className="brand-title-booking">BOOKING</span>
                    </div>
                    <div className="brand-subtitle">
                        ENTERPRISE ACCOUNT ONBOARDING
                    </div>
                </header>

                <main className="luxury-card">
                    <div className="card-header">
                        <h1 className="welcome-title">Create Executive Account</h1>
                        <p className="welcome-subtitle">
                            Start managing enterprise appointment journeys across your industry
                        </p>
                    </div>

                    {error && (
                        <div role="alert" className="error-alert-banner">
                            <AlertCircle size={17} className="error-icon" />
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="register-form">
                        <div className="two-col-grid">
                            <div className="field-group">
                                <label htmlFor={fullNameId} className="field-label">
                                    Executive Name
                                </label>
                                <div className="input-box">
                                    <User size={16} className="input-leading-icon" />
                                    <input
                                        id={fullNameId}
                                        type="text"
                                        required
                                        disabled={submitting}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="e.g. Dr. Alexander Vance"
                                        className="luxury-input"
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label htmlFor={businessNameId} className="field-label">
                                    Organization / Business
                                </label>
                                <div className="input-box">
                                    <Building2 size={16} className="input-leading-icon" />
                                    <input
                                        id={businessNameId}
                                        type="text"
                                        required
                                        disabled={submitting}
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="e.g. Barakah Health Center"
                                        className="luxury-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="field-group">
                            <label htmlFor={industryId} className="field-label">
                                Primary Industry Category
                            </label>
                            <div className="input-box">
                                <Briefcase size={16} className="input-leading-icon" />
                                <select
                                    id={industryId}
                                    disabled={submitting}
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    className="luxury-select"
                                >
                                    {INDUSTRIES.map((ind) => (
                                        <option key={ind.value} value={ind.value} style={{ background: "#0c1c16", color: "#fff" }}>
                                            {ind.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="field-group">
                            <label htmlFor={emailId} className="field-label">
                                Official Business Email
                            </label>
                            <div className="input-box">
                                <Mail size={16} className="input-leading-icon" />
                                <input
                                    id={emailId}
                                    type="email"
                                    required
                                    disabled={submitting}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@organization.com"
                                    className="luxury-input"
                                />
                            </div>
                        </div>

                        <div className="field-group">
                            <label htmlFor={passwordId} className="field-label">
                                Create Strong Password (min. 8 characters)
                            </label>
                            <div className="input-box">
                                <Lock size={16} className="input-leading-icon" />
                                <input
                                    id={passwordId}
                                    type="password"
                                    required
                                    disabled={submitting}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="luxury-input"
                                />
                            </div>
                        </div>

                        <label className="terms-checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="luxury-checkbox"
                            />
                            <span>
                                I agree to the enterprise service terms, data privacy standards, and tenant security isolation policy.
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-gold-submit"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={19} className="btn-spinner" />
                                    <span>Configuring Workspace...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={19} />
                                    <span>Create Executive Workspace</span>
                                </>
                            )}
                        </button>
                    </form>

                    <footer className="card-footer-protected">
                        <div className="footer-compliance-row">
                            <CheckCircle2 size={13} color="#10b981" />
                            <span>Multi-Tenant Isolation Guaranteed</span>
                            <span className="pipe-sep">|</span>
                            <span>256-bit AES Encryption</span>
                        </div>
                    </footer>
                </main>
            </div>

            <style jsx>{`
        .luxury-register-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          background-color: #050e0a;
          background-image: url("/images/luxury-login-bg.jpg");
          background-position: center center;
          background-repeat: no-repeat;
          background-size: cover;
          background-attachment: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 16px;
          box-sizing: border-box;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .luxury-backdrop-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(3, 10, 7, 0.4) 0%, rgba(2, 6, 4, 0.9) 100%);
          pointer-events: none;
          z-index: 1;
        }

        .top-utility-bar {
          position: absolute;
          top: 18px;
          left: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 20;
        }

        .utility-nav-link,
        .utility-login-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: #e2e8f0;
          background: rgba(12, 28, 22, 0.7);
          border: 1px solid rgba(212, 175, 55, 0.3);
          padding: 6px 14px;
          border-radius: 999px;
          backdrop-filter: blur(12px);
          transition: all 0.2s ease;
        }

        .utility-nav-link:hover,
        .utility-login-link:hover {
          border-color: #e6c97a;
          color: #fff;
          transform: translateY(-1px);
        }

        .luxury-register-stage {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 24px;
        }

        .brand-header-group {
          text-align: center;
          margin-bottom: 16px;
        }

        .brand-title-row {
          font-family: "Cinzel", "Playfair Display", Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.18em;
          margin-bottom: 3px;
        }

        .brand-title-global {
          color: #f8fafc;
        }

        .brand-title-booking {
          background: linear-gradient(180deg, #fff2b2 0%, #e6c25e 50%, #c9a24b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.25em;
          color: #d4af37;
        }

        .luxury-card {
          width: 100%;
          background: linear-gradient(160deg, rgba(12, 28, 22, 0.8) 0%, rgba(7, 18, 14, 0.9) 100%);
          backdrop-filter: blur(28px) saturate(150%);
          border: 1px solid rgba(212, 175, 55, 0.42);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
          box-sizing: border-box;
        }

        .card-header {
          text-align: center;
          margin-bottom: 18px;
        }

        .welcome-title {
          font-family: "Playfair Display", "Cinzel", Georgia, serif;
          font-size: 23px;
          font-weight: 600;
          color: #f8fafc;
          margin: 0 0 5px 0;
        }

        .welcome-subtitle {
          font-size: 12.5px;
          color: #94a3b8;
          margin: 0;
        }

        .error-alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          background: rgba(220, 38, 38, 0.16);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 12.5px;
          margin-bottom: 16px;
        }

        .error-icon {
          color: #ef4444;
          flex-shrink: 0;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .input-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-leading-icon {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          pointer-events: none;
        }

        .luxury-input,
        .luxury-select {
          width: 100%;
          height: 42px;
          background: rgba(4, 14, 10, 0.72);
          border: 1px solid rgba(212, 175, 55, 0.32);
          border-radius: 9px;
          padding: 0 12px 0 38px;
          color: #f8fafc;
          font-size: 13px;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .luxury-input:focus,
        .luxury-select:focus {
          outline: none;
          border-color: #e6c97a;
          box-shadow: 0 0 0 3px rgba(230, 201, 122, 0.2);
        }

        .terms-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.4;
          cursor: pointer;
          margin: 4px 0;
        }

        .luxury-checkbox {
          accent-color: #c9a24b;
          margin-top: 2px;
        }

        .btn-gold-submit {
          width: 100%;
          height: 46px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(180deg, #f5d77f 0%, #c9a24b 55%, #a88126 100%);
          color: #0b1410;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(201, 162, 75, 0.45);
          transition: all 0.2s ease;
          margin-top: 4px;
        }

        .btn-gold-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 9px 26px rgba(201, 162, 75, 0.6);
        }

        .btn-spinner {
          animation: spin 1s linear infinite;
        }

        .card-footer-protected {
          margin-top: 18px;
          text-align: center;
        }

        .footer-compliance-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 10.5px;
          color: #7e8da6;
        }

        .pipe-sep {
          color: #3b4d66;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 520px) {
          .two-col-grid {
            grid-template-columns: 1fr;
          }
          .luxury-card {
            padding: 22px 18px;
          }
        }
      `}</style>
        </div>
    );
}
