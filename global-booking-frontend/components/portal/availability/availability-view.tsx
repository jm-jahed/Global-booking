"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  CreditCard,
  Building2,
  MapPin,
  Phone,
  Globe,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import {
  getDoctorProfile,
  updateDoctorProfile,
  getStoredPortalUser,
  type DoctorChamberDetail,
  type DoctorProfileRecord,
} from "@/lib/api/admin-client";

interface DaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
  maxPatients: number;
}

const DEFAULT_WEEKLY_SCHEDULE: Record<string, DaySchedule> = {
  Monday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Tuesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Wednesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Thursday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Friday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Saturday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
  Sunday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
};

const DEFAULT_CHAMBER: DoctorChamberDetail = {
  id: "chamber-main",
  facilityName: "Main Consultation Chamber",
  city: "Dubai",
  visitingSchedule: "Daily 05:00 AM – 09:00 PM",
  roomNumber: "Suite 405, 4th Floor",
  contactPhone: "+971 4 435 9999",
  timezone: "Asia/Dubai",
};

export function AvailabilityView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [doctorName, setDoctorName] = useState("Dr Jahedul Islam");
  const [doctorSpecialty, setDoctorSpecialty] = useState("Cardiologist & Electrophysiologist");
  const [doctorSlug, setDoctorSlug] = useState("dr-jahedul-islam");

  // Section 8 State: Consultation Fee & Chamber Locations
  const [consultationFeeAed, setConsultationFeeAed] = useState<number>(500);
  const [chamberSummary, setChamberSummary] = useState<string>("Mediclinic City Hospital, Dubai Healthcare City");
  const [chambers, setChambers] = useState<DoctorChamberDetail[]>([DEFAULT_CHAMBER]);
  const [selectedChamberId, setSelectedChamberId] = useState<string>("chamber-main");

  // Weekly Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DaySchedule>>(DEFAULT_WEEKLY_SCHEDULE);

  // Load from MongoDB / Portal Profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const stored = getStoredPortalUser();
      if (stored) {
        if (stored.fullName) setDoctorName(stored.fullName);
        if (stored.specialty) setDoctorSpecialty(stored.specialty);
        if (stored.slug) setDoctorSlug(stored.slug);
      }

      const res = await getDoctorProfile();
      if (res && res.doctor) {
        const doc: DoctorProfileRecord = res.doctor;
        if (doc.fullName) setDoctorName(doc.fullName);
        if (doc.specialty) setDoctorSpecialty(doc.specialty);
        if (doc.slug) setDoctorSlug(doc.slug);
        if (doc.chamberLocationsSummary) setChamberSummary(doc.chamberLocationsSummary);

        const feeInFils = doc.consultationFee?.amountInFils;
        if (typeof feeInFils === "number" && !Number.isNaN(feeInFils)) {
          setConsultationFeeAed(feeInFils / 100);
        }

        if (Array.isArray(doc.chambers) && doc.chambers.length > 0) {
          setChambers(doc.chambers);
          setSelectedChamberId(doc.chambers[0].id || "chamber-0");
        } else {
          setChambers([DEFAULT_CHAMBER]);
          setSelectedChamberId(DEFAULT_CHAMBER.id);
        }
      }
    } catch {
      setChambers([DEFAULT_CHAMBER]);
      setSelectedChamberId(DEFAULT_CHAMBER.id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Active / Selected Chamber
  const activeIndex = Math.max(
    0,
    chambers.findIndex((c, idx) => (c.id ? c.id === selectedChamberId : idx.toString() === selectedChamberId))
  );
  const activeChamber = chambers[activeIndex] || DEFAULT_CHAMBER;

  // Add Chamber Handler
  const handleAddChamber = () => {
    const newId = `chamber-${Date.now()}`;
    const newChamber: DoctorChamberDetail = {
      id: newId,
      facilityName: `Consultation Chamber #${chambers.length + 1}`,
      city: "Dubai",
      visitingSchedule: "Mon - Fri: 09:00 AM – 05:00 PM",
      roomNumber: "Room 101",
      contactPhone: "+971 4 435 9999",
      timezone: "Asia/Dubai",
    };
    const updated = [...chambers, newChamber];
    setChambers(updated);
    setSelectedChamberId(newId);
  };

  // Remove Chamber Handler
  const handleRemoveChamber = (idx: number) => {
    if (chambers.length <= 1) {
      alert("At least one consultation chamber location is required for patient booking.");
      return;
    }
    const updated = chambers.filter((_, i) => i !== idx);
    setChambers(updated);
    const nextActive = updated[0];
    if (nextActive) {
      setSelectedChamberId(nextActive.id || "chamber-0");
    }
  };

  // Update Field on Active Chamber
  const handleUpdateActiveChamber = (field: keyof DoctorChamberDetail, value: string) => {
    setChambers((prev) => {
      const copy = [...prev];
      if (copy[activeIndex]) {
        copy[activeIndex] = { ...copy[activeIndex], [field]: value };
      }
      return copy;
    });
  };

  // Preset Schedule Handlers
  const handleApplyPreset = (presetType: "daily" | "weekdays" | "split") => {
    if (presetType === "daily") {
      setWeeklySchedule({
        Monday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Tuesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Wednesday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Thursday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Friday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Saturday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
        Sunday: { isOpen: true, start: "05:00 AM", end: "09:00 PM", maxPatients: 45 },
      });
      handleUpdateActiveChamber("visitingSchedule", "Daily 05:00 AM – 09:00 PM");
    } else if (presetType === "weekdays") {
      setWeeklySchedule({
        Monday: { isOpen: true, start: "09:00 AM", end: "06:00 PM", maxPatients: 30 },
        Tuesday: { isOpen: true, start: "09:00 AM", end: "06:00 PM", maxPatients: 30 },
        Wednesday: { isOpen: true, start: "09:00 AM", end: "06:00 PM", maxPatients: 30 },
        Thursday: { isOpen: true, start: "09:00 AM", end: "06:00 PM", maxPatients: 30 },
        Friday: { isOpen: true, start: "09:00 AM", end: "01:00 PM", maxPatients: 15 },
        Saturday: { isOpen: false, start: "09:00 AM", end: "05:00 PM", maxPatients: 0 },
        Sunday: { isOpen: false, start: "09:00 AM", end: "05:00 PM", maxPatients: 0 },
      });
      handleUpdateActiveChamber("visitingSchedule", "Mon – Thu: 09:00 AM – 06:00 PM, Fri: Morning");
    } else {
      setWeeklySchedule({
        Monday: { isOpen: true, start: "09:00 AM", end: "01:00 PM", maxPatients: 20 },
        Tuesday: { isOpen: true, start: "05:00 PM", end: "09:00 PM", maxPatients: 20 },
        Wednesday: { isOpen: true, start: "09:00 AM", end: "01:00 PM", maxPatients: 20 },
        Thursday: { isOpen: true, start: "05:00 PM", end: "09:00 PM", maxPatients: 20 },
        Friday: { isOpen: false, start: "09:00 AM", end: "01:00 PM", maxPatients: 0 },
        Saturday: { isOpen: true, start: "10:00 AM", end: "04:00 PM", maxPatients: 25 },
        Sunday: { isOpen: false, start: "09:00 AM", end: "01:00 PM", maxPatients: 0 },
      });
      handleUpdateActiveChamber("visitingSchedule", "Split Morning & Evening Sessions");
    }
  };

  // Toggle Day
  const handleToggleDay = (day: string) => {
    setWeeklySchedule((prev) => {
      const cur = prev[day];
      if (!cur) return prev;
      return {
        ...prev,
        [day]: { ...cur, isOpen: !cur.isOpen },
      };
    });
  };

  // Save to MongoDB
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        consultationFeeAed: Number(consultationFeeAed) || 0,
        chamberLocationsSummary: chamberSummary,
        chambers: chambers.map((c) => ({
          id: c.id,
          facilityName: c.facilityName.trim() || "Consultation Chamber",
          city: c.city.trim() || "Dubai",
          visitingSchedule: c.visitingSchedule?.trim() || "Daily 05:00 AM – 09:00 PM",
          roomNumber: c.roomNumber?.trim() || "",
          contactPhone: c.contactPhone?.trim() || "",
          timezone: c.timezone?.trim() || "Asia/Dubai",
        })),
      };

      const res = await updateDoctorProfile(payload);
      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        throw new Error(res?.message || "Failed to update availability in practice database.");
      }
    } catch (err: any) {
      setSaveError(err.message || "Network error syncing with MongoDB.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="availability-page-container">
      {/* 1. TOP HEADER */}
      <header className="availability-header" aria-label="Availability Header">
        <div className="availability-header-left">
          <div
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
              border: "1px solid rgba(229,184,105,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              boxShadow: "0 4px 16px rgba(229,184,105,0.12)",
            }}
          >
            <Clock size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#ffffff", letterSpacing: "-0.01em" }}>
              Availability & Schedule
            </h1>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{doctorName} • {doctorSpecialty}</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  background: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                Active Practice Hours
              </span>
            </div>
          </div>
        </div>

        <div className="availability-header-actions">
          <Link
            href={`/${doctorSlug}/book`}
            target="_blank"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 14px",
              borderRadius: 8,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <ExternalLink size={14} color="#38bdf8" />
            <span>Public Booking Preview</span>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: saveSuccess ? "#10b981" : "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              border: "none",
              color: "#050b14",
              fontSize: 13,
              fontWeight: 700,
              padding: "11px 18px",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
              transition: "all 0.2s ease",
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="spin-animation" />
                <span>Saving to MongoDB...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check size={15} strokeWidth={3} />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} strokeWidth={2.4} />
                <span>Save Schedule Changes</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* SUCCESS / ERROR ALERTS */}
      {saveSuccess && (
        <div
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#6ee7b7",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>
            <strong>Success:</strong> Consultation fees and chamber schedules are synchronized with MongoDB!
          </span>
        </div>
      )}

      {saveError && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fca5a5",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. FOUR LUXURY KPI METRIC CARDS (2x2 on Mobile, 4x1 on Desktop) */}
      <section className="availability-kpi-grid" aria-label="Practice Schedule Overview">
        {/* KPI 1: Active Chamber */}
        <div className="availability-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span className="availability-kpi-title" style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Active Chamber
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(229,184,105,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={14} color="#e5b869" />
            </div>
          </div>
          <div className="availability-kpi-value" style={{ fontSize: 17, fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeChamber.facilityName}
          </div>
          <div className="availability-kpi-sub" style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} color="#e5b869" />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeChamber.city} • {activeChamber.roomNumber || "Suite 405"}
            </span>
          </div>
        </div>

        {/* KPI 2: Consultation Fee */}
        <div className="availability-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span className="availability-kpi-title" style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Consultation Fee
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(229,184,105,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={14} color="#e5b869" />
            </div>
          </div>
          <div className="availability-kpi-value" style={{ fontSize: 19, fontWeight: 800, color: "#e5b869" }}>
            {consultationFeeAed} <span style={{ fontSize: 12, fontWeight: 700, color: "#f3c87a" }}>AED</span>
          </div>
          <div className="availability-kpi-sub" style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            Follow-up: <strong style={{ color: "#ffffff" }}>{Math.round(consultationFeeAed * 0.75)} AED</strong>
          </div>
        </div>

        {/* KPI 3: Visiting Schedule */}
        <div className="availability-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span className="availability-kpi-title" style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Visiting Hours
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={14} color="#10b981" />
            </div>
          </div>
          <div className="availability-kpi-value" style={{ fontSize: 14.5, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeChamber.visitingSchedule || "Daily 05:00 AM – 09:00 PM"}
          </div>
          <div className="availability-kpi-sub" style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={11} color="#38bdf8" />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeChamber.timezone || "Asia/Dubai"}
            </span>
          </div>
        </div>

        {/* KPI 4: Chambers Count */}
        <div className="availability-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span className="availability-kpi-title" style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Chambers
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(56,189,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} color="#38bdf8" />
            </div>
          </div>
          <div className="availability-kpi-value" style={{ fontSize: 19, fontWeight: 800, color: "#ffffff" }}>
            {chambers.length} <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>{chambers.length === 1 ? "Chamber" : "Chambers"}</span>
          </div>
          <div className="availability-kpi-sub" style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span>Live Practice Sync</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN SECTION: 8. CONSULTATION FEE & CHAMBER LOCATIONS */}
      <section className="availability-section-card" aria-label="Consultation Fee & Chamber Locations">
        <div className="availability-section-header">
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <CreditCard size={19} color="#e5b869" />
            <span>8. Consultation Fee & Chamber Locations</span>
          </h2>
          <span
            style={{
              fontSize: 11,
              color: "#e5b869",
              background: "rgba(229,184,105,0.1)",
              border: "1px solid rgba(229,184,105,0.25)",
              padding: "3px 10px",
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            Official Clinical Tariff
          </span>
        </div>

        {/* TOP ROW: Initial Fee & Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          {/* Initial Fee */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
              Initial Consultation Fee (AED)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0"
                step="10"
                value={consultationFeeAed}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setConsultationFeeAed(0);
                  } else {
                    const num = Number(val);
                    setConsultationFeeAed(Number.isNaN(num) ? 0 : num);
                  }
                }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "11px 48px 11px 12px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  fontSize: 12,
                  color: "#e5b869",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                AED
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#8e9fb5" }}>
              Follow-up fee is automatically calculated at 75% ({Math.round(consultationFeeAed * 0.75)} AED).
            </p>
          </div>

          {/* Primary Chamber Summary */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
              Primary Chamber Summary
            </label>
            <input
              type="text"
              value={chamberSummary}
              onChange={(e) => setChamberSummary(e.target.value)}
              placeholder="e.g. Mediclinic City Hospital, Dubai Healthcare City"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "11px 12px",
                color: "#ffffff",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#8e9fb5" }}>
              Displayed on public profile header and patient consultation receipts.
            </p>
          </div>
        </div>

        {/* CHAMBER SELECTOR TABS & ADD CHAMBER */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", letterSpacing: "0.02em" }}>
                Visiting Chamber Locations ({chambers.length})
              </span>
              <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                Select a chamber below to inspect and manage its full visiting schedule and location details.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddChamber}
              style={{
                background: "rgba(229,184,105,0.12)",
                border: "1px solid rgba(229,184,105,0.35)",
                color: "#e5b869",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={14} />
              <span>+ Add Chamber</span>
            </button>
          </div>

          {/* Chamber Switcher Pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 18,
            }}
          >
            {chambers.map((ch, idx) => {
              const isSelected = (ch.id || idx.toString()) === (activeChamber.id || activeIndex.toString());
              return (
                <button
                  key={ch.id || idx}
                  type="button"
                  onClick={() => setSelectedChamberId(ch.id || idx.toString())}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: isSelected ? "rgba(229,184,105,0.16)" : "rgba(255,255,255,0.03)",
                    border: isSelected
                      ? "1px solid #e5b869"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 9,
                    padding: "8px 12px",
                    color: isSelected ? "#ffffff" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 0 14px rgba(229,184,105,0.2)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Building2 size={13} color={isSelected ? "#e5b869" : "#64748b"} />
                  <span style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Chamber #{idx + 1}: {ch.facilityName || "Unnamed"}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 9.5,
                        background: "#e5b869",
                        color: "#050b14",
                        padding: "1px 5px",
                        borderRadius: 6,
                        fontWeight: 800,
                      }}
                    >
                      IN USE
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE CHAMBER DETAILED CARD */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(229,184,105,0.25)",
              borderRadius: 12,
              padding: "16px 16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {/* Card Title & Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e5b869",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Building2 size={15} />
                  Chamber #{activeIndex + 1} Details
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    background: "rgba(16,185,129,0.15)",
                    color: "#10b981",
                    padding: "2px 7px",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Active Practice Details
                </span>
              </div>

              {chambers.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveChamber(activeIndex)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "4px 6px",
                    borderRadius: 6,
                  }}
                >
                  <Trash2 size={12} />
                  <span>Remove Chamber</span>
                </button>
              )}
            </div>

            {/* Form Inputs Grid (Responsive 1-col on mobile, multi-col on desktop) */}
            <div className="availability-chamber-grid">
              {/* 1. Facility Name */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  Hospital / Clinic Facility Name *
                </label>
                <input
                  type="text"
                  value={activeChamber.facilityName}
                  onChange={(e) => handleUpdateActiveChamber("facilityName", e.target.value)}
                  placeholder="e.g. Main Consultation Chamber"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 2. City / Emirate */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  City / Emirate
                </label>
                <input
                  type="text"
                  value={activeChamber.city}
                  onChange={(e) => handleUpdateActiveChamber("city", e.target.value)}
                  placeholder="e.g. Dubai"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 3. Visiting Schedule / Hours */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  Visiting Schedule / Hours
                </label>
                <input
                  type="text"
                  value={activeChamber.visitingSchedule || ""}
                  onChange={(e) => handleUpdateActiveChamber("visitingSchedule", e.target.value)}
                  placeholder="e.g. Daily 05:00 AM – 09:00 PM"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 4. Room / Suite & Floor */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  Room / Suite & Floor
                </label>
                <input
                  type="text"
                  value={activeChamber.roomNumber || ""}
                  onChange={(e) => handleUpdateActiveChamber("roomNumber", e.target.value)}
                  placeholder="e.g. Suite 405, 4th Floor"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 5. Clinic Direct Phone */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  Clinic Direct Phone
                </label>
                <input
                  type="text"
                  value={activeChamber.contactPhone || ""}
                  onChange={(e) => handleUpdateActiveChamber("contactPhone", e.target.value)}
                  placeholder="e.g. +971 4 435 9999"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 6. Chamber Timezone */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                  Chamber Timezone (IANA)
                </label>
                <input
                  type="text"
                  value={activeChamber.timezone || "Asia/Dubai"}
                  onChange={(e) => handleUpdateActiveChamber("timezone", e.target.value)}
                  placeholder="Asia/Dubai"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WEEKLY OPD VISITING HOURS MATRIX (For the Active Chamber) */}
      <section className="availability-section-card" aria-label="Weekly Visiting Hours Matrix">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 9,
                flexWrap: "wrap",
              }}
            >
              <CalendarDays size={18} color="#e5b869" />
              <span>Weekly OPD Visiting Hours ({activeChamber.facilityName})</span>
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Configure clinical OPD working days and patient queue capacity.
            </p>
          </div>

          {/* Quick Schedule Presets */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleApplyPreset("daily")}
              style={{
                background: "rgba(229,184,105,0.12)",
                border: "1px solid rgba(229,184,105,0.3)",
                color: "#e5b869",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Apply Daily 05:00 AM – 09:00 PM
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("weekdays")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                fontSize: 11,
                fontWeight: 500,
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Weekdays (Mon - Fri)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("split")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                fontSize: 11,
                fontWeight: 500,
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Split Sessions
            </button>
          </div>
        </div>

        {/* 4A: DESKTOP TABLE VIEW (Visible on >= 769px) */}
        <div className="availability-opd-desktop-table">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#8e9fb5", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px", width: "130px" }}>Day of Week</th>
                <th style={{ padding: "10px 12px", width: "120px" }}>Practice Status</th>
                <th style={{ padding: "10px 12px" }}>Opening Time</th>
                <th style={{ padding: "10px 12px" }}>Closing Time</th>
                <th style={{ padding: "10px 12px", width: "140px" }}>Token Capacity</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(weeklySchedule).map(([day, schedule]) => (
                <tr
                  key={day}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: schedule.isOpen ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td style={{ padding: "12px", fontWeight: 700, color: schedule.isOpen ? "#ffffff" : "#64748b" }}>
                    {day}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: schedule.isOpen ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: schedule.isOpen ? "#10b981" : "#f87171",
                        border: schedule.isOpen ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: schedule.isOpen ? "#10b981" : "#f87171",
                        }}
                      />
                      {schedule.isOpen ? "PRACTICING" : "OFF-DAY"}
                    </button>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <input
                      type="text"
                      disabled={!schedule.isOpen}
                      value={schedule.start}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeeklySchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], start: val },
                        }));
                      }}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        color: schedule.isOpen ? "#ffffff" : "#64748b",
                        fontSize: 12,
                        width: "110px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <input
                      type="text"
                      disabled={!schedule.isOpen}
                      value={schedule.end}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeeklySchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], end: val },
                        }));
                      }}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        color: schedule.isOpen ? "#ffffff" : "#64748b",
                        fontSize: 12,
                        width: "110px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        disabled={!schedule.isOpen}
                        value={schedule.maxPatients}
                        onChange={(e) => {
                          const maxP = Number(e.target.value);
                          setWeeklySchedule((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], maxPatients: maxP },
                          }));
                        }}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: "6px 8px",
                          color: schedule.isOpen ? "#ffffff" : "#64748b",
                          fontSize: 12,
                          width: "70px",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#8e9fb5" }}>Patients</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4B: MOBILE CARDS VIEW (Visible on <= 768px, zero horizontal scrolling) */}
        <div className="availability-opd-mobile-cards">
          {Object.entries(weeklySchedule).map(([day, schedule]) => (
            <div
              key={day}
              className="availability-mobile-card"
              style={{
                opacity: schedule.isOpen ? 1 : 0.65,
                borderColor: schedule.isOpen ? "rgba(229,184,105,0.2)" : "rgba(255,255,255,0.06)",
              }}
            >
              {/* Header: Day & Status Toggle */}
              <div className="availability-mobile-card-header">
                <span style={{ fontSize: 14, fontWeight: 700, color: schedule.isOpen ? "#ffffff" : "#94a3b8" }}>
                  {day}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: schedule.isOpen ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    color: schedule.isOpen ? "#10b981" : "#f87171",
                    border: schedule.isOpen ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: schedule.isOpen ? "#10b981" : "#f87171",
                    }}
                  />
                  {schedule.isOpen ? "PRACTICING" : "OFF-DAY"}
                </button>
              </div>

              {/* Opening & Closing Times */}
              <div className="availability-mobile-card-times">
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                    Opening Time
                  </label>
                  <input
                    type="text"
                    disabled={!schedule.isOpen}
                    value={schedule.start}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeeklySchedule((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], start: val },
                      }));
                    }}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: schedule.isOpen ? "#ffffff" : "#64748b",
                      fontSize: 12.5,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                    Closing Time
                  </label>
                  <input
                    type="text"
                    disabled={!schedule.isOpen}
                    value={schedule.end}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeeklySchedule((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], end: val },
                      }));
                    }}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: schedule.isOpen ? "#ffffff" : "#64748b",
                      fontSize: 12.5,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Token Capacity */}
              <div className="availability-mobile-card-cap">
                <span style={{ fontSize: 12, color: "#cbd5e1" }}>Session Token Capacity:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    disabled={!schedule.isOpen}
                    value={schedule.maxPatients}
                    onChange={(e) => {
                      const maxP = Number(e.target.value);
                      setWeeklySchedule((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], maxPatients: maxP },
                      }));
                    }}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      padding: "6px 8px",
                      color: schedule.isOpen ? "#ffffff" : "#64748b",
                      fontSize: 12.5,
                      width: "60px",
                      textAlign: "center",
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#8e9fb5" }}>Patients</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PATIENT PUBLIC BOOKING & STANDEE PREVIEW BANNER */}
      <section className="availability-preview-banner" aria-label="Public Booking Standee Preview">
        <div style={{ maxWidth: "700px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={16} color="#e5b869" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Live Public Booking & QR Standee Preview
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
            {activeChamber.facilityName} • {activeChamber.roomNumber || "Suite 405, 4th Floor"} ({activeChamber.city})
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
            Visiting Schedule: <strong>{activeChamber.visitingSchedule}</strong> • Consultation Fee: <strong>{consultationFeeAed} AED</strong> (Initial) / <strong>{Math.round(consultationFeeAed * 0.75)} AED</strong> (Follow-up) • Phone: <strong>{activeChamber.contactPhone}</strong>
          </div>
        </div>

        <Link
          href={`/${doctorSlug}/book`}
          target="_blank"
          style={{
            background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
            color: "#050b14",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
          }}
        >
          <ExternalLink size={14} />
          <span>Test Public Booking Flow</span>
        </Link>
      </section>
    </div>
  );
}
