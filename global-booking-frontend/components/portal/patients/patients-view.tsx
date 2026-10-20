"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  Users2,
  UserPlus,
  Search,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Activity,
  Phone,
  Mail,
  Eye,
  ChevronDown,
  Table as TableIcon,
  LayoutGrid,
  Shield,
  FileText,
  ArrowUpRight,
  X,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { MOCK_PATIENTS } from "@/lib/data/mock-patients";
import { Patient, PatientStatus, BloodGroup } from "@/types/patient";
import { NewPatientModal } from "./new-patient-modal";
import { PatientDetailModal } from "./patient-detail-modal";
import { ROUTES } from "@/config/routes";

type ViewMode = "table" | "grid";

// Luxury gradient palette for avatar initials fallback
const AVATAR_PALETTES = [
  { bg: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" },
  { bg: "linear-gradient(135deg, #3b2810 0%, #171107 100%)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.4)" },
  { bg: "linear-gradient(135deg, #2e1065 0%, #13062b 100%)", text: "#c084fc", border: "rgba(192, 132, 252, 0.4)" },
  { bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)", text: "#34d399", border: "rgba(52, 211, 153, 0.4)" },
  { bg: "linear-gradient(135deg, #4c0519 0%, #1f020a 100%)", text: "#fb7185", border: "rgba(251, 113, 133, 0.4)" },
  { bg: "linear-gradient(135deg, #164e63 0%, #082f49 100%)", text: "#22d3ee", border: "rgba(34, 211, 238, 0.4)" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PatientAvatar({ name, avatar, status, size = 40 }: { name: string; avatar?: string; status: PatientStatus; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);

  // Pick deterministic palette by hash of name
  const paletteIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % AVATAR_PALETTES.length;
  }, [name]);
  const palette = AVATAR_PALETTES[paletteIndex];

  const initials = getInitials(name);
  const showFallback = !avatar || imageFailed;

  return (
    <div
      className="patient-avatar-container"
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        position: "relative",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {showFallback ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: palette.bg,
            border: `1.5px solid ${palette.border}`,
            color: palette.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.36,
            fontWeight: 700,
            letterSpacing: "0.04em",
            userSelect: "none",
          }}
        >
          {initials}
        </div>
      ) : (
        <Image
          src={avatar}
          alt=""
          width={size}
          height={size}
          className="patient-avatar-image"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            border: "1.5px solid rgba(229, 184, 105, 0.4)",
          }}
          onError={() => setImageFailed(true)}
        />
      )}
      <span className={`patient-live-status-dot dot-${status.toLowerCase().replace(/\s+/g, "-")}`} />
    </div>
  );
}

export function PatientsView() {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [bloodFilter, setBloodFilter] = useState("All Blood Groups");
  const [doctorFilter, setDoctorFilter] = useState("All Doctors");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live UAE Clock
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
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = patients.length;
    const active = patients.filter((p) => p.status === "Active" || p.status === "In-Treatment").length;
    const newThisWeek = patients.filter((p) => p.status === "New").length;
    const followUpDue = patients.filter((p) => p.status === "Follow-up Due").length;
    return { total, active, newThisWeek, followUpDue };
  }, [patients]);

  // Unique doctors for filter
  const uniqueDoctors = useMemo(() => {
    const set = new Set(patients.map((p) => p.primaryDoctor));
    return Array.from(set);
  }, [patients]);

  // Filtered patient list
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.primaryDoctor.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q);

      const matchStatus = statusFilter === "All Status" || p.status === statusFilter;
      const matchBlood = bloodFilter === "All Blood Groups" || p.bloodGroup === bloodFilter;
      const matchDoctor = doctorFilter === "All Doctors" || p.primaryDoctor === doctorFilter;

      return matchSearch && matchStatus && matchBlood && matchDoctor;
    });
  }, [patients, searchQuery, statusFilter, bloodFilter, doctorFilter]);

  // Bulk Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPatients.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Add Patient
  const handleAddPatient = (newP: Patient) => {
    setPatients([newP, ...patients]);
    showToast(`Patient ${newP.name} (${newP.mrn}) registered successfully!`);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Status");
    setBloodFilter("All Blood Groups");
    setDoctorFilter("All Doctors");
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "All Status" ||
    bloodFilter !== "All Blood Groups" ||
    doctorFilter !== "All Doctors";

  return (
    <div className="dashboard-page-container patients-portal-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER SECTION */}
      <section className="appointments-header-section" aria-label="Patients Directory Header">
        <div className="header-text-group">
          <div className="module-title-row">
            <div className="hero-icon-calendar" style={{ background: "rgba(229,184,105,0.12)", borderColor: "rgba(229,184,105,0.3)" }}>
              <Users2 size={24} className="text-gold" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 className="hero-title-text">Patients Directory</h1>
                <span className="patient-total-chip">{patients.length} Registered</span>
              </div>
            </div>
          </div>
          <p className="hero-tagline">
            Manage comprehensive clinical records, appointment history, medical alerts, and primary care physicians.
          </p>
        </div>

        {/* Action Buttons & UAE Clock */}
        <div className="header-action-buttons">
          {currentTime && (
            <div className="live-clock-pill" title="Current Local Hospital Time">
              <span className="clock-pulse-dot" />
              <Clock size={13} className="text-gold" />
              <span>{currentTime}</span>
            </div>
          )}

          <button
            type="button"
            className="primary-gold-button"
            onClick={() => setIsNewModalOpen(true)}
            title="Register a new patient"
          >
            <UserPlus size={16} strokeWidth={2.4} />
            <span>Register Patient</span>
          </button>
        </div>
      </section>

      {/* 2. 4 STAT METRIC CARDS */}
      <section className="dashboard-metrics-grid" aria-label="Patient Statistics">
        {/* Metric 1: Total Patients */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Users2 size={20} className="text-gold" />
            </div>
            <span className="metric-label">Total Patients</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.total}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 12%</span>
                <span className="trend-context">vs. last month</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path d="M2,32 Q20,30 30,22 T56,12 T82,4" stroke="#e5b869" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="82" cy="4" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 2: Active & In-Treatment */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Activity size={20} className="text-gold" />
            </div>
            <span className="metric-label">Active in Care</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.active}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 8%</span>
                <span className="trend-context">ongoing care</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path d="M2,34 Q22,30 36,20 T62,14 T82,6" stroke="#e5b869" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="82" cy="6" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 3: Follow-Up Due */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Clock size={20} className="text-gold" />
            </div>
            <span className="metric-label">Follow-up Due</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.followUpDue}</div>
              <div className="metric-trend trend-down">
                <span className="trend-arrow">⚠️ Needs Review</span>
                <span className="trend-context">schedule visit</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path d="M2,14 Q20,16 32,24 T60,28 T82,34" stroke="#e5b869" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="82" cy="34" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 4: New Intake */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <UserPlus size={20} className="text-gold" />
            </div>
            <span className="metric-label">New Intake (Week)</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.newThisWeek}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 28%</span>
                <span className="trend-context">growth rate</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path d="M2,30 Q22,28 34,20 T60,12 T82,5" stroke="#e5b869" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="82" cy="5" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>
      </section>

      {/* 3. TOOLBAR CONTROLS BAR */}
      <section className="patients-toolbar-capsule" aria-label="Directory Filters">
        {/* Left: View Mode Segmented Capsule */}
        <div className="segmented-view-capsule">
          <button
            type="button"
            className={`segmented-view-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <TableIcon size={14} />
            <span>Table View</span>
          </button>
          <button
            type="button"
            className={`segmented-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={14} />
            <span>Cards View</span>
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="patients-filters-cluster">
          {/* Fast Search Input */}
          <div className="patients-search-capsule">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              placeholder="Search by name, MRN, phone, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="patients-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="search-clear-icon-btn"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="filter-pill-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-pill-select"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="In-Treatment">In-Treatment</option>
              <option value="Follow-up Due">Follow-up Due</option>
              <option value="New">New</option>
              <option value="Discharged">Discharged</option>
            </select>
            <ChevronDown size={13} className="filter-select-chevron" />
          </div>

          {/* Blood Group Filter */}
          <div className="filter-pill-select-wrap">
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="filter-pill-select"
            >
              <option value="All Blood Groups">All Blood</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
            <ChevronDown size={13} className="filter-select-chevron" />
          </div>

          {/* Doctor Filter */}
          <div className="filter-pill-select-wrap">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="filter-pill-select"
            >
              <option value="All Doctors">All Doctors</option>
              {uniqueDoctors.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="filter-select-chevron" />
          </div>

          {/* Clear Filter Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filter-pill-btn"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. BULK SELECTION BANNER (when items checked) */}
      {selectedIds.length > 0 && (
        <div className="bulk-selection-bar">
          <span className="bulk-count">
            <strong>{selectedIds.length}</strong> patient{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="bulk-actions-group">
            <button
              type="button"
              className="secondary-action-button"
              onClick={() => {
                showToast(`Sent appointment reminder SMS to ${selectedIds.length} patients.`);
                setSelectedIds([]);
              }}
            >
              <Mail size={14} />
              <span>Send SMS Reminder</span>
            </button>
            <button
              type="button"
              className="primary-gold-button"
              onClick={() => {
                showToast(`Batch exported charts for ${selectedIds.length} patients.`);
                setSelectedIds([]);
              }}
            >
              <Download size={14} />
              <span>Export Charts</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT AREA: TABLE VIEW */}
      {viewMode === "table" ? (
        <article className="dashboard-panel patients-table-panel">
          <div className="table-responsive-wrapper">
            <table className="patients-luxury-table">
              <thead>
                <tr>
                  <th style={{ width: 44, paddingLeft: 20 }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredPatients.length > 0 &&
                        selectedIds.length === filteredPatients.length
                      }
                      onChange={handleSelectAll}
                      className="portal-checkbox"
                      aria-label="Select all patients"
                    />
                  </th>
                  <th style={{ minWidth: 220 }}>Patient Details</th>
                  <th style={{ minWidth: 190 }}>Contact Info</th>
                  <th style={{ minWidth: 150 }}>Blood / Alerts</th>
                  <th style={{ minWidth: 180 }}>Assigned Specialist</th>
                  <th style={{ minWidth: 180 }}>Last & Next Visit</th>
                  <th style={{ minWidth: 130 }}>Clinical Status</th>
                  <th style={{ minWidth: 110, textAlign: "right", paddingRight: 24 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-table-state">
                      <div className="empty-state-wrap">
                        <Users2 size={42} className="text-muted" />
                        <h3>No patients found</h3>
                        <p>No patient records match your current search and filters.</p>
                        <button type="button" className="primary-gold-button" onClick={handleClearFilters}>
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const isSelected = selectedIds.includes(patient.id);
                    return (
                      <tr
                        key={patient.id}
                        className={`patients-table-row ${isSelected ? "row-selected" : ""}`}
                      >
                        {/* Checkbox */}
                        <td style={{ paddingLeft: 20 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(patient.id)}
                            className="portal-checkbox"
                            aria-label={`Select ${patient.name}`}
                          />
                        </td>

                        {/* Patient Details */}
                        <td>
                          <div className="patient-cell-profile">
                            <PatientAvatar
                              name={patient.name}
                              avatar={patient.avatar}
                              status={patient.status}
                              size={40}
                            />
                            <div className="patient-name-stack">
                              <span className="patient-primary-name">{patient.name}</span>
                              <div className="patient-meta-row">
                                <span className="patient-mrn-chip">{patient.mrn}</span>
                                <span className="meta-separator">•</span>
                                <span className="patient-sub-details">
                                  {patient.age}y, {patient.gender}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td>
                          <div className="patient-contact-stack">
                            <a href={`tel:${patient.phone}`} className="patient-phone-pill">
                              <Phone size={11} className="text-gold" />
                              <span>{patient.phone}</span>
                            </a>
                            <span className="patient-email-line">{patient.email}</span>
                          </div>
                        </td>

                        {/* Blood & Alerts */}
                        <td>
                          <div className="patient-medical-stack">
                            <span className="blood-group-chip">{patient.bloodGroup}</span>
                            {patient.allergies && patient.allergies.length > 0 ? (
                              <span className="allergy-alert-chip" title={`Allergies: ${patient.allergies.join(", ")}`}>
                                ⚠️ {patient.allergies[0]}
                                {patient.allergies.length > 1 && ` +${patient.allergies.length - 1}`}
                              </span>
                            ) : (
                              <span className="no-allergy-label">No allergy</span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Specialist */}
                        <td>
                          <div className="patient-doctor-stack">
                            <span className="doctor-primary-name">{patient.primaryDoctor}</span>
                            <span className="doctor-specialty-sub">{patient.department}</span>
                          </div>
                        </td>

                        {/* Last & Next Visit */}
                        <td>
                          <div className="patient-visit-stack">
                            <span className="last-visit-line">Last: {patient.lastVisit}</span>
                            <span className="next-booking-line">
                              Next:{" "}
                              {patient.nextAppointment ? (
                                <strong className="text-gold font-medium">{patient.nextAppointment}</strong>
                              ) : (
                                <span className="text-muted">None scheduled</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Clinical Status */}
                        <td>
                          <span className={`portal-badge badge-${patient.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            <span className="status-badge-dot" />
                            <span>{patient.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right", paddingRight: 24 }}>
                          <div className="patient-row-actions">
                            <button
                              type="button"
                              className="patient-action-icon-btn"
                              onClick={() => setActivePatient(patient)}
                              title="View Clinical Chart"
                            >
                              <Eye size={15} />
                            </button>
                            <Link
                              href={ROUTES.appointments}
                              className="patient-action-icon-btn"
                              title="Book Appointment"
                            >
                              <Calendar size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>
      ) : (
        /* 6. CARDS / GRID VIEW */
        <div className="patients-grid-container">
          {filteredPatients.length === 0 ? (
            <div className="empty-state-wrap" style={{ gridColumn: "1 / -1", padding: 60 }}>
              <Users2 size={42} className="text-muted" />
              <h3>No patients found</h3>
              <p>No patient records match your current search and filters.</p>
              <button type="button" className="primary-gold-button" onClick={handleClearFilters}>
                Reset Filters
              </button>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <article key={patient.id} className="patient-grid-card">
                {/* Header */}
                <div className="patient-card-header">
                  <PatientAvatar
                    name={patient.name}
                    avatar={patient.avatar}
                    status={patient.status}
                    size={46}
                  />

                  <div className="patient-card-title-wrap">
                    <h3 className="patient-card-name">{patient.name}</h3>
                    <div className="patient-sub-meta">
                      <span className="patient-mrn-chip">{patient.mrn}</span>
                      <span className="text-muted">•</span>
                      <span>{patient.age}y, {patient.gender}</span>
                    </div>
                  </div>

                  <span className={`portal-badge badge-${patient.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    <span className="status-badge-dot" />
                    <span>{patient.status}</span>
                  </span>
                </div>

                {/* Vitals summary bar */}
                {patient.vitals && (
                  <div className="card-vitals-row">
                    <div className="card-vital-pill" title="Blood Pressure">
                      <Activity size={12} className="text-gold" />
                      <span>{patient.vitals.bloodPressure}</span>
                    </div>
                    <div className="card-vital-pill" title="Blood Group">
                      <span className="text-gold font-semibold">{patient.bloodGroup}</span>
                    </div>
                    <div className="card-vital-pill" title="Heart Rate">
                      <HeartPulse size={12} className="text-cyan" />
                      <span>{patient.vitals.heartRate} bpm</span>
                    </div>
                  </div>
                )}

                {/* Doctor & Schedule */}
                <div className="patient-card-details">
                  <div className="card-detail-item">
                    <span className="detail-label">Physician</span>
                    <span className="detail-value">{patient.primaryDoctor}</span>
                  </div>
                  <div className="card-detail-item">
                    <span className="detail-label">Next Visit</span>
                    <span className="detail-value text-gold">
                      {patient.nextAppointment || "None scheduled"}
                    </span>
                  </div>
                </div>

                {/* Allergies chip if any */}
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="card-allergy-alert">
                    <span>⚠️ Allergy: {patient.allergies.join(", ")}</span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="patient-card-footer">
                  <a href={`tel:${patient.phone}`} className="card-quick-call-btn" title="Call Patient">
                    <Phone size={13} />
                    <span>{patient.phone}</span>
                  </a>
                  <button
                    type="button"
                    className="card-view-chart-btn"
                    onClick={() => setActivePatient(patient)}
                  >
                    <span>View Chart</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAddPatient={handleAddPatient}
      />

      {/* Patient Detail Clinical Chart Modal */}
      <PatientDetailModal
        patient={activePatient}
        onClose={() => setActivePatient(null)}
        onBookAppointment={(p) => {
          showToast(`Opening booking for ${p.name}...`);
        }}
      />
    </div>
  );
}
