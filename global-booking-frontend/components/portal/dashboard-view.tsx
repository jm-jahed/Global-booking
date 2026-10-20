"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  CalendarDays,
  Users,
  CheckCircle2,
  UserPlus,
  Tv,
  Users2,
  Clock,
  Search,
  ChevronDown,
  Info,
  Eye,
  ExternalLink,
  QrCode,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ROUTES } from "@/config/routes";

interface AppointmentRow {
  id: string;
  clientName: string;
  avatar: string;
  service: string;
  staff: string;
  time: string;
  status: "Confirmed" | "Pending";
}

const APPOINTMENTS_DATA: AppointmentRow[] = [
  {
    id: "1",
    clientName: "Olivia Martin",
    avatar: "/avatars/olivia-martin.jpg",
    service: "General Consultation",
    staff: "Dr. Sarah Khan",
    time: "10:30 AM",
    status: "Confirmed",
  },
  {
    id: "2",
    clientName: "Daniel Carter",
    avatar: "/avatars/daniel-carter.jpg",
    service: "Dental Checkup",
    staff: "Dr. James Wilson",
    time: "10:45 AM",
    status: "Confirmed",
  },
  {
    id: "3",
    clientName: "Sophia Wilson",
    avatar: "/avatars/sophia-wilson.jpg",
    service: "Skin Care Treatment",
    staff: "Dr. Emily Davis",
    time: "11:00 AM",
    status: "Pending",
  },
  {
    id: "4",
    clientName: "Noah Bennett",
    avatar: "/avatars/noah-bennett.jpg",
    service: "Physiotherapy",
    staff: "Dr. Michael Brown",
    time: "11:15 AM",
    status: "Confirmed",
  },
  {
    id: "5",
    clientName: "Emma Davis",
    avatar: "/avatars/emma-davis.jpg",
    service: "Hair Treatment",
    staff: "Sarah Johnson",
    time: "11:30 AM",
    status: "Pending",
  },
];

// 12 hours from 8 AM to 7 PM matching the screenshot
const HOURLY_BARS = [
  { hour: "8 AM", value: 7 },
  { hour: "9 AM", value: 10 },
  { hour: "10 AM", value: 14 },
  { hour: "11 AM", value: 17 },
  { hour: "12 PM", value: 15 },
  { hour: "1 PM", value: 18 },
  { hour: "2 PM", value: 17 },
  { hour: "3 PM", value: 20 },
  { hour: "4 PM", value: 23 },
  { hour: "5 PM", value: 26 },
  { hour: "6 PM", value: 16 },
  { hour: "7 PM", value: 9 },
];

export function DashboardView() {
  const [activeTab, setActiveTab] = useState<"volume" | "hourly" | "completed">("volume");
  const [tableSearch, setTableSearch] = useState("");
  const [selectedService, setSelectedService] = useState("All Services");
  const [selectedStatus, setSelectedStatus] = useState("All Status");

  // Filtered appointments
  const filteredAppointments = APPOINTMENTS_DATA.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      apt.service.toLowerCase().includes(tableSearch.toLowerCase()) ||
      apt.staff.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesService =
      selectedService === "All Services" || apt.service.toLowerCase().includes(selectedService.toLowerCase());
    const matchesStatus =
      selectedStatus === "All Status" || apt.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesService && matchesStatus;
  });

  return (
    <div className="dashboard-page-container">
      {/* 1. TOP WELCOME / HERO BANNER */}
      <section className="dashboard-hero-banner" aria-label="Dashboard Overview">
        <div className="hero-welcome-left">
          <div className="hero-title-group">
            <div className="hero-icon-calendar">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e5b869"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1" fill="#e5b869" />
                <circle cx="12" cy="14" r="1" fill="#e5b869" />
                <circle cx="16" cy="14" r="1" fill="#e5b869" />
              </svg>
            </div>
            <h1 className="hero-title-text">Dashboard</h1>
          </div>
          <p className="hero-greeting">Good morning, Alex</p>
          <p className="hero-tagline">Here&apos;s what&apos;s happening across your business today.</p>
        </div>

        {/* Right side luxury architectural banner */}
        <div className="hero-banner-right">
          <div className="banner-image-container">
            <Image
              src="/images/luxury-lounge.jpg"
              alt="Better Appointments. Happier Patients."
              fill
              className="banner-image-bg"
              sizes="(max-width: 1200px) 100vw, 550px"
              priority
            />
            <div className="banner-overlay-gradient" />
            <svg
              className="banner-gold-ribbon"
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M0,110 Q140,20 260,80 T420,10"
                stroke="#e5b869"
                strokeWidth="2.2"
                strokeOpacity="0.6"
              />
              <path
                d="M20,115 Q150,35 270,95 T440,25"
                stroke="#d4a757"
                strokeWidth="1.2"
                strokeOpacity="0.4"
              />
            </svg>
          </div>
          <div className="banner-content-caption">
            <div className="banner-caption-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e5b869"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1" fill="#e5b869" />
                <circle cx="12" cy="14" r="1" fill="#e5b869" />
              </svg>
            </div>
            <div className="banner-caption-text">
              <span>Better Appointments.</span>
              <span>Happier Patients.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOP 4 METRICS CARDS */}
      <section className="dashboard-metrics-grid" aria-label="Key Performance Indicators">
        {/* Metric 1 */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <CalendarDays size={20} strokeWidth={2} className="text-gold" />
            </div>
            <span className="metric-label">Appointments Today</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">128</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 12%</span>
                <span className="trend-context">vs. yesterday</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,32 Q18,30 26,24 T52,14 T82,4"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="4" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 2 */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Users size={20} strokeWidth={2} className="text-gold" />
            </div>
            <span className="metric-label">Currently Waiting</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">09</div>
              <div className="metric-trend trend-down">
                <span className="trend-arrow">↓ 33%</span>
                <span className="trend-context">vs. yesterday</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,10 Q16,8 28,16 T54,26 T82,32"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="32" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 3 */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <CheckCircle2 size={20} strokeWidth={2} className="text-gold" />
            </div>
            <span className="metric-label">Completed Appointments</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">84</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 18%</span>
                <span className="trend-context">vs. yesterday</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,34 Q20,32 32,22 T58,16 T82,6"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="6" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 4 */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <UserPlus size={20} strokeWidth={2} className="text-gold" />
            </div>
            <span className="metric-label">New Patients</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">23</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">↑ 28%</span>
                <span className="trend-context">vs. last 7 days</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,30 Q22,28 34,20 T60,12 T82,5"
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

      {/* 3. MIDDLE ROW: APPOINTMENT OVERVIEW & LIVE QUEUE OVERVIEW */}
      <section className="dashboard-middle-grid">
        {/* Left: Appointment Overview Card */}
        <article className="dashboard-panel appointment-overview-card">
          <div className="panel-header-row">
            <h2 className="panel-title">Appointment Overview</h2>
            <button type="button" className="panel-date-filter-button">
              <Calendar size={14} className="text-gold" />
              <span>Apr 15, 2025</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
          </div>

          {/* Subheader Navigation Tabs */}
          <div className="overview-tabs-row">
            <button
              type="button"
              className={`overview-tab-pill ${activeTab === "volume" ? "active" : ""}`}
              onClick={() => setActiveTab("volume")}
            >
              Appointment Volume
            </button>
            <button
              type="button"
              className={`overview-tab-pill ${activeTab === "hourly" ? "active" : ""}`}
              onClick={() => setActiveTab("hourly")}
            >
              Hourly Trends
            </button>
            <button
              type="button"
              className={`overview-tab-pill ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed vs Pending
            </button>
          </div>

          {/* Chart Content Area (Hourly Bar Chart + Donut Chart) */}
          <div className="overview-charts-container">
            {/* Left: Hourly Bar Chart */}
            <div className="hourly-chart-wrapper">
              <div className="chart-canvas-area">
                {/* Y Axis Guide Lines */}
                <div className="chart-y-axis">
                  <div className="y-axis-mark"><span>30</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>25</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>20</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>15</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>10</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>5</span><div className="grid-line" /></div>
                  <div className="y-axis-mark"><span>0</span><div className="grid-line zero" /></div>
                </div>

                {/* Bars & SVG Trend Line */}
                <div className="bars-and-trend-container">
                  {/* The Golden Vertical Bars */}
                  <div className="bars-track">
                    {HOURLY_BARS.map((bar, index) => {
                      const heightPercent = (bar.value / 30) * 100;
                      return (
                        <div key={bar.hour} className="bar-column">
                          <div className="bar-slot">
                            <div
                              className="bar-fill"
                              style={{ height: `${heightPercent}%` }}
                              title={`${bar.hour}: ${bar.value} appointments`}
                            />
                          </div>
                          <span className="bar-label">{bar.hour}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SVG Golden Trend Line Overlay */}
                  <svg
                    className="trend-line-svg"
                    viewBox="0 0 520 180"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="goldTrendGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d4a757" />
                        <stop offset="50%" stopColor="#f7cd73" />
                        <stop offset="100%" stopColor="#d4a757" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 22,138 C 50,138 55,120 70,120 C 85,120 95,96 112,96 C 130,96 140,78 156,78 C 172,78 185,90 200,90 C 215,90 228,72 244,72 C 260,72 272,78 288,78 C 304,78 316,60 332,60 C 348,60 360,42 376,42 C 392,42 405,24 420,24 C 438,24 450,84 464,84 C 480,84 494,126 510,126"
                      fill="none"
                      stroke="url(#goldTrendGlow)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    {/* Points on trend line */}
                    {[
                      { x: 22, y: 138 },
                      { x: 70, y: 120 },
                      { x: 112, y: 96 },
                      { x: 156, y: 78 },
                      { x: 200, y: 90 },
                      { x: 244, y: 72 },
                      { x: 288, y: 78 },
                      { x: 332, y: 60 },
                      { x: 376, y: 42 },
                      { x: 420, y: 24 },
                      { x: 464, y: 84 },
                      { x: 510, y: 126 },
                    ].map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0d1728" stroke="#f7cd73" strokeWidth="2" />
                        <circle cx={pt.x} cy={pt.y} r="1.5" fill="#f7cd73" />
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="chart-legend-row">
                <div className="legend-item">
                  <span className="legend-bullet-bar" />
                  <span className="legend-text">Appointments</span>
                </div>
                <div className="legend-item">
                  <span className="legend-line-trend" />
                  <span className="legend-text">Trend</span>
                </div>
              </div>
            </div>

            {/* Right: Donut Chart Section */}
            <div className="donut-chart-wrapper">
              <div className="donut-graphic-box">
                <svg className="donut-svg" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="goldDonutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f3c87a" />
                      <stop offset="50%" stopColor="#d4a757" />
                      <stop offset="100%" stopColor="#a37624" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="transparent"
                    stroke="#1a2942"
                    strokeWidth="18"
                  />
                  {/* Pending Arc: 34% (stroke-dasharray: circumference = 2 * PI * 58 = 364.4) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="transparent"
                    stroke="#1e385c"
                    strokeWidth="18"
                    strokeDasharray="123.9 364.4"
                    strokeDashoffset="-240.5"
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                  {/* Completed Arc: 66% */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="transparent"
                    stroke="url(#goldDonutGradient)"
                    strokeWidth="18"
                    strokeDasharray="240.5 364.4"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="donut-center-info">
                  <span className="donut-center-number">128</span>
                  <span className="donut-center-label">Total Today</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="donut-legend-list">
                <div className="donut-legend-item">
                  <span className="donut-dot dot-completed" />
                  <span className="donut-legend-name">Completed</span>
                  <span className="donut-legend-val">84 (66%)</span>
                </div>
                <div className="donut-legend-item">
                  <span className="donut-dot dot-pending" />
                  <span className="donut-legend-name">Pending</span>
                  <span className="donut-legend-val">44 (34%)</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Right: Live Queue Overview Card */}
        <article className="dashboard-panel live-queue-card" id="live-queue">
          <div className="panel-header-row">
            <div className="live-header-title-box">
              <div className="live-header-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e5b869"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h2 className="panel-title">Live Queue Overview</h2>
              <span className="live-status-pill">
                <span className="live-pulsing-dot" />
                Live
              </span>
            </div>
            <div className="demo-data-note">
              <span>Demo Data</span>
              <Info size={13} className="info-icon" />
            </div>
          </div>

          {/* 4 Mini Metric Boxes in a Row */}
          <div className="queue-quick-stats-row">
            <div className="quick-stat-box">
              <div className="quick-stat-header">
                <Tv size={14} className="text-muted" />
                <span>Now Serving</span>
              </div>
              <div className="quick-stat-value text-gold">#012</div>
            </div>

            <div className="quick-stat-box">
              <div className="quick-stat-header">
                <Users2 size={14} className="text-muted" />
                <span>Next Patient</span>
              </div>
              <div className="quick-stat-value text-cyan">#013</div>
            </div>

            <div className="quick-stat-box">
              <div className="quick-stat-header">
                <Users size={14} className="text-muted" />
                <span>Total Waiting</span>
              </div>
              <div className="quick-stat-value text-white">09</div>
            </div>

            <div className="quick-stat-box">
              <div className="quick-stat-header">
                <Clock size={14} className="text-muted" />
                <span>Est. Wait Time</span>
              </div>
              <div className="quick-stat-value text-white text-medium">18 min</div>
            </div>
          </div>

          {/* Upcoming Serials Subtitle & Grid */}
          <div className="upcoming-serials-section">
            <h3 className="upcoming-serials-heading">Upcoming Serials</h3>
            <div className="serials-two-column-grid">
              {/* Column 1 */}
              <div className="serial-column">
                <div className="serial-item-box">
                  <span className="serial-code">#014</span>
                  <span className="serial-time">22 min</span>
                </div>
                <div className="serial-item-box">
                  <span className="serial-code">#015</span>
                  <span className="serial-time">35 min</span>
                </div>
                <div className="serial-item-box">
                  <span className="serial-code">#016</span>
                  <span className="serial-time">48 min</span>
                </div>
              </div>

              {/* Column 2 */}
              <div className="serial-column">
                <div className="serial-item-box">
                  <span className="serial-code">#017</span>
                  <span className="serial-time">1 hr 02 min</span>
                </div>
                <div className="serial-item-box">
                  <span className="serial-code">#018</span>
                  <span className="serial-time">1 hr 18 min</span>
                </div>
                <div className="serial-item-box">
                  <span className="serial-code">#019</span>
                  <span className="serial-time">1 hr 35 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer disclaimer note */}
          <p className="queue-disclaimer-note">
            * Live data (demo) — times are estimates and may vary.
          </p>
        </article>
      </section>

      {/* 4. BOTTOM ROW: UPCOMING APPOINTMENTS & QR BOOKING OVERVIEW */}
      <section className="dashboard-bottom-grid">
        {/* Left: Upcoming Appointments Card */}
        <article className="dashboard-panel appointments-table-card">
          <div className="table-header-controls">
            <div className="table-title-group">
              <div className="table-title-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e5b869"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h2 className="panel-title">Upcoming Appointments</h2>
            </div>

            <div className="table-filter-actions">
              {/* Search bar inside table header */}
              <div className="table-search-box">
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search by name, service or staff..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="table-search-input"
                />
              </div>

              {/* All Services dropdown filter */}
              <button type="button" className="table-filter-pill">
                <span>{selectedService}</span>
                <ChevronDown size={13} className="text-muted" />
              </button>

              {/* All Status dropdown filter */}
              <button type="button" className="table-filter-pill">
                <span>{selectedStatus}</span>
                <ChevronDown size={13} className="text-muted" />
              </button>

              {/* View All Link */}
              <Link href={ROUTES.appointments} className="table-view-all-link">
                View All &rarr;
              </Link>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-responsive-wrapper">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Service</th>
                  <th>Staff / Specialist</th>
                  <th>Appointment Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((row) => (
                    <tr key={row.id}>
                      {/* Patient Name with Avatar */}
                      <td className="client-cell">
                        <div className="client-avatar-wrapper">
                          <Image
                            src={row.avatar}
                            alt={row.clientName}
                            width={32}
                            height={32}
                            className="client-avatar-img"
                          />
                        </div>
                        <span className="client-name-text">{row.clientName}</span>
                      </td>

                      {/* Service */}
                      <td className="service-cell">{row.service}</td>

                      {/* Staff */}
                      <td className="staff-cell">{row.staff}</td>

                      {/* Time */}
                      <td className="time-cell">{row.time}</td>

                      {/* Status Badge */}
                      <td className="status-cell">
                        <span
                          className={`status-pill ${
                            row.status === "Confirmed" ? "status-confirmed" : "status-pending"
                          }`}
                        >
                          {row.status === "Pending" && <span className="status-dot-amber" />}
                          {row.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="actions-cell">
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="action-icon-button"
                            title="View details"
                            aria-label={`View ${row.clientName} details`}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-button"
                            title="Reschedule"
                            aria-label={`Reschedule ${row.clientName}`}
                          >
                            <CalendarDays size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-table-state">
                      No appointments matching &quot;{tableSearch}&quot; found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right: QR Booking Overview Card */}
        <article className="dashboard-panel qr-overview-card" id="qr-booking">
          <div className="panel-header-row">
            <div className="qr-header-title-box">
              <div className="qr-header-icon">
                <QrCode size={19} className="text-gold" />
              </div>
              <h2 className="panel-title">QR Booking Overview</h2>
            </div>
          </div>

          {/* QR Code and Scan Info */}
          <div className="qr-preview-row">
            <div className="qr-code-box">
              <Image
                src="/images/qr-code.svg"
                alt="QR Code for Instant Booking"
                width={86}
                height={86}
                className="qr-code-img"
              />
            </div>
            <div className="qr-scan-copy">
              <h3 className="qr-scan-title">Scan to Book Instantly</h3>
              <p className="qr-scan-desc">
                Let your patients book an appointment by scanning the QR code.
              </p>
            </div>
          </div>

          {/* Total QR Bookings Stats */}
          <div className="qr-stats-row">
            <div className="qr-stat-icon-box">
              <CalendarDays size={19} className="text-gold" />
            </div>
            <div className="qr-stat-data">
              <span className="qr-stat-label">Total QR Bookings</span>
              <div className="qr-stat-val-group">
                <span className="qr-stat-count">276</span>
                <span className="qr-trend-badge">
                  ↑ 24% <span className="trend-context">vs. last 7 days</span>
                </span>
              </div>
            </div>
          </div>

          {/* View Booking Page Button */}
          <div className="qr-button-container">
            <Link href={ROUTES.book} className="view-booking-page-button">
              <span>View Booking Page</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
