"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Kanban,
  Download,
  Check,
  ChevronDown,
  User,
  Activity,
  Stethoscope,
  Globe,
  PhoneCall,
  MapPin,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileText,
  UserCheck,
} from "lucide-react";
import {
  getDoctorAppointments,
  syncDoctorAppointmentsFromServer,
  updateAppointmentStatus,
  saveDoctorAppointment,
  deleteDoctorAppointment,
  type DoctorAppointment,
  type DoctorAppointmentStatus,
  type DoctorAppointmentChannel,
} from "@/lib/services/doctor-appointments-service";
import { NewAppointmentModal } from "./new-appointment-modal";
import { getStoredPortalUser } from "@/lib/api/admin-client";

type ViewMode = "table" | "calendar" | "kanban";

export function AppointmentsView() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [channelFilter, setChannelFilter] = useState<string>("All Channels");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newOnlineAlert, setNewOnlineAlert] = useState<DoctorAppointment | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerFresh, setIsServerFresh] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = getStoredPortalUser();
    if (stored) {
      setCurrentUser(stored);
    }
  }, []);

  const doctorName = currentUser?.fullName || currentUser?.name || "Doctor Practice";
  const doctorSpecialty = currentUser?.specialty || "Consultant Specialist";
  const doctorSlug =
    currentUser?.slug ||
    (currentUser?.fullName || currentUser?.name
      ? String(currentUser.fullName || currentUser.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      : "");
  const chamberLocation =
    currentUser?.chamberLocationsSummary ||
    (Array.isArray(currentUser?.chambers) && currentUser?.chambers[0]?.facilityName) ||
    "Main Consultation Chamber";

  // Load genuine doctor clinical appointments from backend MongoDB API
  const loadAppointments = async () => {
    try {
      const res = await syncDoctorAppointmentsFromServer();
      setAppointments(res.appointments);
      setIsServerFresh(res.isServerFresh);
      setSyncError(res.error || null);

      // Check if there was an online booking created in the last 15 minutes
      const latestOnline = res.appointments.find(
        (a) => a.channel === "Online Web" && Date.now() - new Date(a.createdAt).getTime() < 900000
      );
      if (latestOnline) {
        setNewOnlineAlert(latestOnline);
      }
    } catch (err: any) {
      console.warn("Error syncing appointments:", err);
      const fallbackList = getDoctorAppointments();
      setAppointments(fallbackList);
      setIsServerFresh(false);
      setSyncError("Network error while connecting to server. Displaying cached records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();

    // Event listener for storage changes across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "global_booking_doctor_appointments" ||
        e.key?.startsWith("global_booking_doctor_appointments_") ||
        e.key?.startsWith("global_booking_appointments_")
      ) {
        loadAppointments();
      }
    };

    // Custom window event for same-tab online booking confirmation
    const handleCustomUpdate = () => {
      loadAppointments();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("global-booking-updated", handleCustomUpdate);

    // Auto-sync poll every 3.5 seconds to guarantee instant reflection of online bookings
    const interval = setInterval(() => {
      loadAppointments();
    }, 3500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("global-booking-updated", handleCustomUpdate);
      clearInterval(interval);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await loadAppointments();
    setIsSyncing(false);
    showToast(
      isServerFresh
        ? "Synchronized live appointments from MongoDB backend!"
        : "Server currently unreachable. Displaying cached appointments."
    );
  };

  const handleAddAppointment = (newApp: DoctorAppointment) => {
    const updated = saveDoctorAppointment(newApp);
    setAppointments(updated);
    showToast(`Appointment ${newApp.serialNumber} for ${newApp.patientName} scheduled successfully!`);
  };

  const handleStatusChange = (id: string, newStatus: DoctorAppointmentStatus) => {
    const updated = updateAppointmentStatus(id, newStatus);
    setAppointments(updated);
    showToast(`Appointment status updated to ${newStatus}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove appointment for patient ${name}?`)) {
      const updated = deleteDoctorAppointment(id);
      setAppointments(updated);
      showToast(`Appointment removed from roster.`);
    }
  };

  // Real KPIs (Dr. Jahedul Islam's practice)
  const kpis = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
    const inConsultation = appointments.filter((a) => a.status === "In Consultation").length;
    const onlineCount = appointments.filter((a) => a.channel === "Online Web").length;
    const completed = appointments.filter((a) => a.status === "Completed").length;
    return { total, confirmed, inConsultation, onlineCount, completed };
  }, [appointments]);

  // Filtered List
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchSearch =
        apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.patientPhone.includes(searchQuery) ||
        apt.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.chamberLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "All Status" || apt.status === statusFilter;

      const matchChannel =
        channelFilter === "All Channels" || apt.channel === channelFilter;

      return matchSearch && matchStatus && matchChannel;
    });
  }, [appointments, searchQuery, statusFilter, channelFilter]);

  // Select all logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAppointments.map((a) => a.id));
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

  const handleBulkConfirm = () => {
    selectedIds.forEach((id) => {
      updateAppointmentStatus(id, "Confirmed");
    });
    loadAppointments();
    showToast(`${selectedIds.length} appointments marked as Confirmed!`);
    setSelectedIds([]);
  };

  return (
    <div className="dashboard-page-container appointments-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ONLINE THEKE BOOKING ASHLE REAL-TIME ALERT BANNER */}
      {newOnlineAlert && (
        <div className="online-booking-alert-banner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="live-alert-pulse-ring" />
            <Globe size={16} color="#60a5fa" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
              New Online Web Booking Received:
            </span>
            <span style={{ fontSize: 13, color: "#e5b869", fontWeight: 700 }}>
              {newOnlineAlert.patientName}
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              • {newOnlineAlert.service} • Serial: {newOnlineAlert.serialNumber} • {newOnlineAlert.time}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNewOnlineAlert(null)}
            className="dismiss-alert-btn"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* TOP HEADER: Doctor Personal Practice Branding */}
      <section className="appointments-header-section">
        <div className="header-text-group">
          <div className="module-title-row">
            <div className="hero-icon-calendar">
              <Stethoscope size={22} className="text-gold" />
            </div>
            <div>
              <h1 className="hero-title-text">Appointments & Consultations</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>
                  {doctorName} • {doctorSpecialty}
                </span>
                <span className="live-sync-pill">
                  <span className={isServerFresh ? "suite-pulse-dot" : "suite-offline-dot"} />
                  {isServerFresh ? "MongoDB Live Sync" : "Cached Practice Data"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="secondary-action-button"
            onClick={handleManualSync}
            title="Refresh appointments and sync with public booking page"
          >
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} />
            <span>Sync Web</span>
          </button>

          <Link
            href={`/${doctorSlug}/book`}
            target="_blank"
            className="secondary-action-button"
            title="Open patient public booking portal in new tab"
          >
            <ExternalLink size={14} />
            <span>Public Booking Page</span>
          </Link>

          <button
            type="button"
            className="primary-gold-button"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>New Patient Appointment</span>
          </button>
        </div>
      </section>

      {/* 4 COMPACT CLINICAL METRIC CARDS */}
      <section className="dashboard-metrics-grid" aria-label="Appointment KPI Summaries">
        {/* Total Patients */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <CalendarDays size={18} className="text-gold" />
            </div>
            <span className="metric-label">Total Consultations</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.total}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">Practice Today</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <path d="M2,24 Q18,22 28,15 T48,9 T66,3" stroke="#e5b869" strokeWidth="2" strokeLinecap="round" />
                <circle cx="66" cy="3" r="2" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Confirmed Patients */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <CheckCircle2 size={18} />
            </div>
            <span className="metric-label">Confirmed & Arrived</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.confirmed}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow" style={{ color: "#34d399" }}>Ready in Chamber</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <path d="M2,24 Q18,18 32,14 T52,8 T66,2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                <circle cx="66" cy="2" r="2" fill="#10b981" />
              </svg>
            </div>
          </div>
        </article>

        {/* Online Web Bookings ("ONLINE THEKE BOOKING ASHLE") */}
        <article className="metric-card" style={{ borderColor: "rgba(96, 165, 250, 0.35)", background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(11, 19, 37, 0.95) 100%)" }}>
          <div className="metric-card-top">
            <div className="metric-icon-box" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
              <Globe size={18} />
            </div>
            <span className="metric-label" style={{ color: "#93c5fd" }}>Online Web Bookings</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value" style={{ color: "#bfdbfe" }}>{kpis.onlineCount}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow" style={{ color: "#60a5fa" }}>Live Website Sync</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <path d="M2,22 Q16,14 32,18 T52,6 T66,2" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                <circle cx="66" cy="2" r="2" fill="#60a5fa" />
              </svg>
            </div>
          </div>
        </article>

        {/* In Consultation / Completed */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <Activity size={18} />
            </div>
            <span className="metric-label">In Consultation / Done</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.inConsultation + kpis.completed}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">{kpis.inConsultation} Active • {kpis.completed} Done</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <path d="M2,24 Q24,20 36,12 T54,8 T66,4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                <circle cx="66" cy="4" r="2" fill="#f59e0b" />
              </svg>
            </div>
          </div>
        </article>
      </section>

      {/* FILTER & VIEW CONTROLS TOOLBAR */}
      <section className="appointments-controls-bar">
        {/* Left: View Switcher Buttons */}
        <div className="view-mode-toggle-group">
          <button
            type="button"
            className={`view-mode-button ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <TableIcon size={14} />
            <span>Clinical Table</span>
          </button>
          <button
            type="button"
            className={`view-mode-button ${viewMode === "kanban" ? "active" : ""}`}
            onClick={() => setViewMode("kanban")}
          >
            <Kanban size={14} />
            <span>Live OPD Board</span>
          </button>
          <button
            type="button"
            className={`view-mode-button ${viewMode === "calendar" ? "active" : ""}`}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon size={14} />
            <span>Schedule Roster</span>
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="filters-right-group">
          {/* Search box */}
          <div className="table-search-box table-search-wide">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              placeholder="Search patient, mobile, serial #, or chamber..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="table-search-input"
            />
          </div>

          {/* Booking Channel Filter */}
          <div className="filter-dropdown-wrap">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="table-filter-select"
            >
              <option value="All Channels">All Channels</option>
              <option value="Online Web">Online Web</option>
              <option value="In-Person Chamber">In-Person Chamber</option>
              <option value="Phone Booking">Phone Booking</option>
            </select>
            <ChevronDown size={12} className="dropdown-arrow-icon" />
          </div>

          {/* Status Filter */}
          <div className="filter-dropdown-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="table-filter-select"
            >
              <option value="All Status">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown size={12} className="dropdown-arrow-icon" />
          </div>

          {/* Date Indicator */}
          <div className="filter-date-pill">
            <Calendar size={13} className="text-gold" />
            <span>Today, 24 Apr 2026</span>
          </div>
        </div>
      </section>

      {/* BULK ACTION BAR (when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-banner">
          <span className="bulk-selection-count">
            {selectedIds.length} patient appointment{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="bulk-actions-buttons">
            <button
              type="button"
              className="bulk-button-confirm"
              onClick={handleBulkConfirm}
            >
              Mark Confirmed
            </button>
            <button
              type="button"
              className="bulk-button-clear"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: CLINICAL TABLE VIEW (Fixed Height Table Card, Zero Window Scrolling) */}
      {viewMode === "table" && (
        <article className="dashboard-panel appointments-table-card">
          <div className="table-responsive-wrapper">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th style={{ width: "36px" }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredAppointments.length &&
                        filteredAppointments.length > 0
                      }
                      onChange={handleSelectAll}
                      className="portal-checkbox"
                    />
                  </th>
                  <th style={{ width: "70px" }}>Serial #</th>
                  <th>Patient Details</th>
                  <th>Clinical Cardiology Service</th>
                  <th>Chamber Location</th>
                  <th>Schedule</th>
                  <th>Channel</th>
                  <th>Fee</th>
                  <th>Clinical Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className={selectedIds.includes(apt.id) ? "row-selected" : ""}
                    >
                      {/* Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(apt.id)}
                          onChange={() => toggleSelectOne(apt.id)}
                          className="portal-checkbox"
                        />
                      </td>

                      {/* Serial Number Token */}
                      <td>
                        <span className="serial-badge-pill">
                          {apt.serialNumber}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td className="client-cell">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="patient-avatar-badge">
                            {apt.patientName.charAt(0)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                              {apt.patientName}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
                              <span>{apt.patientPhone}</span>
                              <span>•</span>
                              <span>{apt.patientAgeGender}</span>
                              <span className="blood-group-pill">{apt.bloodGroup}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clinical Cardiology Service */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                            {apt.service}
                          </span>
                          <span style={{ fontSize: 11, color: "#38bdf8" }}>
                            Cardiology Care
                          </span>
                        </div>
                      </td>

                      {/* Chamber Location */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#cbd5e1" }}>
                          <MapPin size={13} color="#e5b869" />
                          <span>{apt.chamberLocation}</span>
                        </div>
                      </td>

                      {/* Schedule Time & Date */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff" }}>
                            {apt.time}
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {apt.date} ({apt.duration})
                          </span>
                        </div>
                      </td>

                      {/* Booking Channel Badge */}
                      <td>
                        {apt.channel === "Online Web" ? (
                          <span className="channel-pill online-pill" title="Booked directly from public doctor website">
                            <Globe size={10} /> Online Web
                          </span>
                        ) : apt.channel === "Phone Booking" ? (
                          <span className="channel-pill phone-pill" title="Booked via phone reception desk">
                            <PhoneCall size={10} /> Phone
                          </span>
                        ) : (
                          <span className="channel-pill inperson-pill" title="In-person chamber desk visit">
                            <UserCheck size={10} /> In-Person
                          </span>
                        )}
                      </td>

                      {/* Price & Payment */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e5b869" }}>
                            {apt.price}
                          </span>
                          <span style={{ fontSize: 10.5, color: apt.paymentStatus === "Paid" ? "#34d399" : "#fbbf24" }}>
                            {apt.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* Clinical Status Dropdown */}
                      <td>
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value as DoctorAppointmentStatus)}
                          className={`status-select-badge status-${apt.status.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Consultation">In Consultation</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Doctor Quick Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {apt.status !== "In Consultation" && apt.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(apt.id, "In Consultation")}
                              className="action-btn-call"
                              title="Call patient into consultation room"
                            >
                              Call In
                            </button>
                          )}

                          {apt.status === "In Consultation" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(apt.id, "Completed")}
                              className="action-btn-done"
                              title="Mark clinical consultation completed"
                            >
                              Done
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(apt.id, apt.patientName)}
                            className="action-btn-del"
                            title="Cancel / remove appointment"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                      <Stethoscope size={28} color="#e5b869" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                        No doctor appointments found matching current filters.
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                        Online patient bookings submitted via public profile will automatically sync here in real-time.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* VIEW 2: LIVE OPD QUEUE (BOARD) */}
      {viewMode === "kanban" && (
        <div className="opd-board-grid">
          {["Pending", "Confirmed", "In Consultation", "Completed"].map((statusCol) => {
            const colItems = filteredAppointments.filter((a) => a.status === statusCol);
            return (
              <div key={statusCol} className="opd-column">
                <div className="opd-col-header">
                  <span className="opd-col-title">{statusCol}</span>
                  <span className="opd-col-count">{colItems.length}</span>
                </div>
                <div className="opd-col-items">
                  {colItems.map((item) => (
                    <div key={item.id} className="opd-patient-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span className="serial-badge-pill">{item.serialNumber}</span>
                        <span className="opd-time-tag">{item.time}</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                          {item.patientName}
                        </div>
                        <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 2 }}>
                          {item.service}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          {item.chamberLocation}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="channel-pill" style={{ fontSize: 9 }}>
                          {item.channel}
                        </span>
                        {item.status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, item.status === "In Consultation" ? "Completed" : "In Consultation")}
                            style={{
                              background: "rgba(229, 184, 105, 0.15)",
                              border: "1px solid rgba(229, 184, 105, 0.3)",
                              color: "#e5b869",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {item.status === "In Consultation" ? "Finish" : "Call In"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 10px", fontSize: 11.5, color: "#64748b" }}>
                      No patients in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: SCHEDULE ROSTER VIEW */}
      {viewMode === "calendar" && (
        <div className="schedule-roster-view">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
              Visiting Schedule &amp; Slots Roster ({doctorName})
            </span>
            <span style={{ fontSize: 12, color: "#e5b869" }}>
              Active Chambers: {chamberLocation}
            </span>
          </div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filteredAppointments.map((apt) => (
              <div key={apt.id} style={{ background: "#0a1324", border: "1px solid rgba(229,184,105,0.18)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="serial-badge-pill">{apt.serialNumber}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>{apt.time}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{apt.patientName}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{apt.patientPhone} • {apt.patientAgeGender}</div>
                <div style={{ fontSize: 11.5, color: "#38bdf8", marginTop: 6 }}>{apt.service}</div>
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4 }}>{apt.chamberLocation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW APPOINTMENT MODAL */}
      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddAppointment={handleAddAppointment}
        doctorName={doctorName}
        chamberLocation={chamberLocation}
        doctorSpecialty={doctorSpecialty}
      />
    </div>
  );
}
