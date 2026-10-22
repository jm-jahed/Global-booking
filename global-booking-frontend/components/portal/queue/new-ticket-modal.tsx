"use client";

import { useState } from "react";
import { X, Ticket, User, Stethoscope, AlertTriangle, Printer, QrCode } from "lucide-react";
import { QueueItem, PriorityLevel, CheckInChannel } from "@/types/queue";
import { issueWalkInTicket } from "@/lib/api/doctor-queue-client";

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

const CARDIOLOGY_SERVICES = [
  "Clinical Diagnostic Follow-up",
  "Specialist Clinical Consultation & Review",
  "General Medical Examination & Assessment",
  "Routine Health & Prescription Review",
  "Preventive Clinical Screening",
  "Diagnostic & Treatment Follow-up",
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
    "Clinical Consultation";

  const resolvedChambers = Array.isArray(chambers) && chambers.length > 0 ? chambers : [
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
  const [service, setService] = useState(CARDIOLOGY_SERVICES[0]);
  const [priority, setPriority] = useState<PriorityLevel>("Standard");
  const [channel, setChannel] = useState<CheckInChannel>("QR Walk-In");
  const [ticketIssued, setTicketIssued] = useState<QueueItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const activeChm = resolvedChambers.find((c) => c.id === selectedChamberId) || resolvedChambers[0];
    const chmTimezone = activeChm?.timezone || "Asia/Dubai";

    try {
      const res = await issueWalkInTicket({
        chamberId: activeChm.id || "CH-1",
        chamberTimezone: chmTimezone,
        patientName: clientName.trim(),
        patientPhone: phone.trim() || undefined,
        service,
        priority: priority === "Urgent" ? "URGENT" : priority === "VIP" ? "VIP" : "STANDARD",
        channel: "WALK_IN",
        idempotencyKey,
      });

      const backendTkt = res.ticket;
      const newItem: QueueItem = {
        id: backendTkt.id,
        ticketNumber: backendTkt.ticketNumber,
        clientName: backendTkt.patientName,
        patientName: backendTkt.patientName,
        clientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        service: backendTkt.service,
        specialist: activeDoctorName,
        counterName: backendTkt.chamberName || activeChm.facilityName || activeChamber,
        checkInTime: backendTkt.checkInTime,
        estWaitMinutes: priority === "Urgent" ? 5 : 20,
        status: "Waiting",
        priority,
        channel,
        notes: backendTkt.notes || "Walk-in OPD patient issued ticket at triage desk.",
        patientId: backendTkt.patientOprId || `#OPD-${backendTkt.serialIndex.toString().padStart(4, "0")}`,
        patientPhone: backendTkt.patientPhone || phone,
        patientAgeGender: "Walk-in Patient",
      };

      setTicketIssued(newItem);
      onAddTicket(newItem);
      setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to issue queue ticket. Please check backend connection.");
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
    <div className="ticket-modal-overlay">
      <div className="ticket-modal-card">
        {/* Header */}
        <div className="ticket-modal-header">
          <div className="ticket-modal-title-group">
            <div className="ticket-modal-icon-badge">
              <Ticket size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="ticket-modal-title">Issue OPD Triage Ticket</h2>
              <span className="ticket-modal-sub">{activeDoctorName} • {activeSpecialty} Desk</span>
            </div>
          </div>
          <button type="button" onClick={handleResetAndClose} className="ticket-modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {ticketIssued ? (
          /* Issued Ticket Voucher */
          <div className="ticket-success-view">
            <div className="ticket-print-box">
              <div className="ticket-print-header">
                <span className="brand-global">GLOBAL </span>
                <span className="brand-booking">BOOKING</span>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {activeDoctorName} • {activeSpecialty} OPD
                </div>
              </div>

              <div className="ticket-number-big">{ticketIssued.ticketNumber}</div>

              <div className="ticket-details-grid">
                <div>
                  <span className="t-label">Patient:</span>
                  <span className="t-val">{ticketIssued.clientName}</span>
                </div>
                <div>
                  <span className="t-label">Service:</span>
                  <span className="t-val">{ticketIssued.service}</span>
                </div>
                <div>
                  <span className="t-label">Chamber Room:</span>
                  <span className="t-val">{ticketIssued.counterName}</span>
                </div>
                <div>
                  <span className="t-label">Est. Wait:</span>
                  <span className="t-val font-bold text-gold">~{ticketIssued.estWaitMinutes} mins</span>
                </div>
              </div>

              <div className="ticket-print-footer">
                <span>Please watch the Waiting Room TV display for your token number.</span>
              </div>
            </div>

            <div className="ticket-success-actions">
              <button
                type="button"
                className="btn-print-slip"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                <span>Print Ticket Slip</span>
              </button>
              <button
                type="button"
                className="btn-done-ticket"
                onClick={handleResetAndClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleGenerate} className="ticket-modal-form">
            <div className="form-next-indicator">
              <span>Allocated Next Token:</span>
              <span className="next-num-tag">{nextTicketNumber}</span>
            </div>

            <div className="form-group-field">
              <label className="field-label">Patient Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Al Mansoori"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="field-input-text"
              />
            </div>

            <div className="form-group-field">
              <label className="field-label">Mobile Number</label>
              <input
                type="tel"
                placeholder="+971 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field-input-text"
              />
            </div>

            <div className="form-group-field">
              <label className="field-label">Cardiology Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="field-select-box"
              >
                {CARDIOLOGY_SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group-field">
              <label className="field-label">Chamber Location</label>
              <select
                value={selectedChamberId}
                onChange={(e) => setSelectedChamberId(e.target.value)}
                className="field-select-box"
              >
                {resolvedChambers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.facilityName || s.name || "Chamber"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row-dual">
              <div className="form-group-field">
                <label className="field-label">Clinical Triage Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="field-select-box"
                >
                  <option value="Standard">Standard Triage</option>
                  <option value="Urgent">Urgent (Chest Pain / High BP)</option>
                  <option value="VIP">VIP Executive Patient</option>
                </select>
              </div>

              <div className="form-group-field">
                <label className="field-label">Triage Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as CheckInChannel)}
                  className="field-select-box"
                >
                  <option value="QR Walk-In">QR Walk-In Desk</option>
                  <option value="Kiosk Check-In">Self-Check-In Kiosk</option>
                  <option value="Online Booking">Scheduled Web Booking</option>
                </select>
              </div>
            </div>

            <div className="ticket-modal-footer">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="btn-cancel-modal"
              >
                Cancel
              </button>
              <button type="submit" className="btn-confirm-ticket">
                Generate & Issue OPD Token
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
