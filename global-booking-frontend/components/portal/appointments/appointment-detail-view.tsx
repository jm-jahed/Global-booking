"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  User,
  ShieldCheck,
  Stethoscope,
  MapPin,
  ExternalLink,
  Download,
  Send,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { Appointment } from "@/types/appointment";
import { ROUTES } from "@/config/routes";

interface AppointmentDetailViewProps {
  appointment: Appointment;
}

export function AppointmentDetailView({ appointment: initialAppointment }: AppointmentDetailViewProps) {
  const [appointment, setAppointment] = useState<Appointment>(initialAppointment);
  const [internalNote, setInternalNote] = useState(
    "Patient reported slight pollen sensitivity. Blood panel results normal. Advised hydration."
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCheckIn = () => {
    setAppointment({ ...appointment, status: "In Progress" });
    showToast("Patient checked in. Session marked In Progress.");
  };

  const handleComplete = () => {
    setAppointment({ ...appointment, status: "Completed" });
    showToast("Appointment marked as Completed.");
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      setAppointment({ ...appointment, status: "Cancelled" });
      showToast("Appointment cancelled.");
    }
  };

  return (
    <div className="dashboard-page-container appointment-detail-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <nav className="detail-breadcrumb-bar" aria-label="Breadcrumb">
        <Link href={ROUTES.appointments} className="breadcrumb-back-link">
          <ArrowLeft size={15} />
          <span>Back to Appointments</span>
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Appointment #{appointment.referenceNumber}</span>
      </nav>

      {/* Main Top Header Banner */}
      <section className="detail-header-panel">
        <div className="detail-header-left">
          <div className="detail-avatar-box">
            <Image
              src={appointment.clientAvatar}
              alt={appointment.clientName}
              width={54}
              height={54}
              className="detail-avatar-img"
            />
          </div>
          <div className="detail-header-meta">
            <div className="detail-title-line">
              <h1 className="detail-client-name">{appointment.clientName}</h1>
              <span className="detail-ref-badge">{appointment.referenceNumber}</span>
              <span
                className={`status-pill ${
                  appointment.status === "Confirmed"
                    ? "status-confirmed"
                    : appointment.status === "Pending"
                    ? "status-pending"
                    : appointment.status === "In Progress"
                    ? "status-inprogress"
                    : appointment.status === "Completed"
                    ? "status-completed"
                    : "status-cancelled"
                }`}
              >
                {appointment.status === "Pending" && <span className="status-dot-amber" />}
                {appointment.status === "In Progress" && <span className="status-dot-cyan" />}
                {appointment.status}
              </span>
            </div>
            <p className="detail-service-lead">
              {appointment.service} • Assigned to <strong>{appointment.staffName}</strong>
            </p>
          </div>
        </div>

        <div className="detail-header-actions">
          {appointment.status !== "Completed" && appointment.status !== "In Progress" && (
            <button
              type="button"
              className="primary-gold-button"
              onClick={handleCheckIn}
            >
              <CheckCircle2 size={16} />
              <span>Check-in Patient</span>
            </button>
          )}

          {appointment.status === "In Progress" && (
            <button
              type="button"
              className="primary-gold-button"
              onClick={handleComplete}
            >
              <Check size={16} />
              <span>Complete Session</span>
            </button>
          )}

          <button
            type="button"
            className="secondary-action-button"
            onClick={() => showToast("SMS & Email notification reminder re-sent.")}
          >
            <Send size={14} />
            <span>Send Reminder</span>
          </button>

          <button
            type="button"
            className="secondary-action-button"
            onClick={() => window.print()}
            title="Print appointment summary"
          >
            <Printer size={15} />
          </button>

          {appointment.status !== "Cancelled" && (
            <button
              type="button"
              className="secondary-action-button danger-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* Two Column Grid */}
      <section className="detail-content-grid">
        {/* Left Column (65% width) */}
        <div className="detail-left-column">
          {/* Card 1: Appointment Session Details */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <div className="live-header-title-box">
                <CalendarDays size={18} className="text-gold" />
                <h2 className="panel-title">Session Schedule & Logistics</h2>
              </div>
              {appointment.serialNumber && (
                <span className="queue-serial-badge">
                  Queue Serial {appointment.serialNumber}
                </span>
              )}
            </div>

            <div className="detail-logistics-grid">
              <div className="logistic-stat-item">
                <span className="logistic-label">Date & Time</span>
                <span className="logistic-val-strong">
                  {appointment.date} ({appointment.time} – {appointment.endTime})
                </span>
              </div>

              <div className="logistic-stat-item">
                <span className="logistic-label">Duration</span>
                <span className="logistic-val-strong">{appointment.durationMinutes} Minutes</span>
              </div>

              <div className="logistic-stat-item">
                <span className="logistic-label">Channel / Mode</span>
                <span className="logistic-val-strong">{appointment.type}</span>
              </div>

              <div className="logistic-stat-item">
                <span className="logistic-label">Location / Room</span>
                <span className="logistic-val-strong">{appointment.roomOrLink || "Suite 302"}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="detail-notes-box">
                <span className="notes-box-title">Patient Booking Notes:</span>
                <p className="notes-box-text">&ldquo;{appointment.notes}&rdquo;</p>
              </div>
            )}
          </article>

          {/* Card 2: Patient Contact & Profile */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <div className="live-header-title-box">
                <User size={18} className="text-gold" />
                <h2 className="panel-title">Patient Information</h2>
              </div>
              <span className="client-loyalty-badge">Registered Patient (8 Visits)</span>
            </div>

            <div className="detail-client-info-grid">
              <div className="client-contact-item">
                <div className="contact-icon-box">
                  <Mail size={16} className="text-muted" />
                </div>
                <div>
                  <span className="contact-label">Email Address</span>
                  <a href={`mailto:${appointment.clientEmail}`} className="contact-link">
                    {appointment.clientEmail}
                  </a>
                </div>
              </div>

              <div className="client-contact-item">
                <div className="contact-icon-box">
                  <Phone size={16} className="text-muted" />
                </div>
                <div>
                  <span className="contact-label">Phone Number</span>
                  <a href={`tel:${appointment.clientPhone}`} className="contact-link">
                    {appointment.clientPhone}
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Card 3: Activity & Audit Trail */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <div className="live-header-title-box">
                <Clock size={18} className="text-gold" />
                <h2 className="panel-title">Booking Timeline & Audit Log</h2>
              </div>
            </div>

            <div className="audit-timeline-list">
              <div className="timeline-event-item">
                <div className="timeline-event-bullet active-bullet" />
                <div className="timeline-event-body">
                  <div className="timeline-event-header">
                    <span className="event-title">Appointment Confirmed</span>
                    <span className="event-timestamp">Apr 15, 2025 • 09:15 AM</span>
                  </div>
                  <p className="event-desc">
                    Booking confirmed by reception. Room Suite 302 assigned.
                  </p>
                </div>
              </div>

              <div className="timeline-event-item">
                <div className="timeline-event-bullet active-bullet" />
                <div className="timeline-event-body">
                  <div className="timeline-event-header">
                    <span className="event-title">SMS & Email Reminder Sent</span>
                    <span className="event-timestamp">Apr 14, 2025 • 05:00 PM</span>
                  </div>
                  <p className="event-desc">
                    Automated 24-hour reminder successfully delivered to {appointment.clientPhone}.
                  </p>
                </div>
              </div>

              <div className="timeline-event-item">
                <div className="timeline-event-bullet active-bullet" />
                <div className="timeline-event-body">
                  <div className="timeline-event-header">
                    <span className="event-title">Booking Created</span>
                    <span className="event-timestamp">Apr 12, 2025 • 11:32 AM</span>
                  </div>
                  <p className="event-desc">
                    Initial appointment reservation created via Global Booking portal.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Right Column (35% width) */}
        <div className="detail-right-column">
          {/* Card 1: Assigned Specialist */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <div className="live-header-title-box">
                <Stethoscope size={18} className="text-gold" />
                <h2 className="panel-title">Assigned Specialist</h2>
              </div>
            </div>

            <div className="specialist-profile-card">
              <div className="specialist-avatar-wrap">
                <Image
                  src={appointment.staffAvatar}
                  alt={appointment.staffName}
                  width={56}
                  height={56}
                  className="specialist-avatar-img"
                />
              </div>
              <h3 className="specialist-name">{appointment.staffName}</h3>
              <p className="specialist-role">{appointment.staffRole}</p>
              <span className="specialist-dept">{appointment.serviceCategory}</span>
            </div>
          </article>

          {/* Card 2: Billing & Invoice Summary */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <h2 className="panel-title">Payment & Invoicing</h2>
              <span
                className={`payment-indicator ${appointment.paymentStatus
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {appointment.paymentStatus}
              </span>
            </div>

            <div className="billing-breakdown-list">
              <div className="billing-row">
                <span className="billing-item-name">{appointment.service}</span>
                <span className="billing-item-price">${appointment.price.toFixed(2)}</span>
              </div>
              <div className="billing-row">
                <span className="billing-item-name">Booking & Processing Fee</span>
                <span className="billing-item-price">$0.00</span>
              </div>
              <div className="billing-divider" />
              <div className="billing-row total-row">
                <span className="total-label">Total Amount</span>
                <span className="total-amount">${appointment.price.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              className="download-receipt-button"
              onClick={() => showToast("Invoice receipt PDF generated.")}
            >
              <Download size={14} />
              <span>Download Invoice (PDF)</span>
            </button>
          </article>

          {/* Card 3: Internal Clinical Notes */}
          <article className="dashboard-panel detail-card">
            <div className="panel-header-row">
              <h2 className="panel-title">Internal Staff Notes</h2>
            </div>
            <p className="internal-notes-sub">
              Confidential notes visible only to authorized internal staff and specialists.
            </p>
            <textarea
              rows={4}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              className="internal-notes-textarea"
            />
            <button
              type="button"
              className="primary-gold-button save-notes-btn"
              onClick={() => showToast("Internal notes saved successfully.")}
            >
              Save Internal Note
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
