"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  MoreVertical,
  DollarSign,
  MapPin,
  Calendar,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
} from "lucide-react";
import {
  getDoctors,
  createDoctor,
  updateDoctorStatus,
  type CreateDoctorPayload,
} from "@/lib/api/admin-client";
import { useTranslation } from "@/lib/i18n/i18n-context";

export function DoctorsManager() {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [totalCount, setTotalCount] = useState(0);

  // Add Doctor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDoctorPayload>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    specialty: "Cardiology",
    licenseNumber: "",
    yearsOfExperience: 5,
    chamberLocationsSummary: "",
    consultationFeeAed: 500,
    accountStatus: "TRIAL",
  });

  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Success modal after creating doctor
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Action status modal
  const [statusModalDoctor, setStatusModalDoctor] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "SUSPENDED">("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    let pwd = "Doc!";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += "2026";
    setFormData((prev) => ({ ...prev, password: pwd }));
    setShowPasswordInput(true);
  };

  const copyCredentials = (email: string, pass: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const text = `Doctor Portal Login Credentials\nPortal: ${origin}/login\nEmail: ${email}\nPassword: ${pass}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDoctors({
        search: searchTerm.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setDoctors(res.items || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors list.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError("Doctor Full Name, Email Address, and Phone Number are required.");
      return;
    }

    if (formData.password && formData.password.trim().length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateDoctorPayload = {
        ...formData,
        specialty: formData.specialty || "General Specialist",
        licenseNumber: formData.licenseNumber || `LIC-${Date.now().toString().slice(-6)}`,
        yearsOfExperience: formData.yearsOfExperience || 5,
        chamberLocationsSummary: formData.chamberLocationsSummary || "",
        consultationFeeAed: formData.consultationFeeAed || 500,
      };
      const res = await createDoctor(payload);
      setCreatedResult(res);
      setShowAddModal(false);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        specialty: "General Specialist",
        licenseNumber: "",
        yearsOfExperience: 5,
        chamberLocationsSummary: "",
        consultationFeeAed: 500,
        accountStatus: "TRIAL",
      });
      setShowPasswordInput(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create doctor account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalDoctor) return;

    try {
      setSubmitting(true);
      await updateDoctorStatus(statusModalDoctor.id, {
        status: targetStatus,
        reason: statusReason.trim() || undefined,
      });
      setStatusModalDoctor(null);
      setStatusReason("");
      await loadData();
    } catch (err) {
      alert(`Status update error: ${err instanceof Error ? err.message : "Failed to update doctor status."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card with + Add Doctor Button */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.08) 0%, rgba(11,19,37,0.85) 100%)",
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
            <Stethoscope size={24} color="#e5b869" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>
              {t("doctorsSpecialists", undefined, "Doctors & Specialists")}
            </h1>
            <span
              style={{
                background: "rgba(229,184,105,0.15)",
                color: "#e5b869",
                border: "1px solid rgba(229,184,105,0.3)",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t("totalRegisteredCount", { count: totalCount }, `${totalCount} Total Registered`)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            {t("manageDoctorsSubtitle", undefined, "Manage authorized healthcare specialists, assigned Patients, consultation fees, and subscription lifecycles.")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {tCommon("refresh", undefined, "Refresh")}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              border: "none",
              color: "#060b13",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(229,184,105,0.3)",
            }}
          >
            <Plus size={18} />
            + Add Doctor
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ position: "relative", minWidth: 320, flex: 1, maxWidth: 440 }}>
          <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Doctor Name, License, Email or DOC ID..."
            style={{
              width: "100%",
              background: "#0b1325",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px 10px 38px",
              color: "#fff",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, background: "#0b1325", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { key: "ALL", label: "All Statuses" },
            { key: "TRIAL", label: "Trial" },
            { key: "ACTIVE", label: "Active" },
            { key: "SUSPENDED", label: "Suspended" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                background: statusFilter === tab.key ? "#e5b869" : "transparent",
                color: statusFilter === tab.key ? "#060b13" : "#94a3b8",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            padding: "14px 18px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Doctors Grid / Cards */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#e5b869" }} />
          <p style={{ margin: 0, fontSize: 15 }}>Loading doctors from MongoDB Atlas...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div
          style={{
            background: "#0b1325",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <Stethoscope size={44} color="#64748b" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>
            No Doctors Found
          </h3>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 440, margin: "0 auto 20px" }}>
            No registered doctors found matching your query. Click "+ Add Doctor" to manually register a new specialist into the database.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              border: "none",
              color: "#060b13",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Add First Doctor
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
          {doctors.map((doc) => {
            const isTrial = doc.accountStatus === "TRIAL";
            const isActive = doc.accountStatus === "ACTIVE";
            const isSuspended = doc.accountStatus === "SUSPENDED";

            return (
              <div
                key={doc.id}
                style={{
                  background: "#0b1325",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "rgba(56,189,248,0.12)",
                        border: "1px solid rgba(56,189,248,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#38bdf8",
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {doc.fullName.charAt(0) || "D"}
                    </div>

                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff" }}>
                        {doc.fullName}
                      </h3>
                      <div style={{ fontSize: 13, color: "#e5b869", fontWeight: 600, marginTop: 2 }}>
                        {doc.specialty}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        {doc.doctorId} • {doc.licenseNumber}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: isTrial
                        ? "rgba(229,184,105,0.15)"
                        : isActive
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(239,68,68,0.15)",
                      color: isTrial ? "#e5b869" : isActive ? "#10b981" : "#ef4444",
                      border: isTrial
                        ? "1px solid rgba(229,184,105,0.3)"
                        : isActive
                        ? "1px solid rgba(16,185,129,0.3)"
                        : "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    {doc.accountStatus}
                  </span>
                </div>

                {/* Metrics adhering strictly to Patient terminology */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Assigned Patients</span>
                    <strong style={{ color: "#fff", fontSize: 14 }}>
                      {doc.assignedPatientCount || 0} Patients
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Consultation Fee</span>
                    <strong style={{ color: "#e5b869", fontSize: 14 }}>
                      {doc.consultationFee?.formatted || "500.00"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Experience</span>
                    <strong style={{ color: "#fff" }}>{doc.yearsOfExperience || 5} Years</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Location</span>
                    <strong style={{ color: "#fff" }}>{doc.chamberLocationsSummary || "Not specified"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Registered: {new Date(doc.createdAt).toLocaleDateString()}
                  </span>

                  <div style={{ display: "flex", gap: 8 }}>
                    {isSuspended ? (
                      <button
                        onClick={() => {
                          setStatusModalDoctor(doc);
                          setTargetStatus("ACTIVE");
                        }}
                        style={{
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          color: "#10b981",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setStatusModalDoctor(doc);
                          setTargetStatus("SUSPENDED");
                        }}
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#ef4444",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(229,184,105,0.3)",
              borderRadius: 18,
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869", textTransform: "uppercase" }}>
                  Super Admin Manual Creation
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0", color: "#fff" }}>
                  + Add New Doctor & Specialist
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDoctor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Dr. Rashid Al-Nuaimi"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "9px 12px",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@specialist.ae"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "9px 12px",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Doctor Account Initial Password Field */}
              <div
                style={{
                  background: "rgba(229,184,105,0.06)",
                  border: "1px solid rgba(229,184,105,0.22)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#e5b869", display: "flex", alignItems: "center", gap: 6 }}>
                    <KeyRound size={15} />
                    Doctor Account Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    style={{
                      background: "rgba(229,184,105,0.15)",
                      border: "1px solid rgba(229,184,105,0.35)",
                      color: "#e5b869",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={12} />
                    Generate Strong Password
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswordInput ? "text" : "password"}
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter custom password or click Generate (min 8 chars)"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 6,
                      padding: "9px 38px 9px 12px",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      fontFamily: showPasswordInput ? "monospace" : "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInput(!showPasswordInput)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 2,
                    }}
                    title={showPasswordInput ? "Hide password" : "Show password"}
                  >
                    {showPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                  The doctor will use this email and password to log in at <strong style={{ color: "#e5b869" }}>/login</strong>. (Auto-generates if left blank).
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +1 555 123 4567"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "9px 12px",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    Initial Account Status
                  </label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value as any })}
                    style={{
                      width: "100%",
                      background: "#070c17",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "9px 12px",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="TRIAL">TRIAL (14 Days Free)</option>
                    <option value="ACTIVE">ACTIVE (Fully Activated)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    color: "#94a3b8",
                    padding: "11px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                    border: "none",
                    color: "#060b13",
                    padding: "11px",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {submitting ? "Creating..." : "Save & Create Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CHANGE MODAL */}
      {statusModalDoctor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0b1325",
              border: targetStatus === "SUSPENDED" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: 26,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              {targetStatus === "SUSPENDED" ? "Suspend Doctor Account" : "Reactivate Doctor Account"}
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 16px" }}>
              Are you sure you want to change status of <strong>{statusModalDoctor.fullName}</strong> to <strong style={{ color: targetStatus === "SUSPENDED" ? "#ef4444" : "#10b981" }}>{targetStatus}</strong>?
            </p>

            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Reason for suspension or reactivation (recorded in audit log)..."
              rows={3}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "10px",
                color: "#fff",
                fontSize: 13,
                marginBottom: 16,
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setStatusModalDoctor(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "#94a3b8",
                  padding: "9px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                disabled={submitting}
                style={{
                  background: targetStatus === "SUSPENDED" ? "#ef4444" : "#10b981",
                  border: "none",
                  color: "#fff",
                  padding: "9px 18px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {submitting ? "Updating..." : "Confirm Status Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {createdResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(229,184,105,0.4)",
              borderRadius: 18,
              maxWidth: 540,
              width: "100%",
              padding: 30,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: "rgba(229,184,105,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#e5b869",
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
              Doctor Successfully Registered!
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 18px" }}>
              Doctor account for <strong>{createdResult.doctor?.fullName}</strong> has been saved directly to MongoDB Atlas.
            </p>

            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                borderRadius: 10,
                padding: "16px 20px",
                textAlign: "left",
                marginBottom: 20,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div><strong>Account ID:</strong> <code style={{ color: "#e5b869" }}>{createdResult.doctor?.id}</code></div>
              <div><strong>Doctor ID:</strong> <code style={{ color: "#38bdf8" }}>{createdResult.doctor?.doctorId}</code></div>
              <div><strong>Status:</strong> <span style={{ color: "#10b981" }}>{createdResult.doctor?.accountStatus}</span></div>
              <div><strong>Subscription:</strong> <span style={{ color: "#fff" }}>{createdResult.subscription?.planName}</span></div>
              
              {/* Doctor Sign-In Credentials Block */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(229,184,105,0.12) 0%, rgba(11,19,37,0.8) 100%)",
                  border: "1px solid rgba(229,184,105,0.35)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginTop: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e5b869", display: "flex", alignItems: "center", gap: 6 }}>
                    <KeyRound size={15} />
                    Doctor Sign-In Credentials
                  </span>
                  <button
                    onClick={() =>
                      copyCredentials(
                        createdResult.credentials?.email || createdResult.doctor?.email || "",
                        createdResult.credentials?.password || "",
                      )
                    }
                    style={{
                      background: copiedCredentials ? "rgba(16,185,129,0.2)" : "rgba(229,184,105,0.15)",
                      border: copiedCredentials ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(229,184,105,0.3)",
                      color: copiedCredentials ? "#10b981" : "#e5b869",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {copiedCredentials ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCredentials ? "Copied to Clipboard!" : "Copy Credentials"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Login Portal: </span>
                    <code style={{ color: "#38bdf8" }}>/login</code>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Account Email: </span>
                    <strong style={{ color: "#fff" }}>
                      {createdResult.credentials?.email || createdResult.doctor?.email}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Initial Password: </span>
                    <strong style={{ color: "#e5b869", fontFamily: "monospace", fontSize: 13 }}>
                      {createdResult.credentials?.password || "••••••••"}
                    </strong>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 8 }}>
                <strong>Invitation / Activation Token:</strong>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <span>{createdResult.invitation?.token}</span>
                  <button
                    onClick={() => copyToken(createdResult.invitation?.token)}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedToken ? "#10b981" : "#e5b869",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginLeft: 8,
                    }}
                  >
                    {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCreatedResult(null)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                border: "none",
                color: "#060b13",
                padding: "12px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Done & Return to Doctors List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
