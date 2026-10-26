"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users2,
  UserPlus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Phone,
  Mail,
  Calendar,
  X,
  Eye,
  ChevronDown,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import {
  fetchDoctorPatients,
  syncDoctorLiveQueuePatients,
  PersistentPatient,
} from "@/lib/api/doctor-patients-client";
import { PatientDetailModal } from "./patient-detail-modal";
import { NewPatientModal } from "./new-patient-modal";
import { useTranslation } from "@/lib/i18n/i18n-context";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
  "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #db2777 0%, #f472b6 100%)",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function PatientsView() {
  const { t: tPatients } = useTranslation("patients");
  const { t: tPortal } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { t: tAppointments } = useTranslation("appointments");

  const [patients, setPatients] = useState<PersistentPatient[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [bloodFilter, setBloodFilter] = useState("All Blood Groups");

  // Modals
  const [activePatient, setActivePatient] = useState<PersistentPatient | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live Hospital Clock
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real patients from MongoDB API
  const loadPatients = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setApiError(null);
      try {
        const res = await fetchDoctorPatients({
          search: searchQuery || undefined,
          status: statusFilter !== "All Status" ? statusFilter : undefined,
          bloodGroup: bloodFilter !== "All Blood Groups" ? bloodFilter : undefined,
        });

        setPatients(res.items || []);
        setTotalCount(res.total || 0);
      } catch (err: any) {
        if (!isSilent) {
          setApiError(err.message || "Failed to load patient directory from server.");
        }
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [searchQuery, statusFilter, bloodFilter],
  );

  useEffect(() => {
    loadPatients(false);

    // Listen for queue completion events dispatched across tabs/components
    const handleUpdate = () => {
      loadPatients(true);
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("global-booking-updated", handleUpdate);

    // Live cross-tab / cross-device polling (~4.5s) to guarantee real-time updates
    const interval = setInterval(() => {
      loadPatients(true);
    }, 4500);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("global-booking-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [loadPatients]);

  // Idempotent Live Queue Sync Handler
  const handleLiveQueueSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncDoctorLiveQueuePatients();
      showToast(
        `Synchronized ${res.syncedCount} queue tickets! (${res.newPatientsCount} new, ${res.updatedPatientsCount} updated)`,
      );
      await loadPatients(true);
    } catch (err: any) {
      showToast(err.message || "Sync encountered an issue.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Genuine KPI calculations derived from real database records
  const kpis = useMemo(() => {
    const total = totalCount;
    const active = patients.filter((p) => p.status === "Active" || p.status === "In-Treatment").length;
    const newPatients = patients.filter((p) => p.status === "New").length;
    const totalVisits = patients.reduce((acc, p) => acc + (p.totalVisits || 0), 0);
    return { total, active, newPatients, totalVisits };
  }, [patients, totalCount]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Status");
    setBloodFilter("All Blood Groups");
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== "All Status" || bloodFilter !== "All Blood Groups";

  return (
    <div
      className="dashboard-page-container patients-portal-view"
      style={{ padding: "20px 24px", minHeight: "100vh", background: "#050b14", color: "#ffffff" }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)",
            color: "#ffffff",
            padding: "9px 20px",
            borderRadius: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 6px 25px rgba(16, 185, 129, 0.35)",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.8} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(229, 184, 105, 0.12)",
              border: "1px solid rgba(229, 184, 105, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              boxShadow: "0 0 20px rgba(229, 184, 105, 0.2)",
            }}
          >
            <Users2 size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#ffffff" }}>
                {tPatients("title")}
              </h1>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 12,
                  background: "rgba(229, 184, 105, 0.12)",
                  color: "#e5b869",
                  border: "1px solid rgba(229, 184, 105, 0.3)",
                }}
              >
                {totalCount}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
              {tPatients("subtitle")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {currentTime && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e5b869",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              <Clock size={13} color="#e5b869" />
              <span>{currentTime}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLiveQueueSync}
            disabled={isSyncing}
            title="Idempotently sync patients from Live Queue & Appointments into directory"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(229, 184, 105, 0.3)",
              color: "#e5b869",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isSyncing ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={13} className={isSyncing ? "spin-animation" : ""} />
            <span>{isSyncing ? "Syncing..." : tPortal("syncLive")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              border: "none",
              color: "#070d18",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(229, 184, 105, 0.3)",
            }}
          >
            <UserPlus size={15} strokeWidth={2.4} />
            <span>{tPatients("registerPatient")}</span>
          </button>
        </div>
      </section>

      {/* 4 STAT METRIC CARDS (Genuine Database Metrics) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Metric 1: Total Patients */}
        <div
          style={{
            background: "rgba(10, 17, 32, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              Total Patients
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(229,184,105,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <Users2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
            {kpis.total}
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
            In doctor patient registry
          </span>
        </div>

        {/* Metric 2: Active in Care */}
        <div
          style={{
            background: "rgba(10, 17, 32, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              Active in Care
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(16,185,129,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <Activity size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>
            {kpis.active}
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
            Active & ongoing consultations
          </span>
        </div>

        {/* Metric 3: New Registrations */}
        <div
          style={{
            background: "rgba(10, 17, 32, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              New Intake
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(59,130,246,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <UserPlus size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#60a5fa", fontFamily: "monospace" }}>
            {kpis.newPatients}
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
            Newly onboarded patient records
          </span>
        </div>

        {/* Metric 4: Total Attended Consultations */}
        <div
          style={{
            background: "rgba(10, 17, 32, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              Total Consultations
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(229,184,105,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <HeartPulse size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#e5b869", fontFamily: "monospace" }}>
            {kpis.totalVisits}
          </div>
          <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
            Attended queue & booking visits
          </span>
        </div>
      </section>

      {/* TOOLBAR CONTROLS BAR */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Fast Search Input */}
          <div style={{ position: "relative", width: 280 }}>
            <Search
              size={14}
              color="#64748b"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search by name, phone or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                background: "#0a1120",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                color: "#ffffff",
                fontSize: 12.5,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#0a1120",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              color: "#ffffff",
              fontSize: 12.5,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="In-Treatment">In-Treatment</option>
            <option value="Follow-up Due">Follow-up Due</option>
            <option value="New">New</option>
            <option value="Discharged">Discharged</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#0a1120",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              color: "#ffffff",
              fontSize: 12.5,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All Blood Groups">All Blood</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* Error Notice Banner */}
      {apiError && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "10px 16px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#f87171",
            fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadPatients(false)}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "none",
              borderRadius: 6,
              color: "#ffffff",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11.5,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* PATIENT TABLE VIEW */}
      <div
        style={{
          background: "rgba(10, 17, 32, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12.5 }}>
            <thead>
              <tr
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <th style={{ padding: "12px 16px", width: 40 }}>#</th>
                <th style={{ padding: "12px 16px" }}>{tPatients("mrn")}</th>
                <th style={{ padding: "12px 16px" }}>{tAppointments("patientName")}</th>
                <th style={{ padding: "12px 16px" }}>{tAppointments("contactNumber")}</th>
                <th style={{ padding: "12px 16px" }}>{tPatients("lastVisit")}</th>
                <th style={{ padding: "12px 16px" }}>{tPatients("totalVisits")}</th>
                <th style={{ padding: "12px 16px" }}>{tAppointments("appointmentDate")}</th>
                <th style={{ padding: "12px 16px" }}>{tAppointments("filterByStatus")}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <RefreshCw size={26} className="spin-animation" style={{ margin: "0 auto 10px", color: "#e5b869" }} />
                    <p style={{ margin: 0, fontSize: 13, color: "#ffffff", fontWeight: 700 }}>
                      Loading real patient records from MongoDB...
                    </p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <Users2 size={36} color="#e5b869" style={{ margin: "0 auto 10px", opacity: 0.7 }} />
                    <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                      {hasActiveFilters ? "No patients matching filter criteria" : "No registered patients yet"}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                      {hasActiveFilters
                        ? "Try clearing your search query or status filter."
                        : "Click 'Sync Live Queue' above to import patients from today's Live Queue into the permanent registry."}
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map((p, index) => {
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {/* Index */}
                      <td style={{ padding: "14px 16px", color: "#64748b" }}>{index + 1}</td>

                      {/* MRN / ID */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#e5b869",
                              fontFamily: "monospace",
                            }}
                          >
                            {p.mrn}
                          </span>
                          <span style={{ fontSize: 10.5, color: "#64748b", fontFamily: "monospace" }}>
                            {p.id}
                          </span>
                        </div>
                      </td>

                      {/* Patient Name */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: getAvatarColor(p.name),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", display: "block" }}>
                              {p.name}
                            </span>
                            {p.bloodGroup && (
                              <span style={{ fontSize: 10.5, color: "#94a3b8" }}>Blood: {p.bloodGroup}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Number */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#cbd5e1", fontFamily: "monospace" }}>
                          {p.phone || "—"}
                        </span>
                      </td>

                      {/* Last Visit */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12, color: "#e2e8f0" }}>
                          {p.lastVisit ? p.lastVisit.split("-").reverse().join("-") : "—"}
                        </span>
                      </td>

                      {/* Total Visits */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: p.totalVisits > 0 ? "#e5b869" : "#94a3b8",
                          }}
                        >
                          {p.totalVisits} {p.totalVisits === 1 ? "visit" : "visits"}
                        </span>
                      </td>

                      {/* Upcoming Booking */}
                      <td style={{ padding: "14px 16px" }}>
                        {p.nextAppointment?.date ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: "#34d399",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Calendar size={12} />
                            {p.nextAppointment.date.split("-").reverse().join("-")}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
                        )}
                      </td>

                      {/* Clinical Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 16,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              p.status === "Active"
                                ? "rgba(16, 185, 129, 0.15)"
                                : p.status === "In-Treatment"
                                ? "rgba(59, 130, 246, 0.15)"
                                : "rgba(148, 163, 184, 0.15)",
                            color:
                              p.status === "Active"
                                ? "#34d399"
                                : p.status === "In-Treatment"
                                ? "#60a5fa"
                                : "#cbd5e1",
                            border:
                              p.status === "Active"
                                ? "1px solid rgba(16, 185, 129, 0.3)"
                                : p.status === "In-Treatment"
                                ? "1px solid rgba(59, 130, 246, 0.3)"
                                : "1px solid rgba(148, 163, 184, 0.3)",
                          }}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setActivePatient(p)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid rgba(229, 184, 105, 0.35)",
                            background: "rgba(229, 184, 105, 0.08)",
                            color: "#e5b869",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={13} />
                          <span>View Chart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Detail Modal */}
      <PatientDetailModal
        patient={activePatient}
        onClose={() => setActivePatient(null)}
      />

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onPatientCreated={(newP) => {
          setPatients((prev) => [newP, ...prev]);
          setTotalCount((c) => c + 1);
          showToast(`Patient ${newP.name} registered successfully!`);
        }}
      />
    </div>
  );
}
