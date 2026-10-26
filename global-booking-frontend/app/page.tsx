"use client";

import React, { useState } from "react";
import Link from "next/link";
import "./home.css";
import {
  Calendar,
  ShieldCheck,
  Building2,
  Lock,
  HeartPulse,
  ArrowRight,
  User,
  X,
  QrCode,
  UserCheck,
  CheckCircle2,
  LogIn,
  ChevronRight,
  Menu,
  Clock,
  Star,
  MapPin,
  Sparkles,
  Activity,
} from "lucide-react";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useTranslation } from "@/lib/i18n/i18n-context";

/* =========================================================================
   HEALTHCARE PULSE (ECG) BRAND EMBLEM (MATCHING DR. PORTFOLIO THEME)
   ========================================================================= */
function HealthcarePulseLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size, flexShrink: 0, display: "block" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pulseIndigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#pulseGlow)">
        <path
          d="M50 86 C25 68 12 52 12 34 C12 19 23 10 37 10 C44 10 50 14 50 14 C50 14 56 10 63 10 C77 10 88 19 88 34 C88 52 75 68 50 86 Z"
          stroke="url(#pulseIndigoGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(99, 102, 241, 0.08)"
        />
        <path
          d="M26 44 L38 44 L44 28 L50 58 L56 34 L62 44 L74 44"
          stroke="url(#pulseIndigoGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default function HomePage() {
  const { t: tHome } = useTranslation("home");
  const { t: tNav } = useTranslation("nav");
  const { t: tCommon } = useTranslation("common");

  const [activeModal, setActiveModal] = useState<"doctor" | "hospital" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string>("11:30 AM");
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);

  const days = [
    { label: "Today", date: "Thu 22" },
    { label: "Tomorrow", date: "Fri 23" },
    { label: "Sat", date: "Sat 24" },
  ];

  const slots = [
    { time: "09:30 AM", badge: false },
    { time: "11:30 AM", badge: true },
    { time: "04:00 PM", badge: false },
    { time: "05:30 PM", badge: false },
  ];

  return (
    <div className="homepage-viewport-container">
      {/* Ambient background lavender/indigo gradients matching doctor portfolio */}
      <div className="ambient-orb orb-1" aria-hidden="true" />
      <div className="ambient-orb orb-2" aria-hidden="true" />
      <div className="ambient-orb orb-3" aria-hidden="true" />

      {/* ===================================================================
          1. HEADER / NAVIGATION BAR
          =================================================================== */}
      <header className="site-header">
        <div className="header-inner">
          {/* Brand Logo & Name */}
          <Link href="/" className="brand-group">
            <HealthcarePulseLogo size={42} />
            <div className="brand-labels">
              <span className="brand-title">GLOBAL BOOKING</span>
              <span className="brand-subtitle">{tCommon("appTagline", undefined, "HEALTHCARE PRACTICE PLATFORM")}</span>
            </div>
          </Link>

          {/* Center Navigation */}
          <nav className="center-nav" aria-label="Main Navigation">
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => setActiveModal("doctor")}
            >
              For Doctors
            </button>
            <span className="nav-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => setActiveModal("hospital")}
            >
              For Hospitals & Clinics
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Global Multilingual Selector */}
            <LanguageSelector variant="header" />

            <Link href="/login" className="sign-in-btn">
              <User size={18} className="sign-in-icon" />
              <span>{tNav("login", undefined, "Sign In")}</span>
            </Link>

            <button
              type="button"
              className="get-started-btn"
              onClick={() => setActiveModal("doctor")}
            >
              {tHome("bookAppointment", undefined, "Get Started")}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-eyebrow">PRACTICE SOLUTIONS</span>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-nav-items">
              <button
                type="button"
                className="mobile-nav-card doc-nav-card"
                onClick={() => {
                  setActiveModal("doctor");
                  setMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon doc-bg">
                  <span style={{ fontSize: 18 }}>👨‍⚕️</span>
                </div>
                <div className="mobile-nav-text">
                  <strong>For Doctors & Specialists</strong>
                  <span>Branded portfolio URL + acrylic QR standee</span>
                </div>
                <ChevronRight size={16} className="mobile-nav-arrow" />
              </button>

              <button
                type="button"
                className="mobile-nav-card hosp-nav-card"
                onClick={() => {
                  setActiveModal("hospital");
                  setMobileMenuOpen(false);
                }}
              >
                <div className="mobile-nav-icon hosp-bg">
                  <Building2 size={18} />
                </div>
                <div className="mobile-nav-text">
                  <strong>For Hospitals & Clinics</strong>
                  <span>Multi-department intake & OPD kiosks</span>
                </div>
                <ChevronRight size={16} className="mobile-nav-arrow" />
              </button>

              <Link
                href="/dr-jahedul-islam"
                className="mobile-nav-card sample-nav-card"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="mobile-nav-icon sample-bg">
                  <Sparkles size={16} />
                </div>
                <div className="mobile-nav-text">
                  <strong>Sample Doctor Portfolio</strong>
                  <span>View live verified practice showcase</span>
                </div>
                <ChevronRight size={16} className="mobile-nav-arrow" />
              </Link>
            </div>

            <div className="mobile-drawer-footer" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Language / ভাষা:</span>
                <LanguageSelector variant="compact" />
              </div>
              <Link
                href="/login"
                className="mobile-login-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={16} />
                <span>Doctor & Staff Sign In (/login)</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================
          2. HERO SECTION — TWO COLUMNS (TYPOGRAPHY + MASTER WORKSPACE SCENE)
          =================================================================== */}
      <section className="hero-section">
        <div className="hero-container">
          {/* Left Column: Real Typography, Description & 3 Interactive CTAs */}
          <div className="hero-text-col">
            <span className="hero-pretitle">{tHome("badge", undefined, "YOUR HEALTHCARE PRACTICE.")}</span>

            <h1 className="hero-headline">
              <span className="serif-italic-title">{tHome("heroHeadline", undefined, "Digitally Connected.")}</span>
            </h1>

            <p className="hero-description">
              {tHome("heroDescription", undefined, "GLOBAL BOOKING helps doctors build their professional online presence and helps hospitals and clinics showcase their facilities while making online appointments easier for patients.")}
            </p>

            <div className="hero-cta-group">
              {/* Button 1: For Doctors (Gold Pill) */}
              <button
                type="button"
                className="cta-pill-gold"
                onClick={() => setActiveModal("doctor")}
              >
                <span className="cta-icon-avatar">👨‍⚕️</span>
                <span>{tHome("forDoctors", undefined, "For Doctors")}</span>
                <ArrowRight size={14} className="cta-arrow" />
              </button>

              {/* Button 2: For Hospitals & Clinics (Dark Pill with Gold Border) */}
              <button
                type="button"
                className="cta-pill-dark"
                onClick={() => setActiveModal("hospital")}
              >
                <Building2 size={16} className="cta-gold-icon" />
                <span>{tHome("forHospitals", undefined, "For Hospitals & Clinics")}</span>
                <ArrowRight size={14} className="cta-arrow" />
              </button>
            </div>
          </div>

          {/* Right Column: Premium Interactive Healthcare Practice Showcase */}
          <div className="hero-interactive-col">
            <div className="interactive-hero-wrapper">
              {/* Ambient background glow behind dashboard */}
              <div className="dashboard-glow-ring" aria-hidden="true" />

              {/* Floating Card: Live OPD Queue Pulse */}
              <div className="floating-badge float-top-left">
                <div className="badge-pulse-radar">
                  <span className="radar-core" />
                  <span className="radar-wave" />
                </div>
                <div className="badge-content">
                  <div className="badge-title">OPD Live Queue</div>
                  <div className="badge-sub">Token #14 with Doctor</div>
                </div>
                <span className="badge-tag">Chamber Live</span>
              </div>

              {/* Floating Card: QR Standee Acrylic Showcase */}
              <div className="floating-badge float-bottom-right">
                <div className="qr-mini-acrylic">
                  <QrCode size={19} className="qr-svg-icon" />
                </div>
                <div className="badge-content">
                  <div className="badge-title">Patient QR Check-In</div>
                  <div className="badge-sub">Scan to view profile & book</div>
                </div>
                <span className="badge-stars">
                  <Star size={11} fill="#f59e0b" color="#f59e0b" />
                  <span>4.9</span>
                </span>
              </div>

              {/* Main Glassmorphic Practice Showcase Card */}
              <div className="practice-master-card">
                {/* Top Doctor Profile Ribbon */}
                <div className="doctor-header-row">
                  <div className="doc-avatar-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=160&q=80"
                      alt="Dr. Jahedul Islam"
                      className="doc-avatar-img"
                    />
                    <span className="avatar-online-dot" title="Available for consult" />
                  </div>

                  <div className="doc-details-col">
                    <div className="doc-name-row">
                      <Link href="/dr-jahedul-islam" className="doc-title-link">
                        Dr. Jahedul Islam
                      </Link>
                      <span className="verified-shield" title="Verified Practitioner">
                        <ShieldCheck size={13} />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="doc-specialty-text">Consultant Interventional Cardiologist</div>
                    <div className="doc-chamber-info">
                      <MapPin size={12} className="loc-ic" />
                      <span>City General Hospital • Main Consultation Wing</span>
                    </div>
                  </div>
                </div>

                {/* Practice Metrics Bar */}
                <div className="practice-metrics-bar">
                  <div className="metric-item">
                    <span className="metric-val">12+ Yrs</span>
                    <span className="metric-lbl">{tHome("experience", undefined, "Experience")}</span>
                  </div>
                  <div className="metric-divider" />
                  <div className="metric-item">
                    <span className="metric-val">4.9 ★</span>
                    <span className="metric-lbl">{tHome("patientRating", undefined, "Patient Rating")}</span>
                  </div>
                  <div className="metric-divider" />
                  <div className="metric-item">
                    <span className="metric-val">500</span>
                    <span className="metric-lbl">{tHome("consultation", undefined, "Consultation")}</span>
                  </div>
                </div>

                {/* Date Selector Pills */}
                <div className="schedule-section">
                  <div className="schedule-header">
                    <span className="schedule-label">
                      <Calendar size={13} /> {tHome("selectChamberSchedule", undefined, "Select Chamber Schedule")}
                    </span>
                    <span className="live-slots-pill">{tHome("nextSlotToday", undefined, "Next Slot Today")}</span>
                  </div>

                  <div className="days-pills-row">
                    {days.map((d, idx) => (
                      <button
                        key={d.date}
                        type="button"
                        className={`day-pill ${selectedDay === idx ? "active" : ""}`}
                        onClick={() => {
                          setSelectedDay(idx);
                          setBookingConfirmed(false);
                        }}
                      >
                        <span className="day-name">{d.label}</span>
                        <span className="day-date">{d.date}</span>
                      </button>
                    ))}
                  </div>

                  {/* Time Slot Chips */}
                  <div className="time-slots-grid">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        className={`time-chip ${selectedSlot === s.time ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedSlot(s.time);
                          setBookingConfirmed(false);
                        }}
                      >
                        <Clock size={11} />
                        <span>{s.time}</span>
                        {s.badge && <span className="chip-badge">Fast</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Button & Live Feedback */}
                <div className="booking-action-footer">
                  {bookingConfirmed ? (
                    <div className="confirmed-toast">
                      <div className="toast-left">
                        <CheckCircle2 size={16} className="toast-check" />
                        <span>Slot Reserved ({selectedSlot})!</span>
                      </div>
                      <Link href="/dr-jahedul-islam" className="view-portfolio-link">
                        View Full Portfolio →
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="confirm-booking-btn"
                      onClick={() => setBookingConfirmed(true)}
                    >
                      <span>Confirm Appointment Slot ({selectedSlot})</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. CURVED GLOWING GOLD DIVIDER RIBBON
          =================================================================== */}
      <div className="curved-divider-wrapper" aria-hidden="true">
        <svg
          viewBox="0 0 1440 45"
          preserveAspectRatio="none"
          className="curved-ribbon-svg"
        >
          <defs>
            <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="25%" stopColor="#4f46e5" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#4f46e5" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15" />
            </linearGradient>
            <filter id="ribbonGlow" x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 0,32 Q 720,2 1440,32"
            fill="none"
            stroke="url(#ribbonGrad)"
            strokeWidth="3.2"
            filter="url(#ribbonGlow)"
          />
        </svg>
      </div>

      {/* ===================================================================
          4. TWO FEATURE HIGHLIGHT CARDS (WHAT YOU GET)
          =================================================================== */}
      <section className="feature-cards-deck">
        <div className="deck-container">
          {/* Card 1: For Doctors & Specialists */}
          <div className="feature-card doc-feature-card">
            {/* Ambient subtle card glow */}
            <div className="card-ambient-glow doc-glow" aria-hidden="true" />
            
            {/* Visual interactive preview widget */}
            <div className="card-visual-widget">
              <div className="widget-preview-box">
                <div className="widget-header-row">
                  <div className="widget-doc-avatar-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=160&q=80"
                      alt="Dr. Jahedul Islam"
                      className="widget-doc-avatar-img"
                    />
                    <span className="widget-online-dot" />
                  </div>
                  <div className="widget-doc-meta">
                    <div className="widget-name-row">
                      <strong className="widget-doc-name">Dr. Jahedul Islam</strong>
                      <span className="widget-verif-badge">✓ Verified</span>
                    </div>
                    <span className="widget-doc-spec">Consultant Cardiologist</span>
                  </div>
                </div>

                <div className="widget-tags-row">
                  <span className="widget-tag-pill highlight">
                    <QrCode size={11} />
                    <span>Instant Acrylic QR</span>
                  </span>
                  <span className="widget-tag-pill">
                    <Activity size={11} />
                    <span>Live Queue Sync</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Content & Action info */}
            <div className="card-info">
              <span className="card-eyebrow doc-eyebrow">
                <Sparkles size={11} className="card-eyebrow-icon" />
                <span>FOR DOCTORS & SPECIALISTS</span>
              </span>
              <h3 className="card-title-serif">
                Practice Excellence — <span className="title-gradient-doc">What You Get</span>
              </h3>
              <p className="card-text">
                Expand your patient reach, elevate your professional reputation, and manage
                chamber timetables with zero technical friction.
              </p>

              <ul className="card-bullets-list">
                <li>
                  <CheckCircle2 size={14} className="bullet-check doc-check" />
                  <span>Custom acrylic QR standee + branded portfolio URL</span>
                </li>
                <li>
                  <CheckCircle2 size={14} className="bullet-check doc-check" />
                  <span>Effortless consultation timetables & queue management</span>
                </li>
                <li>
                  <CheckCircle2 size={14} className="bullet-check doc-check" />
                  <span>Dedicated doctor practice login portal at <code>/login</code></span>
                </li>
              </ul>

              <div className="card-actions-row">
                <button
                  type="button"
                  className="card-explore-btn doc-explore-btn"
                  onClick={() => setActiveModal("doctor")}
                >
                  <span>Explore Doctor Benefits</span>
                  <ArrowRight size={14} className="btn-arrow" />
                </button>
                <Link href="/dr-jahedul-islam" className="card-link-secondary">
                  <span>View Sample Portfolio</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: For Hospitals & Clinics */}
          <div className="feature-card hosp-feature-card">
            {/* Ambient subtle card glow */}
            <div className="card-ambient-glow hosp-glow" aria-hidden="true" />

            {/* Visual interactive preview widget */}
            <div className="card-visual-widget">
              <div className="widget-preview-box hosp-box">
                <div className="widget-header-row">
                  <div className="widget-hosp-icon-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=160&q=80"
                      alt="Mediclinic City Hospital"
                      className="widget-doc-avatar-img"
                    />
                    <span className="widget-online-dot emerald" />
                  </div>
                  <div className="widget-doc-meta">
                    <div className="widget-name-row">
                      <strong className="widget-doc-name">Mediclinic City Hospital</strong>
                      <span className="widget-verif-badge emerald">Enterprise</span>
                    </div>
                    <span className="widget-doc-spec">Main Healthcare Center • OPD</span>
                  </div>
                </div>

                <div className="widget-tags-row">
                  <span className="widget-tag-pill emerald-pill">
                    <Building2 size={11} />
                    <span>Multi-Department</span>
                  </span>
                  <span className="widget-tag-pill emerald-pill">
                    <CheckCircle2 size={11} />
                    <span>Lobby QR Kiosk</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Content & Action info */}
            <div className="card-info">
              <span className="card-eyebrow hosp-eyebrow">
                <Building2 size={11} className="card-eyebrow-icon" />
                <span>FOR HOSPITALS & CLINICS</span>
              </span>
              <h3 className="card-title-serif">
                Institutional Care — <span className="title-gradient-hosp">What You Get</span>
              </h3>
              <p className="card-text">
                Centralize outpatient intake, showcase specialized medical departments, and
                connect consultation suites with an organized digital front desk.
              </p>

              <ul className="card-bullets-list">
                <li>
                  <CheckCircle2 size={14} className="bullet-check hosp-check" />
                  <span>Department rosters and multi-consultant chamber suites</span>
                </li>
                <li>
                  <CheckCircle2 size={14} className="bullet-check hosp-check" />
                  <span>Custom lobby QR display intake reducing reception congestion</span>
                </li>
                <li>
                  <CheckCircle2 size={14} className="bullet-check hosp-check" />
                  <span>Centralized clinic administrative portal at <code>/login</code></span>
                </li>
              </ul>

              <div className="card-actions-row">
                <button
                  type="button"
                  className="card-explore-btn hosp-explore-btn"
                  onClick={() => setActiveModal("hospital")}
                >
                  <span>Explore Hospital Benefits</span>
                  <ArrowRight size={14} className="btn-arrow" />
                </button>
                <Link href="/login" className="card-link-secondary hosp-secondary">
                  <span>Hospital Admin Login</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. 5-ITEM TRUST & CAPABILITY DOCK
          =================================================================== */}
      <section className="trust-strip-dock">
        <div className="trust-dock-inner">
          <div className="trust-cell-dock">
            <div className="trust-dock-icon-box ic-indigo">
              <Calendar size={18} />
            </div>
            <div className="trust-dock-copy">
              <strong>Online Appointments</strong>
              <span>Instant slot booking & zero clash</span>
            </div>
          </div>

          <div className="trust-cell-dock">
            <div className="trust-dock-icon-box ic-emerald">
              <ShieldCheck size={18} />
            </div>
            <div className="trust-dock-copy">
              <strong>Doctor Portfolios</strong>
              <span>Verified specialist credentials</span>
            </div>
          </div>

          <div className="trust-cell-dock">
            <div className="trust-dock-icon-box ic-sky">
              <Building2 size={18} />
            </div>
            <div className="trust-dock-copy">
              <strong>Healthcare Facilities</strong>
              <span>Modern OPD & department intake</span>
            </div>
          </div>

          <div className="trust-cell-dock">
            <div className="trust-dock-icon-box ic-amber">
              <Lock size={17} />
            </div>
            <div className="trust-dock-copy">
              <strong>Protected Access</strong>
              <span>HIPAA-ready security</span>
            </div>
          </div>

          <div className="trust-cell-dock">
            <div className="trust-dock-icon-box ic-rose">
              <HeartPulse size={18} />
            </div>
            <div className="trust-dock-copy">
              <strong>Connected Practice</strong>
              <span>Accessible. Structured. Global.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. LUXURY MIDNIGHT PRACTICE FOOTER
          =================================================================== */}
      <footer className="skyline-footer-premium">
        <div className="footer-glow-bar" aria-hidden="true" />
        <div className="footer-content-inner">
          <div className="footer-brand-row">
            <div className="footer-logo-group">
              <HealthcarePulseLogo size={32} />
              <div className="footer-brand-text">
                <span className="footer-brand-name">GLOBAL BOOKING</span>
                <span className="footer-brand-tag">HEALTHCARE PRACTICE PLATFORM</span>
              </div>
            </div>
            <div className="footer-status-pill">
              <span className="status-live-dot" />
              <span>All Systems Operational • HIPAA Compliant</span>
            </div>
          </div>

          <div className="footer-divider-line" />

          <div className="footer-bottom-row">
            <div className="footer-links-list">
              <button type="button" onClick={() => setActiveModal("doctor")}>For Doctors</button>
              <span className="footer-dot">•</span>
              <button type="button" onClick={() => setActiveModal("hospital")}>For Hospitals & Clinics</button>
              <span className="footer-dot">•</span>
              <Link href="/login">Doctor & Staff Login</Link>
              <span className="footer-dot">•</span>
              <Link href="/privacy">Privacy Policy</Link>
              <span className="footer-dot">•</span>
              <Link href="/terms">Terms of Service</Link>
            </div>
            <span className="footer-copyright-text">
              © {new Date().getFullYear()} GLOBAL BOOKING. All rights reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* ===================================================================
          7. LUXURY BENEFIT MODALS (FOR DOCTORS & FOR HOSPITALS)
          =================================================================== */}
      {activeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button with subtle hover micro-interaction */}
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {activeModal === "doctor" ? (
              <>
                <div className="modal-top">
                  <div className="modal-header-hero">
                    <div className="modal-icon-squircle doc-theme">
                      <span className="modal-icon-emoji">👨‍⚕️</span>
                    </div>
                    <div className="modal-title-col">
                      <div className="modal-badge gold-badge">
                        <Sparkles size={11} className="badge-sparkle-icon" />
                        <span>FOR DOCTORS & SPECIALISTS</span>
                      </div>
                      <h2 className="modal-heading">
                        For Doctors — <span className="modal-gradient-text">What You Get</span>
                      </h2>
                    </div>
                  </div>
                  <p className="modal-subtext">
                    Dedicated digital tools designed to elevate your personal practice,
                    simplify patient intake, and manage chamber timetables with effortless precision.
                  </p>
                </div>

                {/* Benefits List Cards */}
                <div className="modal-benefits-grid">
                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box doc-accent">
                        <QrCode size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit A: QR Standee + Doctor Portfolio</h4>
                        <span className="benefit-pill">Live Link & Standee</span>
                      </div>
                      <p>
                        A custom professional portfolio page highlighting your degrees,
                        chamber visiting hours, and services, paired with an acrylic QR standee
                        patients can scan to view your profile and book appointments directly.
                      </p>
                    </div>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box doc-accent">
                        <Lock size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit B: Doctor Practice Login</h4>
                        <span className="benefit-pill">Secure Dashboard</span>
                      </div>
                      <p>
                        Private access via our proven login portal at <code>/login</code> to
                        manage visiting timetables, view upcoming patient bookings, and update
                        practice details with zero technical setup.
                      </p>
                    </div>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box doc-accent">
                        <UserCheck size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit C: Patient Login + Online Booking</h4>
                        <span className="benefit-pill">Instant Confirmation</span>
                      </div>
                      <p>
                        Patients log in smoothly, search by doctor name or specialty, and
                        secure their consultation slot online with clear visiting schedules.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Perks Strip */}
                <div className="modal-perks-strip">
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check" />
                    <span>Free Custom Acrylic QR Standee</span>
                  </div>
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check" />
                    <span>Instant URL (globalbooking.com/dr-name)</span>
                  </div>
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check" />
                    <span>Automated SMS & WhatsApp Reminders</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="modal-action-bar">
                  <Link
                    href="/dr-jahedul-islam"
                    className="modal-secondary-btn"
                    onClick={() => setActiveModal(null)}
                  >
                    <span>View Sample Doctor Profile</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link href="/login" className="modal-cta-btn gold-cta">
                    <LogIn size={16} />
                    <span>Open Doctor Login (/login)</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="modal-top">
                  <div className="modal-header-hero">
                    <div className="modal-icon-squircle hospital-theme">
                      <Building2 size={24} className="hospital-svg-emblem" />
                    </div>
                    <div className="modal-title-col">
                      <div className="modal-badge emerald-badge">
                        <ShieldCheck size={11} className="badge-sparkle-icon" />
                        <span>FOR HOSPITALS & CLINICS</span>
                      </div>
                      <h2 className="modal-heading">
                        For Hospitals & Clinics — <span className="modal-gradient-text emerald">What You Get</span>
                      </h2>
                    </div>
                  </div>
                  <p className="modal-subtext">
                    Institutional management tools to showcase specialized clinical
                    wings, streamline OPD intake, and connect consultation chambers seamlessly.
                  </p>
                </div>

                {/* Benefits List Cards */}
                <div className="modal-benefits-grid">
                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box hosp-accent">
                        <QrCode size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit A: QR Code + Hospital Facility Profile</h4>
                        <span className="benefit-pill emerald">Lobby Display</span>
                      </div>
                      <p>
                        A facility profile highlighting medical departments, OPD hours,
                        and consultant rosters, with a custom QR code for your reception
                        desk and lobby displays.
                      </p>
                    </div>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box hosp-accent">
                        <Lock size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit B: Hospital Admin Login</h4>
                        <span className="benefit-pill emerald">Full OPD Control</span>
                      </div>
                      <p>
                        Administrative login through <code>/login</code> to coordinate
                        department consultation hours, update clinic guidelines, and manage
                        doctor schedules in real time.
                      </p>
                    </div>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-left">
                      <div className="benefit-icon-box hosp-accent">
                        <UserCheck size={20} />
                      </div>
                    </div>
                    <div className="modal-item-body">
                      <div className="modal-item-header">
                        <h4>Benefit C: Patient Department Routing</h4>
                        <span className="benefit-pill emerald">Zero Overcrowding</span>
                      </div>
                      <p>
                        Patients choose the required clinical department, log in, and book
                        confirmed outpatient visits, reducing lobby overcrowding.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Perks Strip */}
                <div className="modal-perks-strip">
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check emerald" />
                    <span>Reception Desk Acrylic QR Standees</span>
                  </div>
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check emerald" />
                    <span>Department Roster Coordination</span>
                  </div>
                  <div className="perk-chip">
                    <CheckCircle2 size={13} className="perk-check emerald" />
                    <span>Centralized Multi-Chamber Intake</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="modal-action-bar">
                  <button
                    type="button"
                    className="modal-secondary-btn"
                    onClick={() => setActiveModal(null)}
                  >
                    <span>Close Window</span>
                  </button>
                  <Link href="/login" className="modal-cta-btn emerald-cta">
                    <Building2 size={16} />
                    <span>Open Hospital Login (/login)</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

