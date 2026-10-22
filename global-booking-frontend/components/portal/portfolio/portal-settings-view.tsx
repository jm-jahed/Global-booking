"use client";

import { useState, useEffect } from "react";
import { DoctorSettingsEditor } from "./doctor-settings-editor";
import { getStoredAccountType, getAdminMe } from "@/lib/api/admin-client";
import { Building2, Settings } from "lucide-react";

export function PortalSettingsView() {
  const [accountType, setAccountType] = useState<string>("DOCTOR");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = getStoredAccountType();
    if (stored) {
      setAccountType(stored);
    }

    getAdminMe()
      .then((res) => {
        if (res?.user?.role) {
          setAccountType(res.user.role);
        }
      })
      .catch(() => {})
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          color: "#94a3b8",
        }}
      >
        <p style={{ margin: 0, fontSize: 13 }}>Loading account configuration...</p>
      </div>
    );
  }

  // Doctor Account: Render real Doctor Profile & Portfolio editor
  if (accountType === "DOCTOR") {
    return <DoctorSettingsEditor />;
  }

  // Hospital Account: Render Hospital Institutional settings
  return (
    <div
      style={{
        background: "#0c1527",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 16,
        padding: "32px 28px",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Building2 size={24} color="#60a5fa" />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
          Hospital / Clinic Profile & Institutional Settings
        </h2>
      </div>
      <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 20px" }}>
        Hospital facility profiles, clinical departments, bed management, and specialist roster
        configurations are managed through institutional administrative accounts. Individual Doctor
        portfolios remain completely separate.
      </p>
    </div>
  );
}
