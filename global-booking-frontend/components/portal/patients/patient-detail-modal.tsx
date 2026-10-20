"use client";

import { X, User, Mail, Phone, Calendar, HeartPulse, Shield, AlertTriangle, Activity, FileText, CheckCircle2, Clock, Printer } from "lucide-react";
import Image from "next/image";
import { Patient } from "@/types/patient";

interface PatientDetailModalProps {
  patient: Patient | null;
  onClose: () => void;
  onBookAppointment: (patient: Patient) => void;
}

export function PatientDetailModal({ patient, onClose, onBookAppointment }: PatientDetailModalProps) {
  if (!patient) return null;

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-card patient-chart-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="patient-detail-avatar-box">
              <Image
                src={patient.avatar || "/avatars/alex-johnson.jpg"}
                alt={patient.name}
                width={48}
                height={48}
                className="patient-detail-avatar-img"
              />
              <span className={`patient-chart-status-dot status-${patient.status.toLowerCase().replace(/\s+/g, "-")}`} />
            </div>
            <div>
              <div className="patient-chart-header-row">
                <h2 className="modal-heading" style={{ fontSize: 19 }}>{patient.name}</h2>
                <span className="patient-mrn-badge">{patient.mrn}</span>
                <span className={`portal-badge badge-${patient.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {patient.status}
                </span>
              </div>
              <p className="modal-subheading">
                {patient.gender} • {patient.age} yrs • DOB: {patient.dob} • Blood: <strong className="text-gold">{patient.bloodGroup}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="patient-chart-body" style={{ maxHeight: "72vh", overflowY: "auto", padding: "18px 24px" }}>
          {/* Vitals Summary Strip */}
          {patient.vitals && (
            <div className="patient-vitals-strip">
              <div className="vital-item">
                <div className="vital-icon-wrap">
                  <Activity size={14} className="text-gold" />
                </div>
                <div className="vital-data">
                  <span className="vital-label">Blood Pressure</span>
                  <span className="vital-val">{patient.vitals.bloodPressure || "120/80"}</span>
                </div>
              </div>

              <div className="vital-item">
                <div className="vital-icon-wrap">
                  <HeartPulse size={14} className="text-cyan" />
                </div>
                <div className="vital-data">
                  <span className="vital-label">Heart Rate</span>
                  <span className="vital-val">{patient.vitals.heartRate || 72} bpm</span>
                </div>
              </div>

              <div className="vital-item">
                <div className="vital-icon-wrap">
                  <Clock size={14} className="text-green" />
                </div>
                <div className="vital-data">
                  <span className="vital-label">Temperature</span>
                  <span className="vital-val">{patient.vitals.temperature || "36.7 °C"}</span>
                </div>
              </div>

              <div className="vital-item">
                <div className="vital-icon-wrap">
                  <Shield size={14} className="text-gold" />
                </div>
                <div className="vital-data">
                  <span className="vital-label">Blood Sugar</span>
                  <span className="vital-val">{patient.vitals.bloodSugar || "95 mg/dL"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Contact & Primary Care Team */}
          <div className="patient-chart-two-col">
            {/* Left Col: Contact & Insurance */}
            <div className="patient-chart-card">
              <h3 className="patient-section-title">
                <Mail size={14} className="text-gold" />
                <span>Contact & Coverage</span>
              </h3>
              <div className="patient-data-list">
                <div className="patient-data-row">
                  <span className="data-key">Phone:</span>
                  <span className="data-val">{patient.phone}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Email:</span>
                  <span className="data-val">{patient.email}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Insurance:</span>
                  <span className="data-val text-gold">{patient.insuranceProvider || "Direct Billing / None"}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Member Since:</span>
                  <span className="data-val">{patient.registeredDate}</span>
                </div>
              </div>
            </div>

            {/* Right Col: Primary Care & Visits */}
            <div className="patient-chart-card">
              <h3 className="patient-section-title">
                <HeartPulse size={14} className="text-gold" />
                <span>Clinical Team & Visits</span>
              </h3>
              <div className="patient-data-list">
                <div className="patient-data-row">
                  <span className="data-key">Primary Doctor:</span>
                  <span className="data-val font-semibold text-white">{patient.primaryDoctor}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Department:</span>
                  <span className="data-val">{patient.department}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Last Visit:</span>
                  <span className="data-val">{patient.lastVisit}</span>
                </div>
                <div className="patient-data-row">
                  <span className="data-key">Next Booking:</span>
                  <span className="data-val text-green font-medium">
                    {patient.nextAppointment || "None scheduled"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="patient-chart-card" style={{ marginTop: 12 }}>
            <h3 className="patient-section-title">
              <Shield size={14} className="text-gold" />
              <span>Emergency Contact</span>
            </h3>
            <div className="emergency-contact-box">
              <span className="font-semibold text-white">{patient.emergencyContact.name}</span>
              <span className="text-muted">({patient.emergencyContact.relation})</span>
              <span className="emergency-phone">{patient.emergencyContact.phone}</span>
            </div>
          </div>

          {/* Allergies & Conditions */}
          <div className="patient-chart-card" style={{ marginTop: 12 }}>
            <h3 className="patient-section-title">
              <AlertTriangle size={14} className="text-gold" />
              <span>Allergies & Medical Alerts</span>
            </h3>
            <div className="allergies-pill-wrap">
              {patient.allergies && patient.allergies.length > 0 ? (
                patient.allergies.map((all) => (
                  <span key={all} className="allergy-tag">
                    ⚠️ {all}
                  </span>
                ))
              ) : (
                <span className="text-muted text-sm">No documented drug or environmental allergies.</span>
              )}
            </div>

            {patient.chronicConditions && patient.chronicConditions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <span className="data-key" style={{ display: "block", marginBottom: 6 }}>Chronic Conditions:</span>
                <div className="conditions-pill-wrap">
                  {patient.chronicConditions.map((cond) => (
                    <span key={cond} className="condition-tag">
                      • {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div className="patient-chart-card" style={{ marginTop: 12 }}>
            <h3 className="patient-section-title">
              <FileText size={14} className="text-gold" />
              <span>Clinical Intake & Doctor Notes</span>
            </h3>
            <p className="clinical-notes-quote">{patient.notes || "No clinical remarks recorded."}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-actions-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px" }}>
          <button
            type="button"
            className="secondary-action-button"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print Chart</span>
          </button>
          <button
            type="button"
            className="primary-gold-button"
            onClick={() => {
              onBookAppointment(patient);
              onClose();
            }}
          >
            <Calendar size={15} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
