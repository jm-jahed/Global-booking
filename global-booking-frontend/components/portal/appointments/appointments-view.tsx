"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  CalendarDays,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
  Eye,
  SlidersHorizontal,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Kanban,
  Download,
  Check,
  ChevronDown,
  User,
  ArrowUpRight,
} from "lucide-react";
import { MOCK_APPOINTMENTS } from "@/lib/data/mock-appointments";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { NewAppointmentModal } from "./new-appointment-modal";

type ViewMode = "table" | "calendar" | "kanban";

export function AppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [serviceFilter, setServiceFilter] = useState<string>("All Services");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddAppointment = (newApp: Appointment) => {
    setAppointments([newApp, ...appointments]);
    showToast(`Appointment ${newApp.referenceNumber} for ${newApp.clientName} booked successfully!`);
  };

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    setAppointments(
      appointments.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    showToast(`Appointment status updated to ${newStatus}`);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
    const pending = appointments.filter((a) => a.status === "Pending").length;
    const completed = appointments.filter((a) => a.status === "Completed").length;
    const inProgress = appointments.filter((a) => a.status === "In Progress").length;
    return { total, confirmed, pending, completed, inProgress };
  }, [appointments]);

  // Filtered List
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchSearch =
        apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "All Status" || apt.status === statusFilter;
      const matchService =
        serviceFilter === "All Services" || apt.service === serviceFilter;
      return matchSearch && matchStatus && matchService;
    });
  }, [appointments, searchQuery, statusFilter, serviceFilter]);

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
    setAppointments(
      appointments.map((a) =>
        selectedIds.includes(a.id) ? { ...a, status: "Confirmed" } : a
      )
    );
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

      {/* TOP HEADER */}
      <section className="appointments-header-section">
        <div className="header-text-group">
          <div className="module-title-row">
            <div className="hero-icon-calendar">
              <CalendarDays size={24} className="text-gold" />
            </div>
            <h1 className="hero-title-text">Appointments</h1>
          </div>
          <p className="hero-tagline">
            Schedule, monitor, filter, and manage all client bookings in real-time.
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="secondary-action-button"
            onClick={() => showToast("Schedule exported as CSV.")}
          >
            <Download size={15} />
            <span>Export List</span>
          </button>
          <button
            type="button"
            className="primary-gold-button"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Appointment</span>
          </button>
        </div>
      </section>

      {/* 4 STAT CARDS */}
      <section className="dashboard-metrics-grid" aria-label="Appointment KPI Summaries">
        {/* Total */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <CalendarDays size={20} className="text-gold" />
            </div>
            <span className="metric-label">Total Appointments</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.total}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 14%</span>
                <span className="trend-context">vs. yesterday</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,32 Q20,30 30,22 T56,12 T82,4"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="4" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Confirmed */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <CheckCircle2 size={20} className="text-gold" />
            </div>
            <span className="metric-label">Confirmed Sessions</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.confirmed}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">66%</span>
                <span className="trend-context">of total today</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,34 Q22,30 36,20 T62,14 T82,6"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="6" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Pending */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Clock4 size={20} className="text-gold" />
            </div>
            <span className="metric-label">Pending Review</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.pending}</div>
              <div className="metric-trend trend-down">
                <span className="trend-arrow">Requires action</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,10 Q18,12 32,20 T58,28 T82,32"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="32" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Completed */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Check size={20} className="text-gold" />
            </div>
            <span className="metric-label">Completed / In Progress</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.completed + kpis.inProgress}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 8%</span>
                <span className="trend-context">throughput</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,30 Q24,26 38,18 T64,10 T82,5"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="5" r="2.5" fill="#e5b869" />
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
            <TableIcon size={15} />
            <span>Table View</span>
          </button>
          <button
            type="button"
            className={`view-mode-button ${viewMode === "calendar" ? "active" : ""}`}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon size={15} />
            <span>Schedule</span>
          </button>
          <button
            type="button"
            className={`view-mode-button ${viewMode === "kanban" ? "active" : ""}`}
            onClick={() => setViewMode("kanban")}
          >
            <Kanban size={15} />
            <span>Board</span>
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="filters-right-group">
          {/* Search box */}
          <div className="table-search-box table-search-wide">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              placeholder="Search client, staff, service, or #ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="table-search-input"
            />
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
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown size={13} className="dropdown-arrow-icon" />
          </div>

          {/* Category Filter */}
          <div className="filter-dropdown-wrap">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="table-filter-select"
            >
              <option value="All Services">All Services</option>
              <option value="General Consultation">General Consultation</option>
              <option value="Dental Checkup">Dental Checkup</option>
              <option value="Skin Care Treatment">Skin Care Treatment</option>
              <option value="Physiotherapy">Physiotherapy</option>
              <option value="Hair Treatment">Hair Treatment</option>
              <option value="Cardiology Review">Cardiology Review</option>
            </select>
            <ChevronDown size={13} className="dropdown-arrow-icon" />
          </div>

          {/* Date Indicator */}
          <div className="filter-date-pill">
            <Calendar size={13} className="text-gold" />
            <span>Apr 15, 2025</span>
          </div>
        </div>
      </section>

      {/* BULK ACTION BAR (when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-banner">
          <span className="bulk-selection-count">
            {selectedIds.length} appointment{selectedIds.length > 1 ? "s" : ""} selected
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

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === "table" && (
        <article className="dashboard-panel appointments-table-card">
          <div className="table-responsive-wrapper">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
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
                  <th>Ref #</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Specialist</th>
                  <th>Date & Time</th>
                  <th>Channel</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
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

                      {/* Reference code */}
                      <td className="ref-cell">
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="ref-code-link"
                        >
                          {apt.referenceNumber}
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="client-cell">
                        <div className="client-avatar-wrapper">
                          <Image
                            src={apt.clientAvatar}
                            alt={apt.clientName}
                            width={34}
                            height={34}
                            className="client-avatar-img"
                          />
                        </div>
                        <div className="client-info-stack">
                          <Link
                            href={`/appointments/${apt.id}`}
                            className="client-name-text client-hover-link"
                          >
                            {apt.clientName}
                          </Link>
                          <span className="client-email-sub">{apt.clientEmail}</span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="service-cell">
                        <div className="service-info-stack">
                          <span className="service-title">{apt.service}</span>
                          <span className="service-category-tag">{apt.serviceCategory}</span>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="staff-cell">
                        <div className="staff-avatar-row">
                          <Image
                            src={apt.staffAvatar}
                            alt={apt.staffName}
                            width={24}
                            height={24}
                            className="staff-avatar-mini"
                          />
                          <span>{apt.staffName}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="time-cell">
                        <div className="time-info-stack">
                          <span className="time-main">{apt.time}</span>
                          <span className="time-duration">{apt.durationMinutes} min</span>
                        </div>
                      </td>

                      {/* Channel */}
                      <td>
                        <span className="channel-badge">{apt.type}</span>
                      </td>

                      {/* Price */}
                      <td className="price-cell">
                        <span className="price-amount">${apt.price}</span>
                        <span className={`payment-indicator ${apt.paymentStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                          {apt.paymentStatus}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="status-cell">
                        <span
                          className={`status-pill ${
                            apt.status === "Confirmed"
                              ? "status-confirmed"
                              : apt.status === "Pending"
                              ? "status-pending"
                              : apt.status === "In Progress"
                              ? "status-inprogress"
                              : apt.status === "Completed"
                              ? "status-completed"
                              : "status-cancelled"
                          }`}
                        >
                          {apt.status === "Pending" && <span className="status-dot-amber" />}
                          {apt.status === "In Progress" && <span className="status-dot-cyan" />}
                          {apt.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="actions-cell">
                        <div className="action-button-group">
                          <Link
                            href={`/appointments/${apt.id}`}
                            className="action-icon-button"
                            title="View full appointment details"
                          >
                            <Eye size={14} />
                          </Link>
                          {apt.status === "Pending" && (
                            <button
                              type="button"
                              className="action-icon-button action-btn-confirm"
                              title="Confirm appointment"
                              onClick={() => handleStatusChange(apt.id, "Confirmed")}
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="empty-table-state">
                      No appointments matching &quot;{searchQuery}&quot; found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* VIEW 2: CALENDAR SCHEDULE VIEW */}
      {viewMode === "calendar" && (
        <article className="dashboard-panel schedule-timeline-card">
          <div className="schedule-header-row">
            <h2 className="panel-title">Tuesday, April 15, 2025</h2>
            <div className="schedule-legend-group">
              <span className="legend-chip chip-confirmed">● Confirmed</span>
              <span className="legend-chip chip-pending">● Pending</span>
              <span className="legend-chip chip-inprogress">● In Progress</span>
              <span className="legend-chip chip-completed">● Completed</span>
            </div>
          </div>

          <div className="timeline-schedule-grid">
            {[
              "08:00 AM",
              "09:00 AM",
              "10:00 AM",
              "11:00 AM",
              "12:00 PM",
              "01:00 PM",
              "02:00 PM",
              "03:00 PM",
              "04:00 PM",
              "05:00 PM",
              "06:00 PM",
            ].map((slotTime) => {
              // Find appointments starting around this hour
              const slotHour = slotTime.split(":")[0];
              const slotPeriod = slotTime.split(" ")[1];
              const matchingApts = appointments.filter((apt) => {
                const [aptHour, rest] = apt.time.split(":");
                const aptPeriod = rest.split(" ")[1];
                return aptHour === slotHour && aptPeriod === slotPeriod;
              });

              return (
                <div key={slotTime} className="timeline-slot-row">
                  <div className="timeline-time-label">{slotTime}</div>
                  <div className="timeline-slot-content">
                    {matchingApts.map((apt) => (
                      <Link
                        key={apt.id}
                        href={`/appointments/${apt.id}`}
                        className={`timeline-appointment-pill ${
                          apt.status === "Confirmed"
                            ? "slot-confirmed"
                            : apt.status === "Pending"
                            ? "slot-pending"
                            : apt.status === "In Progress"
                            ? "slot-inprogress"
                            : "slot-completed"
                        }`}
                      >
                        <div className="slot-pill-left">
                          <Image
                            src={apt.clientAvatar}
                            alt={apt.clientName}
                            width={22}
                            height={22}
                            className="slot-avatar"
                          />
                          <span className="slot-client-name">{apt.clientName}</span>
                          <span className="slot-time-badge">{apt.time} - {apt.endTime}</span>
                        </div>
                        <div className="slot-pill-right">
                          <span className="slot-service-name">{apt.service}</span>
                          <span className="slot-staff-name">{apt.staffName}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* VIEW 3: KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <section className="kanban-columns-grid">
          {/* Column 1: Pending */}
          <div className="kanban-column-card">
            <div className="kanban-col-header header-amber">
              <div className="kanban-title-wrap">
                <span className="kanban-col-dot dot-amber" />
                <h3 className="kanban-col-title">Pending Review</h3>
              </div>
              <span className="kanban-count-badge">
                {appointments.filter((a) => a.status === "Pending").length}
              </span>
            </div>
            <div className="kanban-cards-stack">
              {appointments
                .filter((a) => a.status === "Pending")
                .map((apt) => (
                  <div key={apt.id} className="kanban-item-card">
                    <div className="kanban-item-top">
                      <span className="kanban-ref">{apt.referenceNumber}</span>
                      <span className="kanban-time">{apt.time}</span>
                    </div>
                    <div className="kanban-client-row">
                      <Image
                        src={apt.clientAvatar}
                        alt={apt.clientName}
                        width={28}
                        height={28}
                        className="client-avatar-img"
                      />
                      <span className="kanban-client-name">{apt.clientName}</span>
                    </div>
                    <div className="kanban-service-row">{apt.service}</div>
                    <div className="kanban-footer-row">
                      <span className="kanban-staff">{apt.staffName}</span>
                      <div className="kanban-card-actions">
                        <button
                          type="button"
                          className="kanban-action-btn"
                          onClick={() => handleStatusChange(apt.id, "Confirmed")}
                        >
                          Confirm
                        </button>
                        <Link href={`/appointments/${apt.id}`} className="kanban-link-btn">
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: Confirmed */}
          <div className="kanban-column-card">
            <div className="kanban-col-header header-green">
              <div className="kanban-title-wrap">
                <span className="kanban-col-dot dot-green" />
                <h3 className="kanban-col-title">Confirmed</h3>
              </div>
              <span className="kanban-count-badge">
                {appointments.filter((a) => a.status === "Confirmed").length}
              </span>
            </div>
            <div className="kanban-cards-stack">
              {appointments
                .filter((a) => a.status === "Confirmed")
                .map((apt) => (
                  <div key={apt.id} className="kanban-item-card">
                    <div className="kanban-item-top">
                      <span className="kanban-ref">{apt.referenceNumber}</span>
                      <span className="kanban-time">{apt.time}</span>
                    </div>
                    <div className="kanban-client-row">
                      <Image
                        src={apt.clientAvatar}
                        alt={apt.clientName}
                        width={28}
                        height={28}
                        className="client-avatar-img"
                      />
                      <span className="kanban-client-name">{apt.clientName}</span>
                    </div>
                    <div className="kanban-service-row">{apt.service}</div>
                    <div className="kanban-footer-row">
                      <span className="kanban-staff">{apt.staffName}</span>
                      <div className="kanban-card-actions">
                        <button
                          type="button"
                          className="kanban-action-btn"
                          onClick={() => handleStatusChange(apt.id, "In Progress")}
                        >
                          Check In
                        </button>
                        <Link href={`/appointments/${apt.id}`} className="kanban-link-btn">
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: In Progress */}
          <div className="kanban-column-card">
            <div className="kanban-col-header header-cyan">
              <div className="kanban-title-wrap">
                <span className="kanban-col-dot dot-cyan" />
                <h3 className="kanban-col-title">In Progress</h3>
              </div>
              <span className="kanban-count-badge">
                {appointments.filter((a) => a.status === "In Progress").length}
              </span>
            </div>
            <div className="kanban-cards-stack">
              {appointments
                .filter((a) => a.status === "In Progress")
                .map((apt) => (
                  <div key={apt.id} className="kanban-item-card">
                    <div className="kanban-item-top">
                      <span className="kanban-ref">{apt.referenceNumber}</span>
                      <span className="kanban-time">{apt.time}</span>
                    </div>
                    <div className="kanban-client-row">
                      <Image
                        src={apt.clientAvatar}
                        alt={apt.clientName}
                        width={28}
                        height={28}
                        className="client-avatar-img"
                      />
                      <span className="kanban-client-name">{apt.clientName}</span>
                    </div>
                    <div className="kanban-service-row">{apt.service}</div>
                    <div className="kanban-footer-row">
                      <span className="kanban-staff">{apt.staffName}</span>
                      <div className="kanban-card-actions">
                        <button
                          type="button"
                          className="kanban-action-btn"
                          onClick={() => handleStatusChange(apt.id, "Completed")}
                        >
                          Complete
                        </button>
                        <Link href={`/appointments/${apt.id}`} className="kanban-link-btn">
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 4: Completed */}
          <div className="kanban-column-card">
            <div className="kanban-col-header header-gold">
              <div className="kanban-title-wrap">
                <span className="kanban-col-dot dot-gold" />
                <h3 className="kanban-col-title">Completed</h3>
              </div>
              <span className="kanban-count-badge">
                {appointments.filter((a) => a.status === "Completed").length}
              </span>
            </div>
            <div className="kanban-cards-stack">
              {appointments
                .filter((a) => a.status === "Completed")
                .map((apt) => (
                  <div key={apt.id} className="kanban-item-card">
                    <div className="kanban-item-top">
                      <span className="kanban-ref">{apt.referenceNumber}</span>
                      <span className="kanban-time">{apt.time}</span>
                    </div>
                    <div className="kanban-client-row">
                      <Image
                        src={apt.clientAvatar}
                        alt={apt.clientName}
                        width={28}
                        height={28}
                        className="client-avatar-img"
                      />
                      <span className="kanban-client-name">{apt.clientName}</span>
                    </div>
                    <div className="kanban-service-row">{apt.service}</div>
                    <div className="kanban-footer-row">
                      <span className="kanban-staff">{apt.staffName}</span>
                      <div className="kanban-card-actions">
                        <span className="kanban-done-tag">Finished</span>
                        <Link href={`/appointments/${apt.id}`} className="kanban-link-btn">
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* New Appointment Modal */}
      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddAppointment={handleAddAppointment}
      />
    </div>
  );
}
