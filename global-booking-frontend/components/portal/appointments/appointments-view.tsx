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
  ChevronRight,
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
import { useTranslation } from "@/lib/i18n/i18n-context";

type ViewMode = "table" | "calendar" | "kanban";

export function AppointmentsView() {
  const { t: tAppointments } = useTranslation("appointments");
  const { t: tCommon } = useTranslation("common");

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

  // Generate rich avatar initials gradient
  const getInitialsGradient = (name: string) => {
    const gradients = [
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
      "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="appointments-luxury-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Real-time online booking notification banner */}
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

      {/* 1. TOP LUXURY HEADER: Practice Branding & Actions */}
      <header className="appointments-luxury-header" aria-label="Appointments Header">
        <div className="appointments-luxury-header-left">
          <div className="appointments-luxury-icon-badge" title="Appointments & Consultations">
            <CalendarDays size={24} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="appointments-luxury-title-text">{tAppointments("title")}</h1>
            <div className="appointments-luxury-subtitle-text">
              <span>{doctorName} • {doctorSpecialty}</span>
            </div>
          </div>
        </div>

        <div className="appointments-luxury-actions">
          <button
            type="button"
            className="appointments-btn-secondary"
            onClick={handleManualSync}
            title="Refresh appointments and sync with public booking page"
          >
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} style={{ color: "#f5c270" }} />
            <span>{tAppointments("syncWeb")}</span>
          </button>

          <Link
            href={`/${doctorSlug}/book`}
            target="_blank"
            className="appointments-btn-secondary"
            title="Open patient public booking portal in new tab"
          >
            <ExternalLink size={14} style={{ color: "#38bdf8" }} />
            <span>{tAppointments("publicBookingPage")}</span>
          </Link>

          <button
            type="button"
            className="appointments-btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>{tAppointments("newAppointment")}</span>
          </button>
        </div>
      </header>

      {/* 2. FOUR LUXURY GLOWING KPI METRIC CARDS */}
      <section className="appointments-kpi-grid" aria-label="Appointment KPI Summaries">
        {/* Card 1: Total Consultations */}
        <div className="appointments-kpi-card kpi-emerald">
          <div className="appointments-kpi-icon-orb">
            <CalendarDays size={22} strokeWidth={2.4} />
          </div>
          <div className="appointments-kpi-content">
            <span className="appointments-kpi-label">{tAppointments("totalConsultations")}</span>
            <span className="appointments-kpi-value">{kpis.total}</span>
            <span className="appointments-kpi-desc" style={{ color: "#34d399" }}>{tAppointments("practiceToday")}</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 2: Confirmed & Arrived */}
        <div className="appointments-kpi-card kpi-cyan">
          <div className="appointments-kpi-icon-orb">
            <CheckCircle2 size={22} strokeWidth={2.4} />
          </div>
          <div className="appointments-kpi-content">
            <span className="appointments-kpi-label">{tAppointments("confirmedArrived")}</span>
            <span className="appointments-kpi-value">{kpis.confirmed}</span>
            <span className="appointments-kpi-desc" style={{ color: "#38bdf8" }}>{tAppointments("readyInChamber")}</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 3: Online Web Bookings */}
        <div className="appointments-kpi-card kpi-purple">
          <div className="appointments-kpi-icon-orb">
            <Globe size={22} strokeWidth={2.4} />
          </div>
          <div className="appointments-kpi-content">
            <span className="appointments-kpi-label">{tAppointments("onlineWebBookings")}</span>
            <span className="appointments-kpi-value">{kpis.onlineCount}</span>
            <span className="appointments-kpi-desc" style={{ color: "#c084fc" }}>{tAppointments("liveWebsiteSync")}</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 4: In Consultation / Done */}
        <div className="appointments-kpi-card kpi-amber">
          <div className="appointments-kpi-icon-orb">
            <Activity size={22} strokeWidth={2.4} />
          </div>
          <div className="appointments-kpi-content">
            <span className="appointments-kpi-label">{tAppointments("inConsultationDone")}</span>
            <span className="appointments-kpi-value">{kpis.inConsultation + kpis.completed}</span>
            <span className="appointments-kpi-desc" style={{ color: "#fbbf24" }}>
              {kpis.inConsultation} Active • {kpis.completed} Done
            </span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>
      </section>

      {/* 3. TOOLBAR: VIEW TABS & FILTERS DECK */}
      <section className="appointments-toolbar-deck" aria-label="Appointment Controls and Filters">
        {/* Left: View Mode Tabs */}
        <div className="appointments-view-tabs">
          <button
            type="button"
            className={`appointments-tab-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <TableIcon size={14} />
            <span>{tAppointments("clinicalTable")}</span>
          </button>
          <button
            type="button"
            className={`appointments-tab-btn ${viewMode === "kanban" ? "active" : ""}`}
            onClick={() => setViewMode("kanban")}
          >
            <Kanban size={14} />
            <span>{tAppointments("liveOpdBoard")}</span>
          </button>
          <button
            type="button"
            className={`appointments-tab-btn ${viewMode === "calendar" ? "active" : ""}`}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon size={14} />
            <span>{tAppointments("scheduleRoster")}</span>
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="appointments-filters-group">
          {/* Search box */}
          <div className="appointments-search-wrap">
            <Search size={15} className="appointments-search-icon" />
            <input
              type="text"
              placeholder={tAppointments("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="appointments-search-input"
            />
          </div>

          {/* Booking Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="appointments-select-pill"
          >
            <option value="All Channels">{tAppointments("allChannels")}</option>
            <option value="Online Web">Online Web</option>
            <option value="In-Person Chamber">In-Person Chamber</option>
            <option value="Phone Booking">Phone Booking</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appointments-select-pill"
          >
            <option value="All Status">{tAppointments("allStatus")}</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Consultation">In Consultation</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Date Indicator */}
          <div className="appointments-date-pill">
            <Calendar size={13} style={{ color: "#f5c270" }} />
            <span>{tAppointments("todaySchedule")}</span>
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

      {/* VIEW 1: CLINICAL TABLE VIEW */}
      {viewMode === "table" && (
        <article className="appointments-luxury-table-card">
          <div className="appointments-table-header-bar">
            <div className="appointments-table-title-group">
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f5c270", boxShadow: "0 0 10px #f5c270" }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                {tAppointments("appointmentsDirectory")}
              </h2>
            </div>
            <div className="appointments-table-meta-group">
              <span>
                {tCommon("total")}: <strong style={{ color: "#ffffff" }}>{filteredAppointments.length}</strong>
              </span>
            </div>
          </div>

          <div className="appointments-table-wrapper">
            <table className="appointments-luxury-table">
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
                  <th style={{ width: "70px" }}>{tAppointments("serialNo")}</th>
                  <th>{tAppointments("patientName")}</th>
                  <th>{tAppointments("chamber")}</th>
                  <th>{tAppointments("appointmentTime")}</th>
                  <th>{tAppointments("type")}</th>
                  <th>{tAppointments("consultationFee")}</th>
                  <th>{tAppointments("filterByStatus")}</th>
                  <th style={{ textAlign: "right" }}>{tCommon("actions")}</th>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: getInitialsGradient(apt.patientName),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            }}
                          >
                            {apt.patientName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
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
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
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
