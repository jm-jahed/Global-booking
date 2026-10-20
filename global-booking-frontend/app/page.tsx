"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

/* =========================================================================
   GOLDEN HEART + PULSE (ECG) BRAND EMBLEM (MATCHING REFERENCE LOGO)
   ========================================================================= */
function GoldenHeartPulseLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="heartGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9E0" />
          <stop offset="35%" stopColor="#F5D77F" />
          <stop offset="70%" stopColor="#D4AE47" />
          <stop offset="100%" stopColor="#8C6619" />
        </linearGradient>
        <filter id="heartGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#heartGlow)">
        <path
          d="M50 86 C25 68 12 52 12 34 C12 19 23 10 37 10 C44 10 50 14 50 14 C50 14 56 10 63 10 C77 10 88 19 88 34 C88 52 75 68 50 86 Z"
          stroke="url(#heartGoldGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(212, 174, 71, 0.05)"
        />
        <path
          d="M26 44 L38 44 L44 28 L50 58 L56 34 L62 44 L74 44"
          stroke="url(#heartGoldGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default function HomePage() {
  const [activeModal, setActiveModal] = useState<"doctor" | "hospital" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="homepage-viewport-container">
      {/* ===================================================================
          1. HEADER / NAVIGATION BAR
          =================================================================== */}
      <header className="site-header">
        <div className="header-inner">
          {/* Brand Logo & Name */}
          <Link href="/" className="brand-group">
            <GoldenHeartPulseLogo size={42} />
            <div className="brand-labels">
              <span className="brand-title">GLOBAL BOOKING</span>
              <span className="brand-subtitle">HEALTHCARE PRACTICE PLATFORM</span>
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
          <div className="header-actions">
            <Link href="/login" className="sign-in-btn">
              <User size={18} className="sign-in-icon" />
              <span>Sign In</span>
            </Link>

            <button
              type="button"
              className="get-started-btn"
              onClick={() => setActiveModal("doctor")}
            >
              Get Started
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
            <button
              type="button"
              onClick={() => {
                setActiveModal("doctor");
                setMobileMenuOpen(false);
              }}
            >
              For Doctors — What You Get
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveModal("hospital");
                setMobileMenuOpen(false);
              }}
            >
              For Hospitals & Clinics — What You Get
            </button>
            <div className="mobile-drawer-divider" />
            <Link
              href="/login"
              className="mobile-login"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LogIn size={16} />
              <span>Sign In (/login)</span>
            </Link>
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
            <span className="hero-pretitle">YOUR HEALTHCARE PRACTICE.</span>

            <h1 className="hero-headline">
              <span className="serif-italic-title">Digitally Connected.</span>
            </h1>

            <p className="hero-description">
              GLOBAL BOOKING helps doctors build their professional online presence and
              helps hospitals and clinics showcase their facilities while making online
              appointments easier for patients.
            </p>

            <div className="hero-cta-group">
              {/* Button 1: For Doctors (Gold Pill) */}
              <button
                type="button"
                className="cta-pill-gold"
                onClick={() => setActiveModal("doctor")}
              >
                <span className="cta-icon-avatar">👨‍⚕️</span>
                <span>For Doctors</span>
                <ArrowRight size={14} className="cta-arrow" />
              </button>

              {/* Button 2: For Hospitals & Clinics (Dark Pill with Gold Border) */}
              <button
                type="button"
                className="cta-pill-dark"
                onClick={() => setActiveModal("hospital")}
              >
                <Building2 size={16} className="cta-gold-icon" />
                <span>For Hospitals & Clinics</span>
                <ArrowRight size={14} className="cta-arrow" />
              </button>

              {/* Button 3: Sign In to Practice (Links to /login) */}
              <Link href="/login" className="cta-pill-dark">
                <LogIn size={15} className="cta-gold-icon" />
                <span>Sign In to Practice</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Exact Photographic Workspace Composition */}
          <div className="hero-image-col">
            <div
              className="hero-scene-crop"
              role="img"
              aria-label="Doctor in modern medical facility holding tablet, with booking laptop, patient smartphone app, and QR code standee"
            />
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
              <stop offset="0%" stopColor="#8C6619" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#F5D77F" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFF9E0" stopOpacity="1" />
              <stop offset="75%" stopColor="#F5D77F" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8C6619" stopOpacity="0.3" />
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
          <div className="feature-card">
            <div className="card-thumb-doc" aria-hidden="true" />
            <div className="card-info">
              <span className="card-eyebrow">FOR DOCTORS & SPECIALISTS</span>
              <h3 className="card-title-serif">What You Get</h3>
              <p className="card-text">
                Expand your reach, elevate your professional reputation, and simplify
                patient appointments with tools crafted for modern medical practitioners.
              </p>
              <button
                type="button"
                className="card-explore-btn"
                onClick={() => setActiveModal("doctor")}
              >
                <span>Explore Doctor Benefits</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 2: For Hospitals & Clinics */}
          <div className="feature-card">
            <div className="card-thumb-hosp" aria-hidden="true" />
            <div className="card-info">
              <span className="card-eyebrow">FOR HOSPITALS & CLINICS</span>
              <h3 className="card-title-serif">What You Get</h3>
              <p className="card-text">
                Centralize outpatient intake, present your specialized medical departments,
                and connect your consultation suites with an organized digital front desk.
              </p>
              <button
                type="button"
                className="card-explore-btn"
                onClick={() => setActiveModal("hospital")}
              >
                <span>Explore Hospital Benefits</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. 5-ITEM TRUST & CAPABILITY STRIP
          =================================================================== */}
      <section className="trust-strip">
        <div className="trust-inner">
          <div className="trust-cell">
            <Calendar size={18} className="trust-ic" />
            <div className="trust-copy">
              <strong>Online Appointments</strong>
              <span>Book. Visit. Stay Healthy.</span>
            </div>
          </div>
          <span className="trust-v-bar" aria-hidden="true">|</span>

          <div className="trust-cell">
            <ShieldCheck size={18} className="trust-ic" />
            <div className="trust-copy">
              <strong>Doctor Portfolios</strong>
              <span>Practice Timetables & Profiles</span>
            </div>
          </div>
          <span className="trust-v-bar" aria-hidden="true">|</span>

          <div className="trust-cell">
            <Building2 size={18} className="trust-ic" />
            <div className="trust-copy">
              <strong>Healthcare Facilities</strong>
              <span>Outpatient Intake & Departments</span>
            </div>
          </div>
          <span className="trust-v-bar" aria-hidden="true">|</span>

          <div className="trust-cell">
            <Lock size={17} className="trust-ic" />
            <div className="trust-copy">
              <strong>Protected Access</strong>
              <span>Secure Practice Accounts</span>
            </div>
          </div>
          <span className="trust-v-bar" aria-hidden="true">|</span>

          <div className="trust-cell">
            <HeartPulse size={18} className="trust-ic" />
            <div className="trust-copy">
              <strong>Connected Practice</strong>
              <span>Accessible. Structured. Global.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. PHOTOGRAPHIC GOLDEN NIGHT CITY SKYLINE FOOTER
          =================================================================== */}
      <footer className="skyline-footer">
        <div className="skyline-photo-band" aria-hidden="true" />
        <div className="footer-links-row">
          <button type="button" onClick={() => setActiveModal("doctor")}>For Doctors</button>
          <span>•</span>
          <button type="button" onClick={() => setActiveModal("hospital")}>For Hospitals & Clinics</button>
          <span>•</span>
          <Link href="/login">Patient Sign In</Link>
          <span>•</span>
          <Link href="/privacy">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms">Terms of Service</Link>
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
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close details"
            >
              <X size={20} />
            </button>

            {activeModal === "doctor" ? (
              <>
                <div className="modal-top">
                  <span className="modal-badge gold-badge">FOR DOCTORS & SPECIALISTS</span>
                  <h2 className="modal-heading">
                    For Doctors — <span className="modal-serif-gold">What You Get</span>
                  </h2>
                  <p className="modal-subtext">
                    Dedicated digital tools designed to elevate your personal practice,
                    simplify patient intake, and manage chamber timetables.
                  </p>
                </div>

                <div className="modal-benefits-grid">
                  <div className="modal-item">
                    <div className="modal-item-head">
                      <QrCode size={20} className="modal-ic-gold" />
                      <h4>Benefit A: QR Code + Doctor Portfolio</h4>
                    </div>
                    <p>
                      A custom professional portfolio page highlighting your degrees,
                      chamber visiting hours, and services, paired with an acrylic QR standee
                      patients can scan to view your profile and book appointments directly.
                    </p>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-head">
                      <Lock size={20} className="modal-ic-gold" />
                      <h4>Benefit B: Doctor Login</h4>
                    </div>
                    <p>
                      Private access via our proven login portal at <code>/login</code> to
                      manage visiting timetables, view upcoming patient bookings, and update
                      practice details with zero technical setup.
                    </p>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-head">
                      <UserCheck size={20} className="modal-ic-gold" />
                      <h4>Benefit C: Patient Login + Online Booking</h4>
                    </div>
                    <p>
                      Patients log in smoothly, search by doctor name or specialty, and
                      secure their consultation slot online with clear visiting schedules.
                    </p>
                  </div>
                </div>

                <div className="modal-action-bar">
                  <Link href="/login" className="modal-cta-btn gold-cta">
                    <LogIn size={16} />
                    <span>Open Doctor Login (/login)</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="modal-top">
                  <span className="modal-badge emerald-badge">FOR HOSPITALS & CLINICS</span>
                  <h2 className="modal-heading">
                    For Hospitals & Clinics — <span className="modal-serif-gold">What You Get</span>
                  </h2>
                  <p className="modal-subtext">
                    Institutional management tools to showcase specialized clinical
                    wings, streamline OPD intake, and connect consultation chambers.
                  </p>
                </div>

                <div className="modal-benefits-grid">
                  <div className="modal-item">
                    <div className="modal-item-head">
                      <QrCode size={20} className="modal-ic-emerald" />
                      <h4>Benefit A: QR Code + Hospital Page</h4>
                    </div>
                    <p>
                      A facility profile highlighting medical departments, OPD hours,
                      and consultant rosters, with a custom QR code for your reception
                      desk and lobby displays.
                    </p>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-head">
                      <Lock size={20} className="modal-ic-emerald" />
                      <h4>Benefit B: Hospital Login</h4>
                    </div>
                    <p>
                      Administrative login through <code>/login</code> to coordinate
                      department consultation hours, update clinic guidelines, and manage
                      doctor schedules in real time.
                    </p>
                  </div>

                  <div className="modal-item">
                    <div className="modal-item-head">
                      <UserCheck size={20} className="modal-ic-emerald" />
                      <h4>Benefit C: Patient Login + Online Booking</h4>
                    </div>
                    <p>
                      Patients choose the required clinical department, log in, and book
                      confirmed outpatient visits, reducing lobby overcrowding.
                    </p>
                  </div>
                </div>

                <div className="modal-action-bar">
                  <Link href="/login" className="modal-cta-btn gold-cta">
                    <Building2 size={16} />
                    <span>Open Hospital Login (/login)</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          SCOPED STYLING SYSTEM (EXACT REFERENCE DESIGN SPECIFICATION)
          =================================================================== */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Playfair+Display:ital,wght@1,600;1,700;1,800&display=swap');

        .homepage-viewport-container {
          min-height: 100vh;
          background: #080a0f;
          color: #f1f5f9;
          font-family: var(--font-inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ---------------- Header ---------------- */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(8, 10, 15, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(212, 174, 71, 0.22);
        }
        .header-inner {
          max-width: 1220px;
          margin: 0 auto;
          padding: 12px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .brand-labels {
          display: flex;
          flex-direction: column;
        }
        .brand-title {
          font-family: 'Cinzel', serif, Georgia;
          font-size: 1.22rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #f6d884;
          line-height: 1.1;
        }
        .brand-subtitle {
          font-size: 0.6rem;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .center-nav {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .nav-link-btn {
          background: none;
          border: none;
          color: #cbd5e1;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          padding: 6px 4px;
          transition: color 0.15s;
        }
        .nav-link-btn:hover {
          color: #f6d884;
        }
        .nav-sep {
          color: rgba(255, 255, 255, 0.22);
          font-size: 0.85rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sign-in-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #f1f5f9;
          font-size: 0.88rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s;
        }
        .sign-in-btn:hover {
          color: #f6d884;
        }
        .sign-in-icon {
          color: #f6d884;
        }
        .get-started-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 22px;
          border-radius: 9999px;
          font-size: 0.84rem;
          font-weight: 700;
          color: #111827;
          background: linear-gradient(135deg, #fff7cc 0%, #f5d77f 40%, #d4ae47 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(212, 174, 71, 0.35);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .get-started-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(212, 174, 71, 0.48);
        }

        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 4px;
        }
        .mobile-drawer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px 28px 20px;
          background: #0c1018;
          border-bottom: 1px solid rgba(212, 174, 71, 0.2);
        }
        .mobile-drawer button {
          background: none;
          border: none;
          color: #cbd5e1;
          font-size: 0.92rem;
          text-align: left;
          cursor: pointer;
          padding: 6px 0;
        }
        .mobile-drawer-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 0;
        }
        .mobile-login {
          color: #f6d884;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-size: 0.92rem;
        }

        /* ---------------- Hero Section ---------------- */
        .hero-section {
          padding: 30px 24px 10px;
        }
        .hero-container {
          max-width: 1220px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 36px;
          align-items: center;
        }

        .hero-text-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 2;
        }
        .hero-pretitle {
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #d4ae47;
          margin-bottom: 6px;
        }
        .hero-headline {
          margin: 0 0 14px;
          line-height: 1.1;
        }
        .serif-italic-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-weight: 700;
          font-size: 3.4rem;
          background: linear-gradient(135deg, #ffffff 10%, #fff1ba 50%, #e6be50 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.01em;
          display: inline-block;
          filter: drop-shadow(0 2px 14px rgba(212, 174, 71, 0.25));
        }
        .hero-description {
          font-size: 0.94rem;
          line-height: 1.55;
          color: #cbd5e1;
          margin-bottom: 22px;
          max-width: 480px;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
        }
        .cta-pill-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #111827;
          background: linear-gradient(135deg, #fff7cc 0%, #f5d77f 40%, #d4ae47 100%);
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(212, 174, 71, 0.38);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .cta-pill-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 174, 71, 0.52);
        }
        .cta-icon-avatar {
          font-size: 0.95rem;
        }
        .cta-arrow {
          transition: transform 0.15s;
        }
        .cta-pill-gold:hover .cta-arrow {
          transform: translateX(3px);
        }

        .cta-pill-dark {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #f1f5f9;
          background: rgba(18, 24, 38, 0.85);
          border: 1px solid rgba(212, 174, 71, 0.6);
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .cta-pill-dark:hover {
          background: rgba(212, 174, 71, 0.18);
          border-color: #f6d884;
          transform: translateY(-2px);
          color: #f6d884;
        }
        .cta-gold-icon {
          color: #f5d77f;
          display: inline-flex;
          align-items: center;
        }

        /* Hero Right Scene (Photographic Master Crop) */
        .hero-image-col {
          display: flex;
          justify-content: flex-end;
        }
        .hero-scene-crop {
          width: 560px;
          height: 380px;
          background-image: url('/images/global-booking-home.jpg');
          background-position: -464px -65px;
          background-size: 1024px 682px;
          background-repeat: no-repeat;
          border-radius: 14px;
          border: 1px solid rgba(212, 174, 71, 0.25);
          box-shadow:
            0 12px 36px rgba(0, 0, 0, 0.8),
            0 0 45px rgba(212, 174, 71, 0.15);
          mask-image: linear-gradient(to right, transparent 0%, black 5%, black 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 100%);
          position: relative;
        }

        /* ---------------- Curved Ribbon Divider ---------------- */
        .curved-divider-wrapper {
          width: 100%;
          height: 38px;
          position: relative;
          z-index: 5;
          margin-top: -12px;
          overflow: hidden;
        }
        .curved-ribbon-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* ---------------- Feature Cards Deck ---------------- */
        .feature-cards-deck {
          position: relative;
          z-index: 6;
          padding: 8px 24px 18px;
          background: radial-gradient(ellipse at 50% 0%, rgba(212, 174, 71, 0.06) 0%, rgba(8, 10, 15, 0) 70%);
        }
        .deck-container {
          max-width: 1220px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }
        .feature-card {
          background: linear-gradient(135deg, rgba(16, 22, 34, 0.94) 0%, rgba(9, 13, 20, 0.98) 100%);
          border: 1px solid rgba(212, 174, 71, 0.42);
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.55),
            inset 0 0 20px rgba(212, 174, 71, 0.05);
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover {
          transform: translateY(-2px);
          border-color: rgba(245, 215, 127, 0.7);
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.7),
            0 0 25px rgba(212, 174, 71, 0.2);
        }

        /* Card Thumbnails (Direct Photographic Crops from Reference Mockup) */
        .card-thumb-doc {
          width: 132px;
          height: 94px;
          flex-shrink: 0;
          border-radius: 10px;
          background-image: url('/images/global-booking-home.jpg');
          background-position: -48px -476px;
          background-size: 1024px 682px;
          background-repeat: no-repeat;
          border: 1px solid rgba(212, 174, 71, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .card-thumb-hosp {
          width: 132px;
          height: 94px;
          flex-shrink: 0;
          border-radius: 10px;
          background-image: url('/images/global-booking-home.jpg');
          background-position: -540px -476px;
          background-size: 1024px 682px;
          background-repeat: no-repeat;
          border: 1px solid rgba(212, 174, 71, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .card-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
        }
        .card-eyebrow {
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #d4ae47;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .card-title-serif {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-weight: 700;
          font-size: 1.32rem;
          color: #ffffff;
          margin: 0 0 4px;
          line-height: 1.15;
        }
        .card-text {
          font-size: 0.78rem;
          line-height: 1.42;
          color: #94a3b8;
          margin: 0 0 9px;
        }
        .card-explore-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #f6d884;
          background: rgba(212, 174, 71, 0.08);
          border: 1px solid rgba(212, 174, 71, 0.45);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .card-explore-btn:hover {
          background: rgba(212, 174, 71, 0.22);
          border-color: #f6d884;
          transform: translateX(2px);
        }

        /* ---------------- Trust Strip ---------------- */
        .trust-strip {
          position: relative;
          z-index: 6;
          border-top: 1px solid rgba(212, 174, 71, 0.18);
          border-bottom: 1px solid rgba(212, 174, 71, 0.18);
          background: rgba(6, 8, 12, 0.9);
          padding: 10px 24px;
        }
        .trust-inner {
          max-width: 1220px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .trust-cell {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .trust-ic {
          color: #f6d884;
          flex-shrink: 0;
        }
        .trust-copy {
          display: flex;
          flex-direction: column;
        }
        .trust-copy strong {
          font-size: 0.78rem;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: 0.01em;
        }
        .trust-copy span {
          font-size: 0.67rem;
          color: #94a3b8;
          margin-top: 1px;
        }
        .trust-v-bar {
          color: rgba(212, 174, 71, 0.35);
          font-size: 0.9rem;
        }

        /* ---------------- Skyline Footer ---------------- */
        .skyline-footer {
          position: relative;
          background: #040507;
          overflow: hidden;
          padding-bottom: 14px;
        }
        .skyline-photo-band {
          width: 100%;
          height: 65px;
          background-image: url('/images/global-booking-home.jpg');
          background-position: center bottom;
          background-size: 100% auto;
          background-repeat: no-repeat;
        }
        .footer-links-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 0.76rem;
          color: #64748b;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .footer-links-row button {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.76rem;
          cursor: pointer;
          padding: 2px 0;
          transition: color 0.15s;
        }
        .footer-links-row button:hover,
        .footer-links-row a:hover {
          color: #f6d884;
        }
        .footer-links-row a {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s;
        }

        /* ---------------- Luxury Benefit Modals ---------------- */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
          background: rgba(4, 6, 10, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-card {
          width: 100%;
          max-width: 680px;
          background: linear-gradient(145deg, #0e141f 0%, #080b11 100%);
          border: 1px solid rgba(212, 174, 71, 0.45);
          border-radius: 18px;
          padding: 28px 32px;
          position: relative;
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.9),
            0 0 40px rgba(212, 174, 71, 0.2);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .modal-close-btn:hover {
          background: rgba(212, 174, 71, 0.2);
          color: #f6d884;
        }

        .modal-top {
          margin-bottom: 20px;
        }
        .modal-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }
        .gold-badge {
          background: rgba(212, 174, 71, 0.15);
          color: #f6d884;
          border: 1px solid rgba(212, 174, 71, 0.4);
        }
        .emerald-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .modal-heading {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 0 0 6px;
          color: #ffffff;
        }
        .modal-serif-gold {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          color: #f6d884;
        }
        .modal-subtext {
          font-size: 0.86rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
        }

        .modal-benefits-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }
        .modal-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .modal-item-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .modal-item-head h4 {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .modal-ic-gold {
          color: #f6d884;
        }
        .modal-ic-emerald {
          color: #6ee7b7;
        }
        .modal-item p {
          margin: 0;
          font-size: 0.82rem;
          color: #94a3b8;
          line-height: 1.48;
        }
        .modal-item code {
          background: rgba(0, 0, 0, 0.4);
          color: #f6d884;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .modal-action-bar {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 16px;
        }
        .modal-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border-radius: 9999px;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .gold-cta {
          color: #111827;
          background: linear-gradient(135deg, #fff7cc 0%, #f5d77f 40%, #d4ae47 100%);
          box-shadow: 0 4px 14px rgba(212, 174, 71, 0.35);
        }
        .gold-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(212, 174, 71, 0.48);
        }

        /* ---------------- Responsive Breakpoints ---------------- */
        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-text-col {
            align-items: center;
          }
          .hero-cta-group {
            justify-content: center;
          }
          .hero-image-col {
            justify-content: center;
          }
          .deck-container {
            grid-template-columns: 1fr;
          }
          .trust-inner {
            justify-content: center;
            gap: 16px;
          }
          .trust-v-bar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .center-nav {
            display: none;
          }
          .mobile-toggle {
            display: block;
          }
          .serif-italic-title {
            font-size: 2.6rem;
          }
          .hero-scene-crop {
            width: 100%;
            height: 280px;
            background-size: cover;
            background-position: center;
          }
          .feature-card {
            flex-direction: column;
            text-align: center;
          }
          .card-info {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
