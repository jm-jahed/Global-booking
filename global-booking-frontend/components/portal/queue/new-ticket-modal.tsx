"use client";

import { useState } from "react";
import {
  X,
  Ticket,
  User,
  Phone,
  Stethoscope,
  MapPin,
  AlertTriangle,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { QueueItem, PriorityLevel, CheckInChannel } from "@/types/queue";
import { issueWalkInTicket } from "@/lib/api/doctor-queue-client";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicket: (item: QueueItem) => void;
  nextTicketNumber: string;
  doctorName?: string;
  chamberLocation?: string;
  doctorSpecialty?: string;
  chambers?: any[];
  currentChamberId?: string;
}

const CLINICAL_SERVICES = [
  "Clinical Diagnostic Follow-up",
  "Specialist Clinical Consultation & Review",
  "General Medical Examination & Assessment",
  "Routine Health & Prescription Review",
  "Preventive Clinical Screening",
  "Comprehensive Health Evaluation",
];

export function NewTicketModal({
  isOpen,
  onClose,
  onAddTicket,
  nextTicketNumber,
  doctorName,
  chamberLocation,
  doctorSpecialty,
  chambers,
  currentChamberId,
}: NewTicketModalProps) {
  const { t } = useTranslation("queue");
  const { t: tApp } = useTranslation("appointments");
  const { t: tCommon } = useTranslation("common");
  const activeDoctorName =
    doctorName ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const u = JSON.parse(localStorage.getItem("gb_portal_user") || "{}");
            return u.fullName || u.name || "";
          } catch {
            return "";
          }
        })()
      : "") ||
    "Doctor Practice";

  const activeChamber =
    chamberLocation ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const u = JSON.parse(localStorage.getItem("gb_portal_user") || "{}");
            return (
              u.chamberLocationsSummary ||
              (Array.isArray(u.chambers) && u.chambers[0]?.facilityName) ||
              ""
            );
          } catch {
            return "";
          }
        })()
      : "") ||
    "Main Consultation Chamber";

  const activeSpecialty =
    doctorSpecialty ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const u = JSON.parse(localStorage.getItem("gb_portal_user") || "{}");
            return u.specialty || "";
          } catch {
            return "";
          }
        })()
      : "") ||
    "Specialist Physician";

  const resolvedChambers =
    Array.isArray(chambers) && chambers.length > 0
      ? chambers
      : [
          {
            id: currentChamberId || "CH-1",
            facilityName: activeChamber,
            timezone: "Asia/Dubai",
          },
        ];

  const [selectedChamberId, setSelectedChamberId] = useState(
    currentChamberId || resolvedChambers[0]?.id || "CH-1"
  );
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(CLINICAL_SERVICES[0]);
  const [priority, setPriority] = useState<PriorityLevel>("Standard");
  const [channel, setChannel] = useState<CheckInChannel>("QR Walk-In");
  const [ticketIssued, setTicketIssued] = useState<QueueItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const activeChm =
      resolvedChambers.find((c) => c.id === selectedChamberId) ||
      resolvedChambers[0];
    const chmTimezone = activeChm?.timezone || "Asia/Dubai";

    try {
      const res = await issueWalkInTicket({
        chamberId: activeChm.id || "CH-1",
        chamberTimezone: chmTimezone,
        patientName: clientName.trim(),
        patientPhone: phone.trim() || undefined,
        service,
        priority:
          priority === "Urgent"
            ? "URGENT"
            : priority === "VIP"
            ? "VIP"
            : "STANDARD",
        channel: "WALK_IN",
        idempotencyKey,
      });

      const backendTkt = res.ticket;
      const newItem: QueueItem = {
        id: backendTkt.id,
        ticketNumber: backendTkt.ticketNumber,
        clientName: backendTkt.patientName,
        patientName: backendTkt.patientName,
        clientAvatar: "",
        service: backendTkt.service,
        specialist: activeDoctorName,
        counterName:
          backendTkt.chamberName || activeChm.facilityName || activeChamber,
        checkInTime: backendTkt.checkInTime,
        estWaitMinutes: priority === "Urgent" ? 5 : 20,
        status: "Waiting",
        priority,
        channel,
        notes: backendTkt.notes || "Walk-in OPD patient issued ticket at triage desk.",
        patientId:
          backendTkt.patientOprId ||
          `#OPD-${backendTkt.serialIndex.toString().padStart(4, "0")}`,
        patientPhone: backendTkt.patientPhone || phone,
        patientAgeGender: "Walk-in Patient",
      };

      setTicketIssued(newItem);
      onAddTicket(newItem);
      setIdempotencyKey(
        `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      );
    } catch (err: any) {
      setSubmitError(
        err.message ||
          "Failed to issue queue ticket. Please check backend connection."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setTicketIssued(null);
    setClientName("");
    setPhone("");
    setSubmitError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 20,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(155deg, #0b1426 0%, #060b14 100%)",
          border: "1px solid rgba(229, 184, 105, 0.35)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 580,
          boxShadow:
            "0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(229, 184, 105, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "94vh",
          overflow: "hidden",
          position: "relative",
          animation: "scaleUp 0.2s ease-out",
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(90deg, rgba(229, 184, 105, 0.12) 0%, rgba(229, 184, 105, 0.02) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, rgba(229, 184, 105, 0.2) 0%, rgba(184, 134, 40, 0.25) 100%)",
                border: "1px solid rgba(229, 184, 105, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
                boxShadow: "0 4px 15px rgba(229, 184, 105, 0.2)",
              }}
            >
              <Ticket size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                {tApp("newAppointment", undefined, "New Patient Appointment")}
              </h2>
              <p
                style={{
                  margin: "1px 0 0",
                  fontSize: 11.5,
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{activeDoctorName}</span>
                <span style={{ opacity: 0.5 }}>•</span>
                <span style={{ color: "#e5b869" }}>{activeSpecialty}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "rgba(229, 184, 105, 0.4)";
              e.currentTarget.style.background = "rgba(229, 184, 105, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            }}
          >
            <X size={16} />
          </button>
        </div>

        {ticketIssued ? (
          /* =========================================================================
             SUCCESS TICKET VOUCHER VIEW
             ========================================================================= */
          <div
            style={{
              padding: 24,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "linear-gradient(180deg, #070d18 0%, #03060c 100%)",
                border: "1px solid rgba(229, 184, 105, 0.35)",
                borderRadius: 16,
                padding: "24px 22px",
                position: "relative",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed rgba(229, 184, 105, 0.3)",
                  paddingBottom: 14,
                  marginBottom: 16,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      color: "#ffffff",
                    }}
                  >
                    GLOBAL{" "}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      color: "#e5b869",
                    }}
                  >
                    BOOKING
                  </span>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      marginTop: 2,
                    }}
                  >
                    {t("officialOpdSlip", undefined, "Official OPD Triage Token Slip")}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: 20,
                    color: "#10b981",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>{t("issuedBadge", undefined, "ISSUED")}</span>
                </div>
              </div>

              {/* Big Token Number */}
              <div style={{ textAlign: "center", margin: "16px 0 20px" }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "#e5b869",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontWeight: 700,
                  }}
                >
                  {t("tokenNumberLabel", undefined, "TOKEN NUMBER")}
                </span>
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 900,
                    letterSpacing: "0.05em",
                    background:
                      "linear-gradient(135deg, #fef3c7 0%, #e5b869 50%, #b88628 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 0 30px rgba(229, 184, 105, 0.4)",
                    margin: "4px 0",
                  }}
                >
                  {ticketIssued.ticketNumber}
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    color: "#94a3b8",
                  }}
                >
                  {t("estimatedWaitMinutes", { minutes: ticketIssued.estWaitMinutes }, `Estimated Wait: ~${ticketIssued.estWaitMinutes} mins`)}
                </span>
              </div>

              {/* Details Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px 16px",
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  fontSize: 12,
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>
                    {t("patientName", undefined, "Patient Name")}
                  </span>
                  <span
                    style={{
                      color: "#ffffff",
                      fontWeight: 700,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    {ticketIssued.clientName}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>
                    {t("chamberRoom", undefined, "Chamber / Room")}
                  </span>
                  <span
                    style={{
                      color: "#ffffff",
                      fontWeight: 600,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    {ticketIssued.counterName}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>
                    {t("specialistDoctor", undefined, "Specialist Doctor")}
                  </span>
                  <span
                    style={{
                      color: "#e5b869",
                      fontWeight: 600,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    {ticketIssued.specialist}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>
                    {t("issueTime", undefined, "Issue Time")}
                  </span>
                  <span
                    style={{
                      color: "#94a3b8",
                      fontWeight: 600,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    {ticketIssued.checkInTime}
                  </span>
                </div>
              </div>

              {/* Notice */}
              <p
                style={{
                  margin: "16px 0 0",
                  textAlign: "center",
                  fontSize: 11,
                  color: "#64748b",
                  lineHeight: 1.4,
                }}
              >
                {t("watchTvNotice", undefined, "Please watch the Waiting Room TV display for your token number.")}
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Printer size={15} />
                <span>{t("printSlip", undefined, "Print Slip")}</span>
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                  color: "#070d18",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(229, 184, 105, 0.3)",
                }}
              >
                {tCommon("close", undefined, "Done")}
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             INPUT FORM VIEW
             ========================================================================= */
          <form
            onSubmit={handleGenerate}
            style={{
              padding: "14px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* NEXT TOKEN ALLOCATION BANNER */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(229, 184, 105, 0.12) 0%, rgba(184, 134, 40, 0.05) 100%)",
                border: "1px solid rgba(229, 184, 105, 0.3)",
                borderRadius: 12,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 10px #10b981",
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#ffffff",
                      display: "block",
                    }}
                  >
                    {t("allocatedNextToken", undefined, "Allocated Next Serial Token")}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {t("sequentialQueueAssignment", undefined, "Sequential atomic queue assignment")}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#070d18",
                  background:
                    "linear-gradient(135deg, #fef3c7 0%, #e5b869 100%)",
                  padding: "4px 16px",
                  borderRadius: 20,
                  boxShadow: "0 2px 10px rgba(229, 184, 105, 0.3)",
                }}
              >
                {nextTicketNumber}
              </span>
            </div>

            {/* ERROR NOTICE IF ANY */}
            {submitError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#fca5a5",
                  fontSize: 12.5,
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* PATIENT FULL NAME */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <User size={13} color="#e5b869" />
                <span>{tApp("fullNameRequired", undefined, "Patient Full Name *")}</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Al Mansoori"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050913",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: 13.5,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#e5b869";
                  e.currentTarget.style.boxShadow =
                    "0 0 12px rgba(229, 184, 105, 0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* MOBILE NUMBER */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Phone size={13} color="#e5b869" />
                <span>{t("mobileNumberOptional", undefined, "Mobile Number (Optional)")}</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050913",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: 13.5,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#e5b869";
                  e.currentTarget.style.boxShadow =
                    "0 0 12px rgba(229, 184, 105, 0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* CHAMBER LOCATION */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <MapPin size={13} color="#e5b869" />
                <span>{tApp("chamber", undefined, "Chamber Location")}</span>
              </label>
              <select
                value={selectedChamberId}
                onChange={(e) => setSelectedChamberId(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050913",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                {resolvedChambers.map((s: any) => (
                  <option
                    key={s.id}
                    value={s.id}
                    style={{ background: "#0b1426", color: "#fff" }}
                  >
                    {s.facilityName || s.name || "Chamber"}
                  </option>
                ))}
              </select>
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 6,
                paddingTop: 16,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  padding: "11px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94a3b8";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }}
              >
                {tCommon("cancel", undefined, "Cancel")}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !clientName.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 26px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    !clientName.trim() || isSubmitting
                      ? "rgba(229, 184, 105, 0.35)"
                      : "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                  color: "#070d18",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor:
                    !clientName.trim() || isSubmitting
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    !clientName.trim() || isSubmitting
                      ? "none"
                      : "0 4px 20px rgba(229, 184, 105, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <Ticket size={16} />
                <span>
                  {isSubmitting
                    ? t("bookingAppointment", undefined, "Booking Appointment...")
                    : t("createAppointment", undefined, "Create Patient Appointment")}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
