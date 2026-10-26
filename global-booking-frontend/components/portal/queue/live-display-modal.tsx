"use client";

import { useEffect, useState } from "react";
import { X, Volume2, Monitor, Sparkles, Crown, Clock, Users, CheckCircle2, ChevronRight, Calendar } from "lucide-react";
import { QueueItem, CounterStation } from "@/types/queue";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { formatLocaleDate, formatLocaleTime } from "@/lib/i18n/formatters";

interface LiveDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  counters: CounterStation[];
  doctorName?: string;
  chamberLocation?: string;
  doctorSpecialty?: string;
}

export function LiveDisplayModal({
  isOpen,
  onClose,
  queue,
  counters,
  doctorName,
  chamberLocation,
  doctorSpecialty,
}: LiveDisplayModalProps) {
  const { t, locale } = useTranslation("queue");
  const { t: tCommon } = useTranslation("common");

  const [time, setTime] = useState("");
  const [todayDate, setTodayDate] = useState("");

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
    "Consultation Chamber";

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

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(formatLocaleTime(now, locale));
      setTodayDate(formatLocaleDate(now, locale));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [locale]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1st Box: Patient currently inside with Doctor
  const currentServing = queue.find((item) => item.status === "Serving");

  // Patients waiting in queue, strictly sorted by daily consecutive serial number
  const waitingLine = queue
    .filter((item) => item.status === "Next" || item.status === "Waiting")
    .sort((a, b) => {
      const numA = parseInt(a.ticketNumber.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.ticketNumber.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

  const nextPatient = waitingLine[0];
  const thirdPatient = waitingLine[1];
  const fourthPatient = waitingLine[2];

  // 4 Sequential Stages requested for Personal Doctor Practice:
  const stages = [
    {
      id: "box-1-serving",
      stageTag: t("nowServing", undefined, "WITH DOCTOR").toUpperCase(),
      badgeText: t("nowServing", undefined, "With Doctor"),
      badgeClass: "badge-serving",
      kpiCardClass: "queue-kpi-card-serving",
      kpiIconClass: "queue-kpi-icon-serving",
      accentColor: "#e5b869",
      icon: <Crown size={22} />,
      ticket: currentServing?.ticketNumber || "—",
      patientName: currentServing?.clientName || (queue.length > 0 ? tCommon("room", undefined, "Chamber Available") : t("noQueueTokens", undefined, "No patient serving")),
      subtitle: currentServing?.service || "",
      footerLeft: activeDoctorName,
      footerRight: activeChamber,
    },
    {
      id: "box-2-next",
      stageTag: t("nextInLine", undefined, "NEXT NUMBER").toUpperCase(),
      badgeText: t("nextInLine", undefined, "Stand By Door"),
      badgeClass: "badge-next",
      kpiCardClass: "queue-kpi-card-next",
      kpiIconClass: "queue-kpi-icon-next",
      accentColor: "#38bdf8",
      icon: <Clock size={22} />,
      ticket: nextPatient?.ticketNumber || "—",
      patientName: nextPatient?.clientName || (waitingLine.length === 0 ? t("queueEmpty", undefined, "No patient waiting") : t("nextInLine", undefined, "Ready for next")),
      subtitle: nextPatient ? (nextPatient.service || "") : "",
      footerLeft: activeDoctorName,
      footerRight: "Chamber Entrance",
    },
    {
      id: "box-3-third",
      stageTag: t("waitingList", undefined, "WAITING LOUNGE").toUpperCase(),
      badgeText: t("waitingList", undefined, "Waiting Lounge"),
      badgeClass: "badge-waiting",
      kpiCardClass: "queue-kpi-card-waiting",
      kpiIconClass: "queue-kpi-icon-waiting",
      accentColor: "#10b981",
      icon: <Users size={22} />,
      ticket: thirdPatient?.ticketNumber || "—",
      patientName: thirdPatient?.clientName || t("waitingList", undefined, "Lounge Available"),
      subtitle: thirdPatient ? (thirdPatient.service || "") : "",
      footerLeft: activeDoctorName,
      footerRight: "Waiting Lounge",
    },
    {
      id: "box-4-fourth",
      stageTag: t("waitingList", undefined, "WAITING LOUNGE").toUpperCase(),
      badgeText: t("waitingList", undefined, "Waiting Lounge"),
      badgeClass: "badge-completed",
      kpiCardClass: "queue-kpi-card-completed",
      kpiIconClass: "queue-kpi-icon-completed",
      accentColor: "#14b8a6",
      icon: <Users size={22} />,
      ticket: fourthPatient?.ticketNumber || "—",
      patientName: fourthPatient?.clientName || t("waitingList", undefined, "Lounge Available"),
      subtitle: fourthPatient ? (fourthPatient.service || "") : "",
      footerLeft: activeDoctorName,
      footerRight: "Waiting Lounge",
    },
  ];

  return (
    <div className="tv-display-overlay" onClick={onClose}>
      <div className="tv-display-container" onClick={(e) => e.stopPropagation()}>
        {/* Top TV Bar - Luxury Designed Header */}
        <header className="tv-display-header">
          <div className="tv-header-top-row">
            <div className="tv-brand-block">
              <div className="tv-brand-icon-halo">
                <Calendar size={22} color="#e5b869" />
              </div>
              <div className="tv-brand-info">
                <div className="tv-brand-title">
                  <span className="tv-doctor-title-text">{activeDoctorName.toUpperCase()}</span>
                </div>
                <div className="tv-brand-sub-wrap">
                  <span className="tv-brand-sub-badge">{t("waitingRoomDisplay", undefined, "WAITING ROOM LIVE DISPLAY")}</span>
                </div>
              </div>
            </div>


            <button
              type="button"
              className="tv-close-btn tv-close-btn-mobile-only"
              onClick={onClose}
              title="Exit TV Display (Esc)"
              aria-label="Close TV Display"
            >
              <X size={18} />
            </button>
          </div>

          <div className="tv-header-meta-row">
            <div className="tv-header-center">
              <span className="tv-live-pill">
                <span className="live-pulsing-dot" />
                <span className="live-equalizer-bars">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                LIVE QUEUE SYSTEM
              </span>
            </div>

            <div className="tv-header-right">
              <div className="tv-clock-hud-card">
                <span className="tv-clock-time">{time}</span>
                <span className="tv-clock-date">{todayDate}</span>
              </div>
              <button
                type="button"
                className="tv-close-btn tv-close-btn-desktop-only"
                onClick={onClose}
                title="Exit TV Display (Esc)"
                aria-label="Close TV Display"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* TV Main Grid */}
        <main className="tv-display-main-grid">
          {/* Left: 4 EQUAL BOXES (Consultation + Queue Progression styled like KPI Cards) */}
          <section className="tv-serving-section">
            <div className="tv-stations-grid four-boxes-grid">
              {stages.map((st) => (
                <article key={st.id} className={`queue-kpi-card tv-station-kpi-card ${st.kpiCardClass}`}>
                  <div className="queue-kpi-card-body tv-station-card-body">
                    <div className="tv-kpi-top-row">
                      <span className="queue-kpi-card-label" style={{ color: st.accentColor }}>
                        {st.stageTag}
                      </span>
                    </div>
                    <div className="queue-kpi-card-value tv-kpi-value">
                      {st.ticket}
                    </div>
                    <div className="queue-kpi-card-sub tv-kpi-sub">
                      <span className="tv-kpi-patient-name">{st.patientName}</span>
                      {st.subtitle && <span className="tv-kpi-patient-desc"> • {st.subtitle}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Right: UPCOMING TICKETS QUEUE */}
          <section className="tv-upcoming-section">
            <div className="tv-section-heading-row">
              <h2 className="tv-section-heading">UPCOMING TICKETS</h2>
              <span className="tv-waiting-count">{waitingLine.length} Waiting</span>
            </div>

            <div className="tv-upcoming-list">
              {waitingLine.length > 0 ? (
                waitingLine.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`tv-upcoming-item ${idx === 0 ? "item-next-up" : ""}`}
                  >
                    <div className="tv-upcoming-left">
                      <span className="tv-up-ticket">{item.ticketNumber}</span>
                      <span className="tv-up-client">{item.clientName}</span>
                    </div>
                    <div className="tv-upcoming-right">
                      <span className="tv-up-station">
                        {idx === 0 ? "Next at Door" : idx === 1 ? "3rd in Line" : idx === 2 ? "4th in Line" : `Queue #${idx + 1}`}
                      </span>
                      <span className="tv-up-wait">~{item.estWaitMinutes} min</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--portal-text-muted)", fontSize: 13 }}>
                  No additional patients waiting in line.
                </div>
              )}
            </div>

            {/* Notification Banner at bottom of TV */}
            <div className="tv-chime-banner">
              <Volume2 size={18} className="text-gold" />
              <span>Chimes will chime automatically when your ticket number is called.</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
