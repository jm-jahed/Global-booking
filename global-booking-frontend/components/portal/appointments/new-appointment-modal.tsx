"use client";

import { useState } from "react";
import { X, Calendar, Clock, User, Stethoscope, MapPin, FileText, Phone, Activity } from "lucide-react";
import { DoctorAppointment, getNextDailySerialNumber } from "@/lib/services/doctor-appointments-service";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: (appointment: DoctorAppointment) => void;
  doctorName?: string;
  chamberLocation?: string;
  doctorSpecialty?: string;
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  onAddAppointment,
  doctorName,
  chamberLocation,
  doctorSpecialty,
}: NewAppointmentModalProps) {
  const { t } = useTranslation("appointments");
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
    "Clinical Consultation";

  const clinicalServices = [
    { name: `${activeSpecialty} Consultation & Assessment`, category: activeSpecialty, price: "500", duration: "30 min" },
    { name: `${activeSpecialty} Follow-up Review`, category: activeSpecialty, price: "450", duration: "30 min" },
    { name: `Comprehensive Health Screening & Diagnostic Evaluation`, category: activeSpecialty, price: "600", duration: "45 min" },
    { name: `Prescription & Clinical Care Management`, category: activeSpecialty, price: "400", duration: "20 min" },
  ];

  const chamberLocations = [
    activeChamber,
    "Telehealth Video Consultation",
  ];

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAgeGender, setPatientAgeGender] = useState("45 Yrs, Male");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [selectedService, setSelectedService] = useState(clinicalServices[0].name);
  const [selectedChamber, setSelectedChamber] = useState(chamberLocations[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("11:00 AM");
  const [channel, setChannel] = useState<"In-Person Chamber" | "Phone Booking">("In-Person Chamber");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    const serv = clinicalServices.find((s) => s.name === selectedService) || clinicalServices[0];
    const randId = `GB-DOC-${Math.floor(100 + Math.random() * 900)}`;
    const randToken = getNextDailySerialNumber();

    const newAppointment: DoctorAppointment = {
      id: randId,
      referenceNumber: randId,
      serialNumber: randToken,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || "+1 555 000 0000",
      patientEmail: patientEmail.trim() || undefined,
      patientAgeGender: patientAgeGender.trim() || "Adult Patient",
      bloodGroup: bloodGroup.trim() || "O+",
      service: serv.name,
      serviceCategory: serv.category,
      doctorName: activeDoctorName,
      doctorSpecialty: activeSpecialty,
      chamberLocation: selectedChamber,
      date,
      time,
      duration: serv.duration,
      status: "Confirmed",
      channel,
      paymentStatus: "Paid",
      price: serv.price,
      notes: notes.trim() || "Clinical consultation scheduled via doctor desk.",
      createdAt: new Date().toISOString(),
    };

    onAddAppointment(newAppointment);
    onClose();
    // Reset form
    setPatientName("");
    setPatientPhone("");
    setPatientEmail("");
    setNotes("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        className="new-appointment-modal-card"
        style={{
          background: "#0c1527",
          border: "1px solid rgba(229, 184, 105, 0.35)",
          borderRadius: 18,
          width: "100%",
          maxWidth: 580,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, rgba(229, 184, 105, 0.1) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(229, 184, 105, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                {t("bookPatientConsultation", undefined, "Book Doctor Patient Consultation")}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                {activeDoctorName} • {activeChamber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Patient Details */}
          <div className="appointment-form-grid-2" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("fullNameRequired", undefined, "Patient Full Name *")}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Al Mansoori"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("mobileNumberRequired", undefined, "Mobile Number *")}
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +1 555 123 4567"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div className="appointment-form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("ageGender", undefined, "Age & Gender")}
              </label>
              <input
                type="text"
                placeholder="e.g. 52 Yrs, Male"
                value={patientAgeGender}
                onChange={(e) => setPatientAgeGender(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("bloodGroup", undefined, "Blood Group")}
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              >
                {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("consultationChannel", undefined, "Booking Channel")}
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              >
                <option value="In-Person Chamber">{t("inPersonChamber", undefined, "In-Person Chamber")}</option>
                <option value="Phone Booking">{t("phoneBooking", undefined, "Phone Booking (Reception)")}</option>
              </select>
            </div>
          </div>

          {/* Cardiology Service Selection */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
              {t("selectService", undefined, "Clinical Cardiology Service")}
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                width: "100%",
                height: 38,
                background: "#080e1b",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "0 12px",
                color: "#ffffff",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            >
              {clinicalServices.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.price} • {s.duration})
                </option>
              ))}
            </select>
          </div>

          {/* Chamber Location */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
              {t("selectChamberBranch", undefined, "Visiting Location / Chamber Room")}
            </label>
            <select
              value={selectedChamber}
              onChange={(e) => setSelectedChamber(e.target.value)}
              style={{
                width: "100%",
                height: 38,
                background: "#080e1b",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "0 12px",
                color: "#ffffff",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            >
              {chamberLocations.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Schedule Date & Time */}
          <div className="appointment-form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {tCommon("date", undefined, "Consultation Date")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
                {t("appointmentTime", undefined, "Time Slot")}
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:30 AM"
                style={{
                  width: "100%",
                  height: 38,
                  background: "#080e1b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "0 12px",
                  color: "#ffffff",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 5 }}>
              {t("clinicalNotesSymptoms", undefined, "Patient Symptoms & Clinical Notes")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Previous stent placed in 2023, regular follow-up required..."
              style={{
                width: "100%",
                background: "#080e1b",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: 12.5,
                boxSizing: "border-box",
                resize: "none",
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tCommon("cancel", undefined, "Cancel")}
            </button>
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                border: "none",
                color: "#070c17",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(229, 184, 105, 0.3)",
              }}
            >
              {t("confirmIssueSlot", undefined, "Confirm Patient Booking")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
