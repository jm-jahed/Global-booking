"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  MapPin,
  Clock,
  Calendar,
  GraduationCap,
  Award,
  Shield,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Heart,
  HeartHandshake,
  Activity,
  Microscope,
  Globe,
  Share2,
  Check,
  Star,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  Droplet,
  Zap,
  Sparkles,
  CreditCard,
  CheckCircle2,
  PhoneCall,
  FileText,
  BookOpen,
  Briefcase,
  Users,
  FileCheck,
  Menu,
  X,
} from "lucide-react";
import type { PublicDoctorProfile } from "@/lib/api/doctor-public-client";
import { getPublicDoctorProfile } from "@/lib/api/doctor-public-client";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { formatLocaleNumber } from "@/lib/i18n/formatters";

function getSpecialtyQuote(specialty?: string): string {
  const s = (specialty || "").toLowerCase();
  if (s.includes("cardio") || s.includes("heart")) return "Your Heart Our Priority";
  if (s.includes("pedia") || s.includes("child")) return "Your Child's Health Our Priority";
  if (s.includes("derm") || s.includes("skin")) return "Healthy Skin Our Priority";
  if (s.includes("neuro")) return "Neurological Health Our Priority";
  if (s.includes("ortho") || s.includes("bone")) return "Joint & Mobility Health Our Priority";
  if (s.includes("dent") || s.includes("oral")) return "Your Smile Our Priority";
  if (s.includes("eye") || s.includes("ophthalm")) return "Clear Vision Our Priority";
  return "Your Health Our Priority";
}

function getAboutQuote(specialty?: string): string {
  const s = (specialty || "").toLowerCase();
  if (s.includes("cardio") || s.includes("heart")) return "“Better heart health. A healthier tomorrow.”";
  if (s.includes("pedia") || s.includes("child")) return "“Nurturing growing lives with gentle, expert care.”";
  if (s.includes("derm") || s.includes("skin")) return "“Radiant skin health grounded in medical science.”";
  if (s.includes("neuro")) return "“Compassionate neuro care restoring vitality and wellness.”";
  return "“Personalized, compassionate clinical care for a healthier tomorrow.”";
}

interface DisplayServiceItem {
  title: string;
  sub?: string;
  category?: string;
  description?: string;
  icon: React.ReactNode;
}

function getDefaultSpecialtyServices(specialty?: string): DisplayServiceItem[] {
  const s = (specialty || "").toLowerCase();
  if (s.includes("cardio") || s.includes("heart")) {
    return [
      { title: "Heart Disease", sub: "Diagnosis & Treatment", category: "Cardiology", description: "Comprehensive diagnosis and management of acute and chronic heart conditions.", icon: <Heart size={22} color="#4f46e5" /> },
      { title: "Interventional", sub: "Cardiology Procedures", category: "Procedures", description: "Diagnostic catheterization, coronary angiogram, and minimally invasive cardiac interventions.", icon: <Activity size={22} color="#4f46e5" /> },
      { title: "Preventive Cardiology", sub: "Risk & Lifestyle Assessment", category: "Prevention", description: "Personalized cardiovascular risk scoring, lipid control, and preventive lifestyle guidance.", icon: <ShieldCheck size={22} color="#4f46e5" /> },
      { title: "Echocardiography", sub: "Advanced Cardiac Ultrasound", category: "Diagnostics", description: "High-resolution Doppler echocardiography and stress test evaluations.", icon: <Microscope size={22} color="#4f46e5" /> },
    ];
  }
  if (s.includes("pedia") || s.includes("child")) {
    return [
      { title: "Child Wellness", sub: "Routine Growth & Health Exams", category: "Pediatrics", description: "Routine health checks and developmental monitoring for infants, children, and teens.", icon: <Heart size={22} color="#4f46e5" /> },
      { title: "Immunizations", sub: "Global Vaccine Schedules", category: "Immunization", description: "Comprehensive childhood immunization programs adhering to international guidelines.", icon: <ShieldCheck size={22} color="#4f46e5" /> },
      { title: "Pediatric Acute Care", sub: "Fever, Infection & Urgent Care", category: "Acute Care", description: "Timely diagnosis and gentle treatment for pediatric fevers, coughs, and common infections.", icon: <Activity size={22} color="#4f46e5" /> },
      { title: "Developmental Screening", sub: "Milestone & Behavioral Tracking", category: "Development", description: "Early detection and supportive guidance for cognitive, motor, and speech development.", icon: <Microscope size={22} color="#4f46e5" /> },
    ];
  }
  if (s.includes("derm") || s.includes("skin")) {
    return [
      { title: "Clinical Dermatology", sub: "Acne, Eczema & Psoriasis Care", category: "Dermatology", description: "Advanced clinical therapies for acne, rosacea, eczema, and psoriasis management.", icon: <ShieldCheck size={22} color="#4f46e5" /> },
      { title: "Skin Cancer Screening", sub: "Mole Checks & Dermoscopy", category: "Oncology", description: "Full-body mole mapping, dermoscopy, and early skin lesion evaluations.", icon: <Microscope size={22} color="#4f46e5" /> },
      { title: "Aesthetic Procedures", sub: "Laser, Peels & Skin Rejuvenation", category: "Aesthetics", description: "Evidence-based dermatological rejuvenation and non-invasive corrective therapies.", icon: <Sparkles size={22} color="#4f46e5" /> },
      { title: "Hair & Scalp Health", sub: "Alopecia & Hair Loss Treatments", category: "Trichology", description: "Diagnostic evaluations and targeted medical treatments for hair and scalp disorders.", icon: <Activity size={22} color="#4f46e5" /> },
    ];
  }
  return [
    { title: "Specialist Consultation", sub: `Personalized ${specialty || "Clinical"} Care`, category: "Consultation", description: `Comprehensive evaluation and tailored clinical care for ${specialty || "medical"} conditions.`, icon: <Stethoscope size={22} color="#4f46e5" /> },
    { title: "Diagnostic Evaluation", sub: "Evidence-Based Clinical Testing", category: "Diagnostics", description: "Evidence-based diagnostic testing and detailed review of patient clinical history.", icon: <Microscope size={22} color="#4f46e5" /> },
    { title: "Preventive Healthcare", sub: "Comprehensive Health Screenings", category: "Preventive", description: "Proactive screening strategies to detect and prevent potential health complications.", icon: <ShieldCheck size={22} color="#4f46e5" /> },
    { title: "Treatment Planning", sub: "Customized Clinical Therapy", category: "Therapeutics", description: "Long-term therapeutic management and personalized patient recovery protocols.", icon: <Activity size={22} color="#4f46e5" /> },
  ];
}

export interface DoctorPublicPortfolioProps {
  readonly slug: string;
  readonly initialData?: PublicDoctorProfile | null;
}

export function DoctorPublicPortfolio({
  slug,
  initialData = null,
}: DoctorPublicPortfolioProps) {
  const { t: tPortal, locale } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const [profile, setProfile] = useState<PublicDoctorProfile | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [notFoundState, setNotFoundState] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<string>("English");
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setProfile(initialData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPublicDoctorProfile(slug)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProfile(data);
          setNotFoundState(false);
        } else {
          setNotFoundState(true);
        }
      })
      .catch(() => {
        if (isMounted) setNotFoundState(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, initialData]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const formatFee = (fee: any): { initial: string; followUp: string } => {
    if (!fee) return { initial: "500", followUp: "350" };
    if (typeof fee.amount === "number" && fee.amount > 0) {
      return {
        initial: `${fee.amount}`,
        followUp: `${Math.round(fee.amount * 0.75)}`,
      };
    }
    if (typeof fee.amountInFils === "number" && fee.amountInFils > 0) {
      const amt = fee.amountInFils / 100;
      return {
        initial: `${amt}`,
        followUp: `${Math.round(amt * 0.75)}`,
      };
    }
    if (typeof fee.formatted === "string" && fee.formatted.trim()) {
      const cleanFormatted = fee.formatted.replace(/[^\d.,]/g, "").trim();
      return {
        initial: cleanFormatted || fee.formatted,
        followUp: cleanFormatted || fee.formatted,
      };
    }
    return { initial: "500", followUp: "350" };
  };

  // Loading State
  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f8faff",
          color: "#1e1b4b",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
              color: "#4f46e5",
              animation: "pulse 2s infinite",
            }}
          >
            <Stethoscope size={28} />
          </div>
          <h2 style={{ fontSize: 20, color: "#1e1b4b", margin: "0 0 8px", fontWeight: 700 }}>
            {tPortal("loadingPortfolio")}
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {tPortal("connectingDirectory")}
          </p>
        </div>
      </main>
    );
  }

  // Not Found / Private State
  if (notFoundState || !profile) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f8faff",
          color: "#1e1b4b",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#ffffff",
            borderRadius: 24,
            padding: "48px 36px",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              color: "#ef4444",
            }}
          >
            <AlertCircle size={30} />
          </div>
          <h1
            style={{
              fontSize: 24,
              color: "#0f172a",
              margin: "0 0 12px",
              fontWeight: 800,
            }}
          >
            {tPortal("doctorProfileUnavailable")}
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.65, margin: "0 0 28px" }}>
            {tPortal("doctorProfileUnavailableDesc")}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
              color: "#ffffff",
              padding: "12px 28px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(79, 70, 229, 0.25)",
            }}
          >
            {tPortal("returnToHome")}
          </Link>
        </div>
      </main>
    );
  }

  const bookingHref = `/${encodeURIComponent(profile.slug)}/book`;
  const fees = formatFee(profile.consultationFee);
  const primaryChamber = profile.chambers && profile.chambers.length > 0 ? profile.chambers[0] : null;
  const degreesList = profile.medicalDegrees && profile.medicalDegrees.length > 0 ? profile.medicalDegrees : [];
  const doctorInitials = (profile.fullName || "")
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "DR";

  const sec = profile.portfolioSections || {};
  const isServicesVisible = sec.services?.isVisible !== false;
  const isAboutVisible = sec.about?.isVisible !== false;
  const isEducationVisible = sec.education?.isVisible !== false;
  const isExperienceVisible = sec.experience?.isVisible !== false && Array.isArray(profile.experience) && profile.experience.length > 0;
  const isAwardsVisible = sec.awards?.isVisible !== false && Array.isArray(profile.awards) && profile.awards.length > 0;
  const isPublicationsVisible = sec.publications?.isVisible !== false && Array.isArray(profile.publications) && profile.publications.length > 0;
  const isMembershipsVisible = sec.memberships?.isVisible !== false && Array.isArray(profile.memberships) && profile.memberships.length > 0;
  const isChambersVisible = sec.chambers?.isVisible !== false;
  const isContactVisible = sec.contact?.isVisible !== false;

  const servicesList: DisplayServiceItem[] =
    Array.isArray(profile.services) && profile.services.length > 0
      ? profile.services.map((s, idx) => ({
          title: s.title,
          sub: s.description || s.category || "Clinical Specialty",
          category: s.category,
          description: s.description,
          icon: [<Heart size={22} color="#4f46e5" key="1" />, <Activity size={22} color="#4f46e5" key="2" />, <ShieldCheck size={22} color="#4f46e5" key="3" />, <Microscope size={22} color="#4f46e5" key="4" />][idx % 4],
        }))
      : getDefaultSpecialtyServices(profile.specialty);

  return (
    <div
      id="top"
      style={{
        background: "#f8faff",
        color: "#1e1b4b",
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflowX: "hidden",
        scrollBehavior: "smooth",
      }}
    >
      {/* Ambient background lavender gradients */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 650,
          background: "radial-gradient(ellipse at 70% 20%, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.3) 40%, rgba(248, 250, 255, 0) 75%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* =========================================================================
          01. NAVIGATION HEADER (Clean Modern Glassmorphic Topbar)
          ========================================================================= */}
      <header
        style={{
          borderBottom: "1px solid rgba(224, 231, 255, 0.8)",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 60,
          boxShadow: "0 2px 12px rgba(99, 102, 241, 0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Doctor Personal Practice Identity */}
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.04em",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.28)",
                flexShrink: 0,
              }}
            >
              {doctorInitials}
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                {profile.fullName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#4f46e5",
                  marginTop: 2,
                }}
              >
                {profile.customTitle || `${profile.specialty} Practice`}
              </div>
            </div>
          </a>

          {/* Center Navigation Links: In-Page Profile Sections */}
          <nav className="portfolio-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {isAboutVisible && (
              <a
                href="#about"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("aboutDoctor")}
              </a>
            )}
            {isServicesVisible && (
              <a
                href="#services"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("portfolioServices")}
              </a>
            )}
            {isEducationVisible && (
              <a
                href="#qualifications"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("qualifications")}
              </a>
            )}
            {isExperienceVisible && (
              <a
                href="#experience"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("experience")}
              </a>
            )}
            {isChambersVisible && (
              <a
                href="#chambers"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("visitingSchedule")}
              </a>
            )}
            {isContactVisible && (
              <a
                href="#contact"
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {tPortal("contact")}
              </a>
            )}
          </nav>

          {/* Right Controls: Language Selector, Share, Direct Booking CTA & Mobile Menu Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LanguageSelector variant="header" />
            <button
              type="button"
              onClick={handleShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: copiedLink ? "#10b981" : "#475569",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title={tPortal("share")}
            >
              {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
              <span className="share-btn-text">{copiedLink ? tPortal("copied") : tPortal("share")}</span>
            </button>

            <Link
              href={bookingHref}
              className="desktop-book-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                color: "#ffffff",
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 18px rgba(79, 70, 229, 0.28)",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <Calendar size={14} />
              <span>{tPortal("bookAppointment")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="mobile-menu-btn"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="mobile-drawer-menu"
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(224, 231, 255, 0.8)",
              padding: "16px 20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
              animation: "slideDown 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isAboutVisible && (
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("aboutPractitionerNav")}
                </a>
              )}
              {isServicesVisible && (
                <a
                  href="#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("clinicalServicesNav")}
                </a>
              )}
              {isEducationVisible && (
                <a
                  href="#qualifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("qualificationsDegreesNav")}
                </a>
              )}
              {isExperienceVisible && (
                <a
                  href="#experience"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("careerAppointmentsNav")}
                </a>
              )}
              {isChambersVisible && (
                <a
                  href="#chambers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("visitingScheduleChambersNav")}
                </a>
              )}
              {isContactVisible && (
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {tPortal("contactInquiriesNav")}
                </a>
              )}
            </div>

            <div style={{ paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
              <Link
                href={bookingHref}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                  color: "#ffffff",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
                }}
              >
                <Calendar size={16} />
                <span>{tPortal("bookAppointment")}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Quick In-Page Section Jump Bar */}
      <div
        className="mobile-quick-jump-bar"
        style={{
          display: "none",
          overflowX: "auto",
          whiteSpace: "nowrap",
          padding: "10px 16px",
          gap: 8,
          borderBottom: "1px solid rgba(224, 231, 255, 0.8)",
          background: "#ffffff",
          position: "sticky",
          top: 61,
          zIndex: 40,
        }}
      >
        {isServicesVisible && (
          <a href="#services" className="quick-jump-pill">
            <Stethoscope size={13} color="#4f46e5" />
            <span>{tPortal("portfolioServices")}</span>
          </a>
        )}
        {isAboutVisible && (
          <a href="#about" className="quick-jump-pill">
            <Heart size={13} color="#4f46e5" />
            <span>{tPortal("aboutDoctor")}</span>
          </a>
        )}
        {isEducationVisible && (
          <a href="#qualifications" className="quick-jump-pill">
            <GraduationCap size={13} color="#4f46e5" />
            <span>{tPortal("qualifications")}</span>
          </a>
        )}
        {isExperienceVisible && (
          <a href="#experience" className="quick-jump-pill">
            <Briefcase size={13} color="#4f46e5" />
            <span>{tPortal("experience")}</span>
          </a>
        )}
        {isChambersVisible && (
          <a href="#chambers" className="quick-jump-pill">
            <Building2 size={13} color="#4f46e5" />
            <span>{tCommon("chamber")}</span>
          </a>
        )}
        {isContactVisible && (
          <a href="#contact" className="quick-jump-pill">
            <Phone size={13} color="#4f46e5" />
            <span>{tPortal("contact")}</span>
          </a>
        )}
      </div>

      {/* =========================================================================
          02. HERO SECTION (Matching User Mockup: Bold Heading, Dual CTAs & Circle Doctor)
          ========================================================================= */}
      <section
        className="hero-section-pad"
        style={{
          position: "relative",
          padding: "50px 24px 80px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr",
            gap: 48,
            alignItems: "center",
          }}
          className="hero-grid-container"
        >
          {/* Left Column: Headline, Bio & Action Buttons */}
          <div>
            {/* Pill Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                color: "#4338ca",
                marginBottom: 20,
              }}
            >
              <span>{profile.customTitle || `${profile.specialty} Specialist Practice`}</span>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: "clamp(38px, 5vw, 62px)",
                fontWeight: 850,
                color: "#1e1b4b",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: "0 0 20px",
              }}
            >
              {tPortal("betterCareHeadlinePrefix")} <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {tPortal("betterCareHeadlineSuffix")}
              </span>
            </h1>

            {/* Doctor Bio & Description */}
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "#475569",
                maxWidth: 540,
                margin: "0 0 32px",
              }}
            >
              {profile.bio ||
                `The health and well-being of our patients will always be our top priority. ${profile.fullName} provides dedicated, evidence-based ${profile.specialty.toLowerCase()} care and patient-first consultation.`}
            </p>

            {/* Dual CTA Buttons (Exact Match to User's Mockup) */}
            <div className="hero-cta-container" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
              <a
                href="#services"
                className="hero-cta-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 10px 24px rgba(79, 70, 229, 0.32)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <span>{tPortal("viewOurServices")}</span>
                <ChevronRight size={16} />
              </a>

              <Link
                href={bookingHref}
                className="hero-cta-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #5b54d6 0%, #7c77eb 100%)",
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 10px 24px rgba(99, 102, 241, 0.24)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <PhoneCall size={16} />
                <span>{tPortal("bookConsultation")}</span>
              </Link>
            </div>

            {/* Trust Highlights */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  {tPortal("yearsExperienceBadge", { years: locale === "bn" ? formatLocaleNumber(profile.yearsOfExperience || 5, "bn") : String(profile.yearsOfExperience || 5) })}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  {tPortal("verifiedSpecialist")}
                </span>
              </div>
              {primaryChamber && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    {primaryChamber.facilityName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Circular Doctor Frame & Floating Badges */}
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "clamp(320px, 50vw, 480px)",
            }}
          >
            {/* The Signature Lavender Organic Circle Container with Centered Image */}
            <div
              style={{
                width: "clamp(240px, 42vw, 440px)",
                height: "clamp(240px, 42vw, 440px)",
                maxWidth: "100%",
                borderRadius: "50%",
                background: "linear-gradient(145deg, #c7d2fe 0%, #e0e7ff 50%, #f1f5f9 100%)",
                boxShadow: "0 24px 60px rgba(99, 102, 241, 0.22), inset 0 0 0 3px rgba(255, 255, 255, 0.6)",
                border: "4px solid #ffffff",
                position: "relative",
                zIndex: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.fullName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                    display: "grid",
                    placeItems: "center",
                    color: "#ffffff",
                    fontSize: 72,
                    fontWeight: 900,
                  }}
                >
                  {doctorInitials}
                </div>
              )}
            </div>

            {/* Floating Glassmorphic Pill 1: Doctor Identity Card (Matching User Mockup Bottom-Left) */}
            <div
              className="hero-badge-left"
              style={{
                position: "absolute",
                bottom: 20,
                left: -10,
                zIndex: 3,
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(199, 210, 254, 0.8)",
                borderRadius: 20,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.12)",
                animation: "float 4s ease-in-out infinite",
              }}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #6366f1",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#4f46e5",
                    display: "grid",
                    placeItems: "center",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {doctorInitials}
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b4b", lineHeight: 1.2 }}>
                  {profile.fullName}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4f46e5", marginTop: 2 }}>
                  {profile.specialty}
                </div>
              </div>
            </div>

            {/* Floating Glassmorphic Pill 2: Verified Clinical Badge (Matching User Mockup Right) */}
            <div
              className="hero-badge-right"
              style={{
                position: "absolute",
                top: 40,
                right: -10,
                zIndex: 3,
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(199, 210, 254, 0.8)",
                borderRadius: 18,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 14px 30px rgba(15, 23, 42, 0.1)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.15)",
                  display: "grid",
                  placeItems: "center",
                  color: "#10b981",
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                  {tPortal("verifiedPractice")}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
                  {tPortal("activePractitioner")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          03. CLINICAL SERVICES ROW
          ========================================================================= */}
      {isServicesVisible && (
        <section
          id="services"
          style={{
            padding: "60px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("medicalExpertiseSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 38px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {sec.services?.customTitle || tPortal("comprehensiveCareHeading")}
              </h2>
            </div>

            {/* Services Grid */}
            <div
              className="services-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {servicesList.map((srv, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 20,
                    padding: "26px 22px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    transition: "all 0.25s ease",
                    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.05)",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "#818cf8";
                    e.currentTarget.style.boxShadow = "0 16px 36px rgba(99, 102, 241, 0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "#e0e7ff";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.05)";
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "rgba(99, 102, 241, 0.1)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    {srv.icon}
                  </div>
                  {srv.category && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#4f46e5",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      {srv.category}
                    </span>
                  )}
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#1e1b4b",
                      margin: "0 0 8px",
                      lineHeight: 1.3,
                    }}
                  >
                    {srv.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {srv.description || srv.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          04. ABOUT THE DOCTOR & PHILOSOPHY OF CARE
          ========================================================================= */}
      {isAboutVisible && (
        <section
          id="about"
          style={{
            padding: "80px 24px",
            background: "linear-gradient(180deg, #f8faff 0%, #eef2ff 100%)",
          }}
        >
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1.25fr",
              gap: 50,
              alignItems: "center",
            }}
            className="about-grid-container"
          >
            {/* Left: Doctor Portrait in Soft Periwinkle Frame */}
            <div style={{ position: "relative", textAlign: "center" }}>
              <div
                style={{
                  maxWidth: 400,
                  margin: "0 auto",
                  borderRadius: 28,
                  overflow: "hidden",
                  border: "4px solid #ffffff",
                  boxShadow: "0 20px 50px rgba(99, 102, 241, 0.18)",
                  background: "#e0e7ff",
                }}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.fullName}
                    style={{ width: "100%", height: 420, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      height: 420,
                      display: "grid",
                      placeItems: "center",
                      background: "linear-gradient(135deg, #4338ca, #6366f1)",
                      color: "#ffffff",
                      fontSize: 72,
                      fontWeight: 900,
                    }}
                  >
                    {doctorInitials}
                  </div>
                )}
              </div>

              {/* Experience Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  border: "1px solid #c7d2fe",
                  borderRadius: 14,
                  padding: "10px 18px",
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                  marginTop: -24,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <Award size={18} color="#4f46e5" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                  {tPortal("yearsExperienceBadge", { years: locale === "bn" ? formatLocaleNumber(profile.yearsOfExperience || 5, "bn") : String(profile.yearsOfExperience || 5) })}
                </span>
              </div>
            </div>

            {/* Right: Biography, Quote & Core Pillars */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("aboutPractitionerSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 42px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  lineHeight: 1.2,
                  margin: "0 0 16px",
                  letterSpacing: "-0.02em",
                }}
              >
                {sec.about?.customTitle || tPortal("dedicatedHealthHeading")}
              </h2>

              {/* Quote Pill */}
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  borderLeft: "4px solid #4f46e5",
                  borderRadius: "0 12px 12px 0",
                  padding: "12px 18px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#3730a3",
                  fontStyle: "italic",
                  marginBottom: 20,
                }}
              >
                {getAboutQuote(profile.specialty)}
              </div>

              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#475569", margin: "0 0 24px" }}>
                {profile.bio ||
                  `${profile.fullName} is a highly committed specialist in ${profile.specialty}. Dedicated to delivering compassionate clinical consultation, precision diagnostics, and personalized treatment regimens tailored to every patient.`}
              </p>

              {/* 4 Clinical Pillars */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e0e7ff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.04)",
                  }}
                >
                  <HeartHandshake size={20} color="#4f46e5" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                    {tPortal("patientCenteredCare")}
                  </span>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e0e7ff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.04)",
                  }}
                >
                  <Microscope size={20} color="#4f46e5" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                    {tPortal("evidenceBasedMedicine")}
                  </span>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e0e7ff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.04)",
                  }}
                >
                  <Activity size={20} color="#4f46e5" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                    {tPortal("modernClinicalTech")}
                  </span>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e0e7ff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.04)",
                  }}
                >
                  <Clock size={20} color="#4f46e5" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                    {tPortal("continuousFollowUp")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05. QUALIFICATIONS & CREDENTIALS
          ========================================================================= */}
      {isEducationVisible && (
        <section
          id="qualifications"
          style={{
            padding: "70px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("academicBackgroundSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.education?.customTitle || tPortal("qualificationsHeading")}
              </h2>
            </div>

            <div
              className="qualifications-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 18,
              }}
            >
              {profile.education && profile.education.length > 0 ? (
                profile.education.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    style={{
                      background: "#f8faff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 16,
                      padding: "22px 24px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      boxShadow: "0 4px 16px rgba(99, 102, 241, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: "rgba(99, 102, 241, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "#4f46e5",
                        flexShrink: 0,
                      }}
                    >
                      <GraduationCap size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", lineHeight: 1.3 }}>
                        {edu.degree}
                      </div>
                      <div style={{ fontSize: 13, color: "#4338ca", fontWeight: 600, marginTop: 4 }}>
                        {edu.institution}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
                        {edu.graduationYear && <span>{tPortal("classOfGraduation", { year: locale === "bn" ? formatLocaleNumber(Number(edu.graduationYear), "bn") : edu.graduationYear })}</span>}
                        {edu.fieldOfStudy && <span>• {edu.fieldOfStudy}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : degreesList.length > 0 ? (
                degreesList.map((deg, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#f8faff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 16,
                      padding: "20px 22px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(99, 102, 241, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "#4f46e5",
                        flexShrink: 0,
                      }}
                    >
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>
                        {deg}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {tPortal("verifiedMedicalDegree")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    background: "#f8faff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 16,
                    padding: "20px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(99, 102, 241, 0.12)",
                      display: "grid",
                      placeItems: "center",
                      color: "#4f46e5",
                    }}
                  >
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>
                      {tPortal("verifiedPractitionerTitle")}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {tPortal("licensedInSpecialty", { specialty: profile.specialty })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05B. CLINICAL APPOINTMENTS & EXPERIENCE
          ========================================================================= */}
      {isExperienceVisible && (
        <section
          id="experience"
          style={{
            padding: "70px 24px",
            background: "#f8faff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("careerAppointmentsSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.experience?.customTitle || tPortal("clinicalExperienceHeading")}
              </h2>
            </div>

            <div
              className="experience-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {profile.experience?.map((exp, idx) => (
                <div
                  key={exp.id || idx}
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 18,
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.05)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 6,
                          background: exp.isCurrent ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.14)",
                          color: exp.isCurrent ? "#059669" : "#64748b",
                          border: `1px solid ${exp.isCurrent ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.3)"}`,
                        }}
                      >
                        {exp.isCurrent ? tPortal("currentAppointment") : tPortal("previousAppointment")}
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
                        {formatLocaleNumber(exp.startYear, locale)} – {exp.isCurrent ? tPortal("presentPeriod") : formatLocaleNumber(exp.endYear || "", locale)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b", margin: "0 0 6px" }}>
                      {exp.role}
                    </h3>
                    <div style={{ fontSize: 14, color: "#4338ca", fontWeight: 600 }}>
                      {exp.organization}
                    </div>
                    {exp.department && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {exp.department}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05C. AWARDS & HONORS
          ========================================================================= */}
      {isAwardsVisible && (
        <section
          id="awards"
          style={{
            padding: "70px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("honorsDistinctionsSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.awards?.customTitle || tPortal("awardsHonorsHeading")}
              </h2>
            </div>

            <div
              className="awards-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {profile.awards?.map((awd, idx) => (
                <div
                  key={awd.id || idx}
                  style={{
                    background: "#f8faff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 18,
                    padding: "24px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(229, 184, 105, 0.18)",
                      border: "1px solid rgba(229, 184, 105, 0.4)",
                      display: "grid",
                      placeItems: "center",
                      color: "#c49a45",
                      flexShrink: 0,
                    }}
                  >
                    <Award size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
                        {awd.title}
                      </h3>
                      {awd.year && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
                          {formatLocaleNumber(awd.year, locale)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "#4338ca", fontWeight: 600, marginTop: 4 }}>
                      {awd.issuingBody}
                    </div>
                    {awd.description && (
                      <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0", lineHeight: 1.5 }}>
                        {awd.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05D. PUBLICATIONS & CLINICAL RESEARCH
          ========================================================================= */}
      {isPublicationsVisible && (
        <section
          id="publications"
          style={{
            padding: "70px 24px",
            background: "#f8faff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("academicResearchSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.publications?.customTitle || tPortal("publicationsHeading")}
              </h2>
            </div>

            <div
              className="publications-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 20,
              }}
            >
              {profile.publications?.map((pub, idx) => (
                <div
                  key={pub.id || idx}
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 18,
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.05)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4f46e5", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                      <BookOpen size={15} />
                      <span>{pub.year ? formatLocaleNumber(pub.year, locale) : tPortal("publishedPaper")}</span>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", margin: "0 0 6px", lineHeight: 1.35 }}>
                      {pub.title}
                    </h3>
                    {pub.journal && (
                      <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
                        {pub.journal}
                      </div>
                    )}
                  </div>

                  {pub.url && (
                    <div style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#4f46e5",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <span>{tPortal("viewPublication")}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05E. PROFESSIONAL MEMBERSHIPS & SOCIETIES
          ========================================================================= */}
      {isMembershipsVisible && (
        <section
          id="memberships"
          style={{
            padding: "60px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("collegesSocietiesSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.memberships?.customTitle || tPortal("professionalSocietiesHeading")}
              </h2>
            </div>

            <div
              className="memberships-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {profile.memberships?.map((mem, idx) => (
                <div
                  key={mem.id || idx}
                  style={{
                    background: "#f8faff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 16,
                    padding: "20px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "rgba(99, 102, 241, 0.1)",
                      display: "grid",
                      placeItems: "center",
                      color: "#4f46e5",
                      flexShrink: 0,
                    }}
                  >
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>
                      {mem.organizationName}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {mem.role || tPortal("activeMember")} {mem.sinceYear && `• ${tPortal("sinceYear", { year: formatLocaleNumber(mem.sinceYear, locale) })}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          05F. VERIFIED CREDENTIALS & ACCREDITATION DOCUMENTS
          ========================================================================= */}
      {profile.publicDocuments && profile.publicDocuments.length > 0 && (
        <section
          id="credentials"
          style={{
            padding: "50px 24px",
            background: "#f8faff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <FileCheck size={20} color="#10b981" />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
                {tPortal("verifiedCredentialsHeading")}
              </h3>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {profile.publicDocuments.map((doc, idx) => (
                <a
                  key={doc.id || idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#ffffff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 12,
                    padding: "12px 18px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.05)",
                  }}
                >
                  <FileText size={18} color="#4f46e5" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {doc.documentType} • {tPortal("clickToVerify")}
                    </div>
                  </div>
                  <ExternalLink size={13} color="#94a3b8" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          06. CHAMBERS & VISITING SCHEDULE
          ========================================================================= */}
      {isChambersVisible && (
        <section
          id="chambers"
          style={{
            padding: "70px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("consultationLocationsSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.chambers?.customTitle || tPortal("chamberVisitingScheduleHeading")}
              </h2>
            </div>

            <div
              className="chambers-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {profile.chambers && profile.chambers.length > 0 ? (
                profile.chambers.map((ch) => (
                  <div
                    key={ch.id}
                    style={{
                      background: "#f8faff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 20,
                      padding: "26px",
                      boxShadow: "0 8px 24px rgba(99, 102, 241, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: "rgba(99, 102, 241, 0.1)",
                          display: "grid",
                          placeItems: "center",
                          color: "#4f46e5",
                        }}
                      >
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
                          {ch.facilityName}
                        </h3>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{ch.city}</div>
                      </div>
                    </div>

                    {ch.visitingSchedule && (
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          padding: "10px 12px",
                          borderRadius: 10,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          <Clock size={15} color="#4f46e5" style={{ flexShrink: 0 }} />
                          <span>{ch.visitingSchedule}</span>
                        </div>
                        {ch.weeklySchedule && (
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              marginTop: 6,
                              paddingLeft: 23,
                            }}
                          >
                            {Object.entries(ch.weeklySchedule)
                              .filter(([_, s]) => s.isOpen)
                              .map(([day]) => (
                                <span
                                  key={day}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: "rgba(16, 185, 129, 0.12)",
                                    color: "#059669",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                  }}
                                >
                                  {day.slice(0, 3)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                          {tPortal("consultationFeeLabel")}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b", marginTop: 2 }}>
                          {fees.initial}
                        </div>
                      </div>

                      <Link
                        href={bookingHref}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                          color: "#ffffff",
                          padding: "8px 16px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        {tPortal("bookChamberBtn")}
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 20,
                    padding: "26px",
                    textAlign: "center",
                    gridColumn: "1 / -1",
                  }}
                >
                  <MapPin size={28} color="#4f46e5" style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", margin: "0 0 6px" }}>
                    {tPortal("chamberVisitingScheduleHeading")}
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    {tPortal("chamberContactClinicHint")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          07. DIRECT CONTACT & INQUIRIES
          ========================================================================= */}
      {isContactVisible && (
        <section
          id="contact"
          style={{
            padding: "70px 24px",
            background: "#f8faff",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tPortal("getInTouchSubtitle")}
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  fontWeight: 800,
                  color: "#1e1b4b",
                  margin: 0,
                }}
              >
                {sec.contact?.customTitle || tPortal("contactInquiriesHeading")}
              </h2>
            </div>

            <div
              className="contact-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {profile.publicContact?.clinicPhone && (
                <a
                  href={`tel:${profile.publicContact.clinicPhone.replace(/\s+/g, "")}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 16,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#6366f1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#e0e7ff";
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(99, 102, 241, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "#4f46e5",
                      }}
                    >
                      <Phone size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{tPortal("clinicDeskLabel")}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", marginTop: 2 }}>
                        {profile.publicContact.clinicPhone}
                      </div>
                    </div>
                  </div>
                </a>
              )}

              {profile.publicContact?.inquiryWhatsApp && (
                <a
                  href={`https://wa.me/${profile.publicContact.inquiryWhatsApp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 16,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#10b981";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#e0e7ff";
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(16, 185, 129, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "#10b981",
                      }}
                    >
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{tPortal("whatsappInquiryLabel")}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", marginTop: 2 }}>
                        {profile.publicContact.inquiryWhatsApp}
                      </div>
                    </div>
                  </div>
                </a>
              )}

              {profile.publicContact?.publicEmail && (
                <a
                  href={`mailto:${profile.publicContact.publicEmail}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 16,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#6366f1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#e0e7ff";
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(99, 102, 241, 0.12)",
                        display: "grid",
                        placeItems: "center",
                        color: "#4f46e5",
                      }}
                    >
                      <Mail size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{tPortal("publicInquiriesLabel")}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", marginTop: 2 }}>
                        {profile.publicContact.publicEmail}
                      </div>
                    </div>
                  </div>
                </a>
              )}

              {!profile.publicContact?.clinicPhone && !profile.publicContact?.inquiryWhatsApp && !profile.publicContact?.publicEmail && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e0e7ff",
                    borderRadius: 16,
                    padding: "24px",
                    textAlign: "center",
                    gridColumn: "1 / -1",
                  }}
                >
                  <Building2 size={24} color="#4f46e5" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>
                    {tPortal("consultationAppointmentsHeading")}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    {tPortal("onlineBookingBelowHint", { name: profile.fullName })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          08. BOTTOM CTA BANNER (Matching the Royal Indigo Banner in User Mockup)
          ========================================================================= */}
      <section style={{ padding: "40px 24px 80px" }}>
        <div
          className="bottom-cta-banner"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
            borderRadius: 28,
            padding: "54px 44px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 28,
            boxShadow: "0 20px 50px rgba(49, 46, 129, 0.35)",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#c7d2fe",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {tPortal("readyToScheduleSubtitle")}
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 850,
                lineHeight: 1.15,
                margin: "0 0 14px",
                letterSpacing: "-0.02em",
              }}
            >
              {tPortal("yourHealthDeservesHeadingPrefix")} <br />
              {tPortal("yourHealthDeservesHeadingSuffix")}
            </h2>
            <p style={{ fontSize: 15, color: "#e0e7ff", lineHeight: 1.6, margin: 0 }}>
              {tPortal("scheduleConsultationDesc", { name: profile.fullName })}
            </p>
          </div>

          <div>
            <Link
              href={bookingHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                color: "#312e81",
                padding: "16px 32px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.18)",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <Calendar size={18} color="#4338ca" />
              <span>{tPortal("bookAppointment")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          09. PRACTICE FOOTER
          ========================================================================= */}
      <footer
        className="portfolio-footer"
        style={{
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {doctorInitials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {profile.fullName}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {tPortal("practiceSuiteFooter", { specialty: profile.specialty })}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#64748b" }}>
            {tPortal("verifiedDoctorPortfolioFooter", { year: formatLocaleNumber(new Date().getFullYear(), locale), name: profile.fullName })}
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Floating Action Bar */}
      <div
        className="mobile-sticky-bottom-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(224, 231, 255, 0.9)",
          padding: "12px 16px",
          display: "none",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 -4px 25px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4338ca, #6366f1)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {doctorInitials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile.fullName}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              {tPortal("feeLabel")} <span style={{ color: "#4f46e5", fontWeight: 800 }}>{fees.initial}</span>
            </div>
          </div>
        </div>

        <Link
          href={bookingHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 6px 16px rgba(79, 70, 229, 0.35)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <Calendar size={15} />
          <span>{tPortal("bookAppointment")}</span>
        </Link>
      </div>

      {/* Floating animation keyframes and responsive mobile styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .quick-jump-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .quick-jump-pill:hover,
        .quick-jump-pill:active {
          background: #e0e7ff;
          color: #4338ca;
          border-color: #c7d2fe;
        }
        .mobile-nav-link {
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          text-decoration: none;
          background: #f8faff;
          border: 1px solid #e0e7ff;
          transition: all 0.15s ease;
        }
        .mobile-nav-link:hover,
        .mobile-nav-link:active {
          background: #eef2ff;
          color: #4338ca;
        }
        .mobile-menu-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mobile-menu-btn:hover {
          background: #e2e8f0;
        }

        @media (max-width: 900px) {
          .hero-grid-container {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .about-grid-container {
            grid-template-columns: 1fr !important;
          }
          .portfolio-desktop-nav {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .mobile-sticky-bottom-bar {
            display: flex !important;
          }
          .mobile-quick-jump-bar {
            display: flex !important;
          }
          .portfolio-main-wrapper {
            padding-bottom: 84px !important;
          }
          .hero-badge-left {
            left: 12px !important;
            bottom: 12px !important;
            max-width: calc(100% - 24px) !important;
          }
          .hero-badge-right {
            right: 12px !important;
            top: 16px !important;
            max-width: calc(100% - 24px) !important;
          }
          .hero-cta-container {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .hero-cta-button {
            width: 100% !important;
            justify-content: center !important;
            padding: 14px 20px !important;
          }
          .hero-section-pad {
            padding: 32px 16px 48px !important;
          }
          .bottom-cta-banner {
            padding: 32px 20px !important;
            border-radius: 20px !important;
          }
          .bottom-cta-banner h2 {
            font-size: 26px !important;
          }
          .bottom-cta-banner > div:last-child {
            width: 100% !important;
          }
          .bottom-cta-banner > div:last-child a {
            width: 100% !important;
            justify-content: center !important;
          }
          .portfolio-footer > div {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
          }
        }

        @media (max-width: 640px) {
          .services-grid,
          .chambers-grid,
          .qualifications-grid,
          .experience-grid,
          .awards-grid,
          .publications-grid,
          .memberships-grid,
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .desktop-book-btn {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .share-btn-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
