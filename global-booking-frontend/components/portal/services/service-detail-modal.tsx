"use client";

import { X, Clock, Shield, Star, DollarSign, Stethoscope, MapPin, CheckCircle2, Calendar, FileText, Tag, User, AlertCircle } from "lucide-react";
import Image from "next/image";
import { ClinicalService } from "@/types/service";

interface ServiceDetailModalProps {
  service: ClinicalService | null;
  onClose: () => void;
  onBookService: (service: ClinicalService) => void;
}

export function ServiceDetailModal({ service, onClose, onBookService }: ServiceDetailModalProps) {
  if (!service) return null;

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog-card patient-chart-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="hero-icon-calendar" style={{ width: 42, height: 42 }}>
              <Stethoscope size={20} className="text-gold" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 className="modal-heading" style={{ fontSize: 18 }}>{service.name}</h2>
                <span className="patient-mrn-badge">{service.code}</span>
                <span className="service-category-pill">{service.category}</span>
              </div>
              <p className="modal-subheading">
                Location: {service.room} • Code: <strong>{service.id}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="patient-chart-body" style={{ maxHeight: "72vh", overflowY: "auto", padding: "18px 24px" }}>
          {/* Key Metrics Banner */}
          <div className="service-modal-kpi-strip">
            <div className="service-kpi-item">
              <span className="kpi-micro-label">Pricing</span>
              <span className="kpi-value-gold">AED {service.priceAED.toLocaleString()}</span>
              <span className="kpi-sub-text">≈ ${service.priceUSD} USD</span>
            </div>

            <div className="service-kpi-item">
              <span className="kpi-micro-label">Standard Duration</span>
              <span className="kpi-value-white">{service.durationMinutes} mins</span>
              <span className="kpi-sub-text">Dedicated Slot</span>
            </div>

            <div className="service-kpi-item">
              <span className="kpi-micro-label">Insurance Coverage</span>
              <span className={service.insuranceCovered ? "kpi-value-green" : "kpi-value-muted"}>
                {service.insuranceCovered ? `Covered (${service.coPayPercentage ?? 10}% Co-Pay)` : "Self-Pay Only"}
              </span>
              <span className="kpi-sub-text">
                {service.insuranceCovered ? "Direct Billing Active" : "Private Tariff"}
              </span>
            </div>

            <div className="service-kpi-item">
              <span className="kpi-micro-label">Satisfaction & Bookings</span>
              <span className="kpi-value-white" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={13} fill="#e5b869" color="#e5b869" />
                <span>{service.rating} / 5.0</span>
              </span>
              <span className="kpi-sub-text">{service.bookingsCount} Completed</span>
            </div>
          </div>

          {/* Description */}
          <div className="patient-chart-card" style={{ marginTop: 14 }}>
            <h3 className="patient-section-title">
              <FileText size={14} className="text-gold" />
              <span>Clinical Scope & Overview</span>
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1" }}>
              {service.description}
            </p>
          </div>

          {/* Assigned Specialist Card */}
          <div className="patient-chart-card" style={{ marginTop: 14 }}>
            <h3 className="patient-section-title">
              <User size={14} className="text-gold" />
              <span>Lead Specialist / Department Head</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(229,184,105,0.4)",
                  overflow: "hidden",
                  position: "relative",
                  background: "#0c1424",
                }}
              >
                <Image
                  src={service.specialistAvatar}
                  alt={service.primarySpecialist}
                  width={44}
                  height={44}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                  {service.primarySpecialist}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8e9fb5" }}>
                  {service.specialistRole}
                </p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#e5b869" }}>
                <MapPin size={13} />
                <span>{service.room}</span>
              </div>
            </div>
          </div>

          {/* Preparation Instructions */}
          <div className="patient-chart-card" style={{ marginTop: 14 }}>
            <h3 className="patient-section-title">
              <AlertCircle size={14} className="text-gold" />
              <span>Patient Preparation Protocol</span>
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {service.prepInstructions.map((instruction, idx) => (
                <li key={idx} style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                  {instruction}
                </li>
              ))}
            </ul>
          </div>

          {/* Search Tags */}
          {service.tags && service.tags.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <span className="data-key" style={{ display: "block", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>
                Search & Categorization Tags:
              </span>
              <div className="allergies-pill-wrap">
                {service.tags.map((tag) => (
                  <span key={tag} className="service-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-actions-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px" }}>
          <button type="button" className="secondary-action-button" onClick={onClose}>
            <span>Close</span>
          </button>
          <button
            type="button"
            className="primary-gold-button"
            onClick={() => {
              onBookService(service);
              onClose();
            }}
          >
            <Calendar size={15} />
            <span>Book Appointment for This Service</span>
          </button>
        </div>
      </div>
    </div>
  );
}
