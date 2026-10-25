"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Shield,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Lock,
  Globe,
  Clock,
  UserCheck,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/lib/api/admin-client";

export function AdminSettingsManager() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationAutoReview, setRegistrationAutoReview] = useState(false);

  // Security Policies State
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(15);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(24);
  const [requireStrongPassword, setRequireStrongPassword] = useState(true);

  // Provider Onboarding Policies State
  const [requireLicenseVerification, setRequireLicenseVerification] = useState(true);
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [allowInstantDoctorAccess, setAllowInstantDoctorAccess] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPlatformSettings();
      const s = res.settings;
      setSettings(s);
      setPlatformName(s.platformName || "Global Booking Healthcare Platform");
      setSupportEmail(s.supportEmail || "support@globalbooking.ae");
      setMaintenanceMode(s.maintenanceMode ?? false);
      setRegistrationAutoReview(s.registrationAutoReviewEnabled ?? false);

      setMaxLoginAttempts(s.securityPolicies?.maxLoginAttempts ?? 5);
      setLockoutDurationMinutes(s.securityPolicies?.lockoutDurationMinutes ?? 15);
      setSessionTimeoutHours(s.securityPolicies?.sessionTimeoutHours ?? 24);
      setRequireStrongPassword(s.securityPolicies?.requireStrongPassword ?? true);

      setRequireLicenseVerification(s.providerOnboardingPolicies?.requireLicenseVerification ?? true);
      setDefaultTrialDays(s.providerOnboardingPolicies?.defaultTrialDays ?? 14);
      setAllowInstantDoctorAccess(s.providerOnboardingPolicies?.allowInstantDoctorAccess ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform settings from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!platformName.trim() || !supportEmail.trim()) {
      setError("Platform name and support email cannot be empty.");
      return;
    }

    if (maxLoginAttempts < 3 || maxLoginAttempts > 15) {
      setError("Max login attempts must be between 3 and 15.");
      return;
    }

    if (sessionTimeoutHours < 1 || sessionTimeoutHours > 168) {
      setError("Session timeout must be between 1 and 168 hours.");
      return;
    }

    if (defaultTrialDays < 7 || defaultTrialDays > 90) {
      setError("Default trial period must be between 7 and 90 days.");
      return;
    }

    try {
      setSaving(true);
      const res = await updatePlatformSettings({
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        maintenanceMode,
        registrationAutoReviewEnabled: registrationAutoReview,
        securityPolicies: {
          maxLoginAttempts,
          lockoutDurationMinutes,
          sessionTimeoutHours,
          requireStrongPassword,
        },
        providerOnboardingPolicies: {
          requireLicenseVerification,
          defaultTrialDays,
          allowInstantDoctorAccess,
        },
      });

      setSettings(res.settings);
      setSuccessMessage("Platform settings saved and recorded to audit log.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update platform settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      {/* Toast Notification */}
      {successMessage && (
        <div
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: 12,
            padding: "14px 20px",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            padding: "14px 20px",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.1) 0%, rgba(11,19,37,0.85) 100%)",
          border: "1px solid rgba(229,184,105,0.25)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Sliders size={24} color="#e5b869" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>
              Platform Settings & System Governance
            </h1>
            <span
              style={{
                background: "rgba(229,184,105,0.15)",
                color: "#e5b869",
                border: "1px solid rgba(229,184,105,0.3)",
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 20,
              }}
            >
              Standard Pricing Model
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Operational policies, security restrictions, onboarding parameters, and immutable configuration.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading || saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Reload
          </button>

          <button
            onClick={handleSave}
            disabled={loading || saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
              color: "#0b1325",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
            }}
          >
            <Save size={16} />
            {saving ? "Saving Changes..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
          <div
            style={{
              display: "inline-block",
              width: 32,
              height: 32,
              border: "3px solid rgba(229,184,105,0.3)",
              borderTopColor: "#e5b869",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: 16,
            }}
          />
          <p style={{ margin: 0, fontSize: 14 }}>Loading platform configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* SECTION 1: GENERAL PLATFORM SETTINGS */}
          <div
            style={{
              background: "rgba(11,19,37,0.7)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Globe size={20} color="#e5b869" />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff" }}>
                General Platform Information
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Official Support Email
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Operating Pricing Model
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(229,184,105,0.08)",
                    border: "1px solid rgba(229,184,105,0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#e5b869",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Lock size={16} />
                  <span>Numeric Pricing (Standard Base Units)</span>
                </div>
                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  System-wide standard numeric amounts for global doctor/hospital billing without regional currency locks.
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Maintenance Mode Toggle */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: maintenanceMode ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${maintenanceMode ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#fff" }}>
                    {maintenanceMode && <AlertTriangle size={16} color="#ef4444" />}
                    Maintenance Mode
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Temporarily pause public registration forms. Only verified Super Admins can access the system.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </label>

              {/* Registration Auto Review */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>Automated Registration Preliminary Check</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Validate license formatting and duplicates before staff manual review.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={registrationAutoReview}
                  onChange={(e) => setRegistrationAutoReview(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </label>
            </div>
          </div>

          {/* SECTION 2: SECURITY & SESSION POLICIES */}
          <div
            style={{
              background: "rgba(11,19,37,0.7)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Shield size={20} color="#e5b869" />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff" }}>
                Security & Authentication Policies
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Max Failed Login Attempts (3 - 15)
                </label>
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value, 10) || 5)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Exceeding this triggers temporary IP rate limiting and security audit logging.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Lockout Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={lockoutDurationMinutes}
                  onChange={(e) => setLockoutDurationMinutes(parseInt(e.target.value, 10) || 15)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Duration suspicious clients remain blocked before re-attempting authentication.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Session Inactivity Timeout (Hours, 1 - 168)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={sessionTimeoutHours}
                  onChange={(e) => setSessionTimeoutHours(parseInt(e.target.value, 10) || 24)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Maximum duration before an administrator session expires and re-login is required.
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>Enforce High-Complexity Passwords</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Require min 8 chars including uppercase, lowercase, numbers, and special symbols for all staff.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireStrongPassword}
                  onChange={(e) => setRequireStrongPassword(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </label>
            </div>
          </div>

          {/* SECTION 3: PROVIDER ONBOARDING & TRIAL POLICIES */}
          <div
            style={{
              background: "rgba(11,19,37,0.7)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <UserCheck size={20} color="#e5b869" />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff" }}>
                Healthcare Provider Onboarding Policies
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Default Provider Trial Period (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={90}
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(parseInt(e.target.value, 10) || 14)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Default trial duration granted to newly approved Doctors and Hospitals (Standard: 14 Days).
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>
                    Mandatory Regulatory License Verification (Accredited Medical Board)
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Staff must confirm official medical registration numbers before granting account activation.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireLicenseVerification}
                  onChange={(e) => setRequireLicenseVerification(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>
                    Allow Instant Doctor Portal Access (Bypass Manual Approval)
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    If enabled, doctors can explore the portal immediately with read-only sandbox mode.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowInstantDoctorAccess}
                  onChange={(e) => setAllowInstantDoctorAccess(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </label>
            </div>
          </div>

          {/* SECTION 4: AUDIT & GOVERNANCE METADATA */}
          {settings?.updatedAt && (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={14} color="#e5b869" />
                <span>
                  Last synchronized to MongoDB Atlas:{" "}
                  <strong style={{ color: "#cbd5e1" }}>
                    {new Date(settings.updatedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </strong>
                </span>
              </div>
              {settings.updatedByAdminName && (
                <div>
                  Author: <strong style={{ color: "#cbd5e1" }}>{settings.updatedByAdminName}</strong>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="submit"
              disabled={loading || saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                color: "#0b1325",
                fontWeight: 700,
                fontSize: 15,
                padding: "12px 28px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
              }}
            >
              <Save size={16} />
              {saving ? "Saving Changes..." : "Save All Platform Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
