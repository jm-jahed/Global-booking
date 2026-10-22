"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { adminLogin } from "@/lib/api/admin-client";

export default function SuperAdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your Super Admin email address.");
      return;
    }

    if (!password) {
      setError("Please enter your administrative master password.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminLogin({ email: trimmedEmail, password });
      if (res?.user) {
        if (
          res.user.role === "SUPER_ADMIN" ||
          res.user.role === "OPERATIONS_ADMIN" ||
          res.user.role === "BILLING_ADMIN" ||
          res.user.role === "AUDIT_VIEWER"
        ) {
          router.push("/admin/registrations");
          return;
        }
        setError("Access denied: This portal is strictly restricted to Platform Administrators.");
        return;
      }
      setError("Authentication failed: Invalid credentials or missing administrator profile.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Unable to connect to the authentication server. Please check your network connection or verify that the server is online.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060b13",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(229,184,105,0.12) 0%, rgba(6,11,19,0.95) 75%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Top Utility Nav */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#94a3b8",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 14px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            transition: "all 0.2s",
          }}
        >
          <ArrowLeft size={16} />
          <span>Return Home</span>
        </Link>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#34d399",
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.25)",
            padding: "6px 12px",
            borderRadius: 999,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#34d399",
              boxShadow: "0 0 8px #34d399",
            }}
          />
          <span>Fastify Backend Active (Port 3003)</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "linear-gradient(180deg, #0b1325 0%, #080e1b 100%)",
          border: "1px solid rgba(229,184,105,0.3)",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(229,184,105,0.08)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Emblem & Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
              border: "1px solid rgba(229,184,105,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(229,184,105,0.2)",
            }}
          >
            <ShieldCheck size={30} color="#e5b869" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: "#ffffff", letterSpacing: "-0.02em" }}>
            Super Admin Portal
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
            Executive authorization & multi-industry management console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor={emailId}
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}
            >
              Administrator Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@globalbooking.ae"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#060b13",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 14px 12px 40px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor={passwordId}
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}
            >
              Master Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#060b13",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 44px 12px 40px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #f3c87a 0%, #e5b869 50%, #b88628 100%)",
              border: "none",
              borderRadius: 10,
              color: "#060b13",
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(229,184,105,0.3)",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating Console...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Sign In to Super Admin Console</span>
              </>
            )}
          </button>
        </form>

        {/* Security Feature Micro-List */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#64748b",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} color="#10b981" />
            HTTP-Only Cookie
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} color="#10b981" />
            CORS Origin Guard
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} color="#10b981" />
            Bcrypt 12 Rounds
          </span>
        </div>
      </div>
    </div>
  );
}
