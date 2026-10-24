"use client";

import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  HeartPulse,
  Shield,
  AlertTriangle,
  Activity,
  FileText,
  CheckCircle2,
  Clock,
  Printer,
  History,
  Ticket,
} from "lucide-react";
import type { PersistentPatient } from "@/lib/api/doctor-patients-client";

interface PatientDetailModalProps {
  patient: PersistentPatient | null;
  onClose: () => void;
  onBookAppointment?: (patient: PersistentPatient) => void;
}

export function PatientDetailModal({ patient, onClose, onBookAppointment }: PatientDetailModalProps) {
  if (!patient) return null;

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog-card patient-chart-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 780,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "#0a1120",
          border: "1px solid rgba(229, 184, 105, 0.3)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
          borderRadius: 16,
          color: "#ffffff",
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(184,134,40,0.3) 100%)",
                border: "1.5px solid rgba(229,184,105,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#ffffff" }}>{patient.name}</h2>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "rgba(229,184,105,0.12)",
                    color: "#e5b869",
                    border: "1px solid rgba(229,184,105,0.3)",
                    fontFamily: "monospace",
                  }}
                >
                  {patient.mrn}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      patient.status === "Active"
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(59,130,246,0.15)",
                    color: patient.status === "Active" ? "#34d399" : "#60a5fa",
                    border:
                      patient.status === "Active"
                        ? "1px solid rgba(16,185,129,0.3)"
                        : "1px solid rgba(59,130,246,0.3)",
                  }}
                >
                  {patient.status}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                Patient ID: <strong style={{ color: "#e2e8f0" }}>{patient.id}</strong> • Total Attended Visits:{" "}
                <strong style={{ color: "#e5b869" }}>{patient.totalVisits}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 6,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px 24px" }}>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                Contact Number
              </span>
              <strong style={{ fontSize: 13.5, color: "#ffffff", marginTop: 4, display: "block" }}>
                {patient.phone || "Not Provided"}
              </strong>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                Last Visit Date
              </span>
              <strong style={{ fontSize: 13.5, color: "#e5b869", marginTop: 4, display: "block" }}>
                {patient.lastVisit ? patient.lastVisit.split("-").reverse().join("-") : "None recorded"}
              </strong>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                Upcoming Booking
              </span>
              <strong style={{ fontSize: 13.5, color: "#34d399", marginTop: 4, display: "block" }}>
                {patient.nextAppointment?.date
                  ? `${patient.nextAppointment.date.split("-").reverse().join("-")}${
                      patient.nextAppointment.time ? ` (${patient.nextAppointment.time})` : ""
                    }`
                  : "None scheduled"}
              </strong>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                Blood Group / Gender
              </span>
              <strong style={{ fontSize: 13.5, color: "#ffffff", marginTop: 4, display: "block" }}>
                {patient.bloodGroup || "—"} • {patient.gender || "Not specified"}
              </strong>
            </div>
          </div>

          {/* Visit & Appointment History */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <History size={16} color="#e5b869" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                Encounter & Visit History ({patient.visitHistory?.length || 0})
              </h3>
            </div>

            {patient.visitHistory && patient.visitHistory.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {patient.visitHistory.map((v, idx) => (
                  <div
                    key={v.visitId || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 8,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#e5b869",
                          background: "rgba(229,184,105,0.15)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontFamily: "monospace",
                        }}
                      >
                        {v.serialNumber || `#${idx + 1}`}
                      </span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", display: "block" }}>
                          {v.service || "Consultation"}
                        </span>
                        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                          {v.chamberName || "Main Chamber"} •{" "}
                          {v.displayDate || (v.date ? v.date.split("-").reverse().join("-") : "")}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 12,
                          background:
                            v.status === "COMPLETED" || v.status === "ATTENDED"
                              ? "rgba(16,185,129,0.15)"
                              : v.status === "SKIPPED_ABSENT" || v.status === "CANCELLED"
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(59,130,246,0.15)",
                          color:
                            v.status === "COMPLETED" || v.status === "ATTENDED"
                              ? "#34d399"
                              : v.status === "SKIPPED_ABSENT" || v.status === "CANCELLED"
                              ? "#f87171"
                              : "#60a5fa",
                          border:
                            v.status === "COMPLETED" || v.status === "ATTENDED"
                              ? "1px solid rgba(16,185,129,0.3)"
                              : v.status === "SKIPPED_ABSENT" || v.status === "CANCELLED"
                              ? "1px solid rgba(239,68,68,0.3)"
                              : "1px solid rgba(59,130,246,0.3)",
                        }}
                      >
                        {v.status === "COMPLETED" || v.status === "ATTENDED"
                          ? "Attended ✓"
                          : v.status === "SKIPPED_ABSENT"
                          ? "Absent (Skipped)"
                          : v.status === "CANCELLED"
                          ? "Cancelled"
                          : "In Progress"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
                No past visit records found for this patient.
              </p>
            )}
          </div>

          {/* Clinical Notes */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FileText size={16} color="#e5b869" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                Clinical Remarks & History
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
              {patient.notes || "No clinical remarks recorded for this patient file."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#ffffff",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Printer size={14} />
            <span>Print Chart</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              color: "#070d18",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close Chart
          </button>
        </div>
      </div>
    </div>
  );
}
