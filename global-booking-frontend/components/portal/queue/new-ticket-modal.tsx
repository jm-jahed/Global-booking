"use client";

import { useState } from "react";
import { X, Ticket, User, Stethoscope, AlertTriangle, Printer, QrCode } from "lucide-react";
import { QueueItem, PriorityLevel, CheckInChannel } from "@/types/queue";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicket: (item: QueueItem) => void;
  nextTicketNumber: string;
}

const SERVICES = [
  "General Consultation",
  "Dental Checkup",
  "Skin Care Treatment",
  "Physiotherapy",
  "Hair Treatment",
  "Cardiology Review",
];

const SPECIALISTS = [
  { name: "Dr. Sarah Khan", station: "Station 1 (Suite 302)" },
  { name: "Dr. James Wilson", station: "Station 2 (Dental 2B)" },
  { name: "Dr. Emily Davis", station: "Station 3 (Aesthetics 4)" },
  { name: "Dr. Michael Brown", station: "Station 4 (Rehab 1)" },
  { name: "Sarah Johnson", station: "Station 5 (Styling Bay)" },
];

export function NewTicketModal({
  isOpen,
  onClose,
  onAddTicket,
  nextTicketNumber,
}: NewTicketModalProps) {
  const [clientName, setClientName] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [specialist, setSpecialist] = useState(SPECIALISTS[0].name);
  const [priority, setPriority] = useState<PriorityLevel>("Standard");
  const [channel, setChannel] = useState<CheckInChannel>("QR Walk-In");
  const [ticketIssued, setTicketIssued] = useState<QueueItem | null>(null);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const matchedStation = SPECIALISTS.find((s) => s.name === specialist)?.station || "Station 1";
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      ticketNumber: nextTicketNumber,
      clientName,
      clientAvatar: "/avatars/alex-johnson.jpg",
      service,
      specialist,
      counterName: matchedStation,
      checkInTime: timeStr,
      estWaitMinutes: priority === "Urgent" ? 5 : 25,
      status: "Waiting",
      priority,
      channel,
      notes: "Issued via Queue Controller.",
    };

    onAddTicket(newItem);
    setTicketIssued(newItem);
  };

  const handleClose = () => {
    setTicketIssued(null);
    setClientName("");
    onClose();
  };

  return (
    <div className="modal-backdrop-overlay" onClick={handleClose}>
      <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Ticket size={18} className="text-gold" />
            </div>
            <div>
              <h2 className="modal-heading">Issue Queue Ticket</h2>
              <p className="modal-subheading">Generate instant serial for walk-in or kiosk patient.</p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {ticketIssued ? (
          <div className="ticket-success-view">
            <div className="digital-ticket-pass">
              <div className="pass-header">
                <span className="pass-brand">GLOBAL BOOKING</span>
                <span className="pass-badge">LIVE PASS</span>
              </div>
              <div className="pass-serial">{ticketIssued.ticketNumber}</div>
              <div className="pass-meta">
                <span className="pass-client">{ticketIssued.clientName}</span>
                <span className="pass-service">{ticketIssued.service}</span>
                <span className="pass-station">{ticketIssued.counterName}</span>
                <span className="pass-time">Issued: {ticketIssued.checkInTime}</span>
              </div>
              <div className="pass-footer">
                <QrCode size={48} className="pass-qr" />
                <span className="pass-hint">Please watch the TV display for your serial call-out.</span>
              </div>
            </div>

            <div className="ticket-success-actions">
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                <span>Print Ticket Slip</span>
              </button>
              <button
                type="button"
                className="primary-gold-button"
                onClick={handleClose}
              >
                Done & Return to Queue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="modal-form-content">
            <div className="modal-grid-two">
              {/* Ticket Code (Read Only Preview) */}
              <div className="modal-field">
                <label className="modal-label">Next Ticket Serial</label>
                <input
                  type="text"
                  readOnly
                  value={nextTicketNumber}
                  className="modal-input modal-input-plain text-gold font-bold"
                />
              </div>

              {/* Priority */}
              <div className="modal-field">
                <label className="modal-label">Priority Tier</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="modal-select modal-input-plain"
                >
                  <option value="Standard">Standard</option>
                  <option value="VIP">VIP Priority</option>
                  <option value="Urgent">Urgent / Medical Priority</option>
                </select>
              </div>
            </div>

            {/* Patient Name */}
            <div className="modal-field">
              <label className="modal-label">Patient Name *</label>
              <div className="modal-input-wrap">
                <User size={15} className="modal-input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Reed"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="modal-grid-two">
              {/* Service */}
              <div className="modal-field">
                <label className="modal-label">Service *</label>
                <div className="modal-input-wrap">
                  <Stethoscope size={15} className="modal-input-icon" />
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="modal-select"
                  >
                    {SERVICES.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Specialist */}
              <div className="modal-field">
                <label className="modal-label">Assigned Specialist & Station</label>
                <select
                  value={specialist}
                  onChange={(e) => setSpecialist(e.target.value)}
                  className="modal-select modal-input-plain"
                >
                  {SPECIALISTS.map((sp) => (
                    <option key={sp.name} value={sp.name}>
                      {sp.name} — {sp.station}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Check-In Channel */}
            <div className="modal-field">
              <label className="modal-label">Check-In Method</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as CheckInChannel)}
                className="modal-select modal-input-plain"
              >
                <option value="QR Walk-In">QR Walk-In (Phone scanned)</option>
                <option value="Kiosk Check-In">Front Desk Reception Kiosk</option>
                <option value="Online Booking">Scheduled Booking Arrival</option>
              </select>
            </div>

            {/* Footer */}
            <div className="modal-actions-footer">
              <button type="button" className="button-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="button-save-appointment">
                Issue & Print Ticket
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
