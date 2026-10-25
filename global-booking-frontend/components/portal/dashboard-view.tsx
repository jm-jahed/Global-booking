"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  UserPlus,
  Tv,
  Users2,
  Clock,
  Search,
  ExternalLink,
  QrCode,
  RefreshCw,
  Activity,
  Stethoscope,
  MapPin,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Ticket,
  Users,
  Calendar,
  Settings,
  Filter,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import {
  getStoredPortalUser,
  getDoctorProfile,
  type DoctorProfileRecord,
} from "@/lib/api/admin-client";
import {
  fetchDoctorQueue,
  callQueuePatient,
  finishQueuePatient,
  type BackendQueueTicket,
} from "@/lib/api/doctor-queue-client";
import {
  fetchDoctorPatients,
  type PersistentPatient,
} from "@/lib/api/doctor-patients-client";
import {
  fetchDoctorPortalAppointments,
} from "@/lib/api/doctor-appointments-client";
import type { PublicAppointmentRecord } from "@/lib/api/doctor-public-client";
import { generateQrMatrix, qrMatrixToSvg } from "@/lib/utils/qr-code";
import {
  DEFAULT_CHAMBER_TIMEZONE,
  resolveChamberTimezone,
  formatChamberClock,
  getChamberLocalHour,
  getChamberBusinessDate,
  formatIsoToDDMMYYYY,
  shiftDateIso,
} from "@/lib/utils/timezone";
import {
  getStoredPortalDate,
  setStoredPortalDate,
  formatPortalDateInfo,
} from "@/lib/utils/portal-date";
import { NewTicketModal } from "./queue/new-ticket-modal";
import { NewPatientModal } from "./patients/new-patient-modal";
import type { QueueItem } from "@/types/queue";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
  "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #db2777 0%, #f472b6 100%)",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length] || AVATAR_GRADIENTS[0]!;
}

export function DashboardView() {
  // Real Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [queueTickets, setQueueTickets] = useState<BackendQueueTicket[]>([]);
  const [patients, setPatients] = useState<PersistentPatient[]>([]);
  const [totalPatientsCount, setTotalPatientsCount] = useState<number>(0);
  const [appointments, setAppointments] = useState<PublicAppointmentRecord[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileRecord | null>(null);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<"queue" | "appointments" | "patients" | "hourly">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals & Mobile Date Popover
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isMobileDateOpen, setIsMobileDateOpen] = useState(false);

  // Primary chamber information & authoritative IANA timezone
  const primaryChamber = doctorProfile?.chambers?.[0] || {
    id: "main-chamber",
    facilityName: "Main Specialist Clinic",
    city: "Dubai",
    timezone: DEFAULT_CHAMBER_TIMEZONE,
    visitingSchedule: "Daily 05:00 PM – 09:00 PM",
  };

  const chamberTimezone = resolveChamberTimezone(primaryChamber.timezone);

  // Live Hospital Clock strictly synchronized with Chamber's Authoritative Timezone
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatChamberClock(chamberTimezone, new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [chamberTimezone]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Authoritative Chamber-Local Today date key (YYYY-MM-DD)
  const chamberTodayDateKey = useMemo(() => {
    return getChamberBusinessDate(chamberTimezone, new Date());
  }, [chamberTimezone]);

  // Selected date key (YYYY-MM-DD) synced with topbar and url
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    return getStoredPortalDate(chamberTimezone);
  });

  // Listen to date changes triggered from topbar or other components
  useEffect(() => {
    const handlePortalDateChange = (e: any) => {
      if (e?.detail && typeof e.detail === "string" && e.detail !== selectedDateKey) {
        setSelectedDateKey(e.detail);
      }
    };
    window.addEventListener("portal_date_change", handlePortalDateChange);
    return () => window.removeEventListener("portal_date_change", handlePortalDateChange);
  }, [selectedDateKey]);

  // Formatted date info for display and mobile widget
  const dateInfo = useMemo(() => {
    return formatPortalDateInfo(selectedDateKey);
  }, [selectedDateKey]);

  const handlePrevDay = () => {
    const prev = shiftDateIso(selectedDateKey, -1);
    setSelectedDateKey(prev);
    setStoredPortalDate(prev);
  };

  const handleNextDay = () => {
    const next = shiftDateIso(selectedDateKey, 1);
    setSelectedDateKey(next);
    setStoredPortalDate(next);
  };

  const handleResetToday = () => {
    setSelectedDateKey(chamberTodayDateKey);
    setStoredPortalDate(chamberTodayDateKey);
  };

  // Load all authentic live clinical data from backend for selected date
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const stored = getStoredPortalUser();

      const [profileRes, queueRes, patientsRes, aptsRes] = await Promise.allSettled([
        getDoctorProfile().catch(() => null),
        fetchDoctorQueue({ dateKey: selectedDateKey }).catch(() => null),
        fetchDoctorPatients({ limit: 12 }).catch(() => null),
        fetchDoctorPortalAppointments({ appointmentDate: selectedDateKey }).catch(() => null),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value?.doctor) {
        setDoctorProfile(profileRes.value.doctor);
      } else if (stored) {
        setDoctorProfile({
          id: stored.id || "DOC-1",
          doctorId: stored.doctorId || "DOC-1",
          fullName: stored.fullName || stored.name || "Doctor Practice",
          email: stored.email || "",
          phone: stored.phone || "",
          avatar: stored.avatar || "",
          specialty: stored.specialty || "Medical Specialist",
          licenseNumber: stored.licenseNumber || "",
          accountStatus: "ACTIVE",
          approvedAt: "",
          subscriptionId: "",
          assignedPatientCount: 0,
          totalBookingsCount: 0,
          chamberLocationsSummary: "",
          yearsOfExperience: 0,
          medicalDegrees: [],
          consultationFee: {
            amountInFils: 50000,
            currency: "AED",
            formatted: "AED 500.00",
          },
          slug: stored.slug || "dr-specialist",
          chambers: stored.chambers || [],
          createdAt: "",
          updatedAt: "",
        });
      }

      if (queueRes.status === "fulfilled" && queueRes.value?.items) {
        setQueueTickets(queueRes.value.items);
      }

      if (patientsRes.status === "fulfilled" && patientsRes.value) {
        setPatients(patientsRes.value.items || []);
        setTotalPatientsCount(patientsRes.value.total || 0);
      }

      if (aptsRes.status === "fulfilled" && aptsRes.value?.items) {
        setAppointments(aptsRes.value.items);
      }
    } catch (err) {
      console.warn("Failed to load live dashboard metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDateKey]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Date-scoped tickets matching selectedDateKey
  const dayTickets = useMemo(() => {
    return queueTickets.filter((t) => {
      if (t.dateKey) return t.dateKey === selectedDateKey;
      if (t.createdAt) {
        const tDateKey = getChamberBusinessDate(chamberTimezone, new Date(t.createdAt));
        return tDateKey === selectedDateKey;
      }
      return true;
    });
  }, [queueTickets, selectedDateKey, chamberTimezone]);

  // Date-scoped appointments matching selectedDateKey
  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (a.appointmentDate) return a.appointmentDate === selectedDateKey;
      return true;
    });
  }, [appointments, selectedDateKey]);

  // Derived real KPI statistics for the selected business date
  const waitingTickets = useMemo(
    () => dayTickets.filter((t) => t.status === "WAITING"),
    [dayTickets],
  );

  const servingTicket = useMemo(
    () => dayTickets.find((t) => t.status === "CALLED" || t.status === "IN_CONSULTATION") || null,
    [dayTickets],
  );

  const completedTickets = useMemo(
    () => dayTickets.filter((t) => t.status === "COMPLETED"),
    [dayTickets],
  );

  const skippedTickets = useMemo(
    () =>
      dayTickets.filter(
        (t) =>
          t.status === "SKIPPED" ||
          t.status === "CANCELLED" ||
          (t.status as string) === "NO_SHOW",
      ),
    [dayTickets],
  );

  const totalTokensToday = dayTickets.length;
  const completionRate =
    totalTokensToday > 0
      ? Math.round((completedTickets.length / totalTokensToday) * 100)
      : 0;

  const activePatientsCount = useMemo(
    () => patients.filter((p) => p.status === "Active" || p.status === "In-Treatment").length,
    [patients],
  );

  const confirmedAppointments = useMemo(
    () => dayAppointments.filter((a) => a.status === "CONFIRMED"),
    [dayAppointments],
  );

  // Real hourly distribution computed strictly in chamber-local hours from authentic ticket timestamps
  const hourlyData = useMemo(() => {
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => {
      const label = hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
      const count = dayTickets.filter((t) => {
        const ticketLocalHour = getChamberLocalHour(t.createdAt, chamberTimezone);
        return ticketLocalHour === hour;
      }).length;
      return { hour: label, count };
    });
  }, [dayTickets, chamberTimezone]);

  const maxHourlyCount = useMemo(
    () => Math.max(...hourlyData.map((h) => h.count), 5),
    [hourlyData],
  );

  // Public Booking Link & QR
  const doctorSlug = doctorProfile?.slug || "dr-specialist";
  const publicBookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dr/${doctorSlug}`
      : `https://globalbooking.ae/dr/${doctorSlug}`;

  const qrSvgMarkup = useMemo(() => {
    try {
      const matrix = generateQrMatrix(publicBookingUrl);
      return qrMatrixToSvg(matrix, { size: 104, darkColor: "#ffffff", lightColor: "transparent" });
    } catch {
      return null;
    }
  }, [publicBookingUrl]);

  const handleCopyBookingLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(publicBookingUrl);
      setCopiedLink(true);
      showToast("Public booking link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Interactive Quick Actions
  const handleQuickCall = async (ticketId: string) => {
    try {
      await callQueuePatient(ticketId);
      showToast("Patient called to consultation chamber!");
      loadDashboardData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to call patient");
    }
  };

  const handleQuickFinish = async (ticketId: string) => {
    try {
      await finishQueuePatient(ticketId);
      showToast("Consultation completed and patient record synced!");
      loadDashboardData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to finish consultation");
    }
  };

  // Search filtering (scoped to selected date)
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return dayTickets;
    const q = searchQuery.toLowerCase();
    return dayTickets.filter(
      (t) =>
        t.patientName?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.service?.toLowerCase().includes(q) ||
        t.patientPhone?.includes(q),
    );
  }, [dayTickets, searchQuery]);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return dayAppointments;
    const q = searchQuery.toLowerCase();
    return dayAppointments.filter(
      (a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.bookingNumberDisplay?.toLowerCase().includes(q) ||
        a.service?.toLowerCase().includes(q) ||
        a.patientPhone?.includes(q),
    );
  }, [dayAppointments, searchQuery]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.mrn?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.normalizedPhone?.includes(q),
    );
  }, [patients, searchQuery]);

  return (
    <div
      className="dashboard-page-container"
      style={{
        padding: "24px 28px 48px",
        minHeight: "100vh",
        background: "#050b14",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        boxSizing: "border-box",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)",
            color: "#ffffff",
            padding: "10px 22px",
            borderRadius: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 6px 25px rgba(16, 185, 129, 0.35)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.8} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & GREETING BAR */}
      <section
        className="dashboard-desktop-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 24px",
          background: "linear-gradient(135deg, rgba(11, 19, 37, 0.8) 0%, rgba(7, 12, 23, 0.95) 100%)",
          border: "1px solid rgba(229, 184, 105, 0.25)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(229, 184, 105, 0.15)",
                border: "1px solid rgba(229, 184, 105, 0.35)",
                color: "#e5b869",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Stethoscope size={13} />
              {doctorProfile?.specialty || "Medical Specialist"}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#94a3b8",
                fontSize: 12,
              }}
            >
              <MapPin size={13} color="#e5b869" />
              {primaryChamber.facilityName} ({primaryChamber.city || "Dubai"})
            </span>
          </div>

          <h1
            style={{
              margin: "4px 0 0",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Welcome back, {doctorProfile?.fullName || "Doctor Practice"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#8e9fb5" }}>
            Live clinical overview — synchronized in real time with Live OPD Queue & Patient Registry.
          </p>
        </div>

        {/* Live Clock & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Live Hospital Clock */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#10b981",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            />
            <Clock size={14} />
            <span>{currentTime || "Live Clinic"}</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              ({chamberTimezone})
            </span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
            title="Reload real-time clinical data"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-gold" : ""} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          {/* Quick Issue OPD Token */}
          <button
            type="button"
            onClick={() => setIsTicketModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              color: "#060b13",
              fontSize: 13,
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(229, 184, 105, 0.35)",
            }}
          >
            <Ticket size={16} />
            <span>Issue OPD Token</span>
            <ChevronRight size={14} />
          </button>

          {/* Quick Register Patient */}
          <button
            type="button"
            onClick={() => setIsPatientModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            }}
          >
            <UserPlus size={16} />
            <span>Register Patient</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* Mobile Action Deck: Date Selector Pill, Refresh, Quick Issue OPD Token */}
      <div className="dashboard-mobile-actions-deck">
        <button
          type="button"
          onClick={() => {
            const next = shiftDateIso(selectedDateKey, 1);
            setSelectedDateKey(next);
            setStoredPortalDate(next);
          }}
          className="dashboard-mobile-pill-date"
        >
          <Calendar size={13} color="#e5b869" />
          <span>{dateInfo.formattedDate}</span>
          <span className="dashboard-mobile-pill-badge">{dateInfo.isToday ? "Today" : dateInfo.dayOfWeek}</span>
          <ChevronDown size={13} color="#8e9fb5" />
        </button>

        <button
          type="button"
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          className="dashboard-mobile-pill-refresh"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin text-gold" : ""} />
          <span>{refreshing ? "..." : "Refresh"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTicketModalOpen(true)}
          className="dashboard-mobile-pill-token"
        >
          <Ticket size={14} />
          <span>Issue OPD Token</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 2. REAL-TIME 4-CARD KPI METRICS GRID (Exact match to reference luxury design) */}
      <section className="queue-kpi-grid" aria-label="Clinical KPI Metrics">
        {/* Card 1: LIVE OPD (Gold Glowing Card) */}
        <Link href="/live-queue" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <article className="queue-kpi-card queue-kpi-card-serving" style={{ cursor: "pointer" }}>
            <div className="queue-kpi-card-icon queue-kpi-icon-serving">
              <Stethoscope size={20} />
            </div>
            <div className="queue-kpi-card-body">
              <span className="queue-kpi-card-label" style={{ color: "#e5b869" }}>
                LIVE OPD
              </span>
              <div className="queue-kpi-card-value">
                {(waitingTickets.length || (servingTicket ? 1 : 0)).toString().padStart(2, "0")}
              </div>
              <div className="queue-kpi-card-sub">
                {servingTicket ? "Currently serving" : "Chamber idle"}
              </div>
            </div>
            {/* Mini wave chart + chevron */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <svg width="54" height="26" viewBox="0 0 54 26" fill="none">
                <path d="M2 16C8 16 12 6 18 10C24 14 28 22 34 14C40 6 46 12 52 12" stroke="#e5b869" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(229, 184, 105, 0.15)",
                  border: "1px solid rgba(229, 184, 105, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ChevronRight size={13} color="#e5b869" />
              </div>
            </div>
          </article>
        </Link>

        {/* Card 2: COMPLETED TODAY (Blue Card) */}
        <article className="queue-kpi-card queue-kpi-card-next">
          <div className="queue-kpi-card-icon queue-kpi-icon-next">
            <Clock size={20} />
          </div>
          <div className="queue-kpi-card-body">
            <span className="queue-kpi-card-label" style={{ color: "#38bdf8" }}>
              {selectedDateKey === chamberTodayDateKey ? "COMPLETED TODAY" : "COMPLETED"}
            </span>
            <div className="queue-kpi-card-value">
              {completedTickets.length.toString().padStart(2, "0")}
            </div>
            <div className="queue-kpi-card-sub">
              Patients completed
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <svg width="34" height="28" viewBox="0 0 34 28" fill="none">
              <rect x="2" y="16" width="5" height="12" rx="1.5" fill="#38bdf8" opacity="0.45" />
              <rect x="11" y="11" width="5" height="17" rx="1.5" fill="#38bdf8" opacity="0.65" />
              <rect x="20" y="5" width="5" height="23" rx="1.5" fill="#38bdf8" opacity="0.85" />
              <rect x="29" y="0" width="5" height="28" rx="1.5" fill="#38bdf8" />
            </svg>
          </div>
        </article>

        {/* Card 3: TOTAL REGISTERED (Teal/Emerald Card) */}
        <Link href={ROUTES.patients} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <article className="queue-kpi-card queue-kpi-card-waiting" style={{ cursor: "pointer" }}>
            <div className="queue-kpi-card-icon queue-kpi-icon-waiting">
              <Users size={20} />
            </div>
            <div className="queue-kpi-card-body">
              <span className="queue-kpi-card-label" style={{ color: "#10b981" }}>
                TOTAL REGISTERED
              </span>
              <div className="queue-kpi-card-value">
                {totalPatientsCount.toString().padStart(2, "0")}
              </div>
              <div className="queue-kpi-card-sub">
                Patients in system
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <svg width="34" height="28" viewBox="0 0 34 28" fill="none">
                <rect x="2" y="16" width="5" height="12" rx="1.5" fill="#10b981" opacity="0.45" />
                <rect x="11" y="11" width="5" height="17" rx="1.5" fill="#10b981" opacity="0.65" />
                <rect x="20" y="5" width="5" height="23" rx="1.5" fill="#10b981" opacity="0.85" />
                <rect x="29" y="0" width="5" height="28" rx="1.5" fill="#10b981" />
              </svg>
            </div>
          </article>
        </Link>

        {/* Card 4: SCHEDULED APPOINTMENTS (Purple Card) */}
        <Link href={ROUTES.appointments} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <article className="queue-kpi-card queue-kpi-card-scheduled" style={{ cursor: "pointer" }}>
            <div className="queue-kpi-card-icon queue-kpi-icon-scheduled">
              <Calendar size={20} />
            </div>
            <div className="queue-kpi-card-body">
              <span className="queue-kpi-card-label" style={{ color: "#c084fc" }}>
                SCHEDULED APPOINTMENTS
              </span>
              <div className="queue-kpi-card-value">
                {dayAppointments.length.toString().padStart(2, "0")}
              </div>
              <div className="queue-kpi-card-sub">
                Online & phone bookings
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <svg width="34" height="28" viewBox="0 0 34 28" fill="none">
                <rect x="2" y="16" width="5" height="12" rx="1.5" fill="#c084fc" opacity="0.45" />
                <rect x="11" y="11" width="5" height="17" rx="1.5" fill="#c084fc" opacity="0.65" />
                <rect x="20" y="5" width="5" height="23" rx="1.5" fill="#c084fc" opacity="0.85" />
                <rect x="29" y="0" width="5" height="28" rx="1.5" fill="#c084fc" />
              </svg>
            </div>
          </article>
        </Link>
      </section>

      {/* 3. MAIN DASHBOARD CONTENT: OPERATIONAL STREAM */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          width: "100%",
        }}
      >
        {/* OPERATIONAL STREAM (TABS) */}
        <article
          style={{
            background: "#0b1325",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Header Row: Exact Reference Match */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
              paddingBottom: 16,
            }}
          >
            {/* Row 1: Title, Red Live Pill, Total Patients, Queue Settings */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(229, 184, 105, 0.15)",
                    border: "1.5px solid rgba(229, 184, 105, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e5b869",
                  }}
                >
                  <Activity size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "0.02em" }}>
                  Live OPD Queue
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
                  Live
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>
                  Total Patients: <strong style={{ color: "#e5b869", fontSize: 14 }}>{dayTickets.length}</strong>
                </span>
                <Link
                  href="/settings"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Settings size={14} color="#e5b869" />
                  <span>Queue Settings</span>
                </Link>
              </div>
            </div>

            {/* Row 2: Date Navigator, Search Bar, Service Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Date Navigator Pill with Interactive Prev / Next / Today */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const prev = shiftDateIso(selectedDateKey, -1);
                    setSelectedDateKey(prev);
                    setStoredPortalDate(prev);
                  }}
                  title="Previous Day"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e5b869",
                    cursor: "pointer",
                    padding: "2px 5px",
                    fontWeight: 800,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  &lt;
                </button>
                <Calendar size={13} color="#e5b869" />
                <span style={{ letterSpacing: "0.02em" }}>{formatIsoToDDMMYYYY(selectedDateKey)}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = shiftDateIso(selectedDateKey, 1);
                    setSelectedDateKey(next);
                    setStoredPortalDate(next);
                  }}
                  title="Next Day"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e5b869",
                    cursor: "pointer",
                    padding: "2px 5px",
                    fontWeight: 800,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  &gt;
                </button>
                {selectedDateKey !== chamberTodayDateKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(chamberTodayDateKey);
                      setStoredPortalDate(chamberTodayDateKey);
                    }}
                    style={{
                      marginLeft: 4,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: "rgba(229, 184, 105, 0.15)",
                      border: "1px solid rgba(229, 184, 105, 0.4)",
                      color: "#e5b869",
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div
                style={{
                  flex: 1,
                  minWidth: 180,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search token, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#ffffff",
                    fontSize: 12.5,
                    width: "100%",
                  }}
                />
              </div>

              {/* Service Filter */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Filter size={14} color="#38bdf8" />
                <span>All Services ({Array.from(new Set(queueTickets.map((t) => t.service))).filter(Boolean).length || 1})</span>
              </div>
            </div>
          </div>

          {/* TAB 1: LIVE OPD QUEUE STREAM */}
          {activeTab === "queue" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredQueue.length > 0 ? (
                filteredQueue.map((ticket) => {
                  const isServing = ticket.status === "CALLED" || ticket.status === "IN_CONSULTATION";
                  const isCompleted = ticket.status === "COMPLETED";
                  const isWaiting = ticket.status === "WAITING";

                  return (
                    <div
                      key={ticket.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        borderRadius: 14,
                        background: isServing
                          ? "rgba(229, 184, 105, 0.08)"
                          : "rgba(255, 255, 255, 0.02)",
                        border: isServing
                          ? "1px solid rgba(229, 184, 105, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.06)",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            minWidth: 46,
                            height: 46,
                            borderRadius: 12,
                            background: isServing ? "#e5b869" : "rgba(255, 255, 255, 0.06)",
                            color: isServing ? "#060b13" : "#ffffff",
                            fontWeight: 800,
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {ticket.ticketNumber}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                              {ticket.patientName}
                            </span>
                            {ticket.priority === "URGENT" && (
                              <span
                                style={{
                                  background: "rgba(239, 68, 68, 0.2)",
                                  color: "#ef4444",
                                  padding: "1px 6px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                Urgent
                              </span>
                            )}
                            <span
                              style={{
                                background: "rgba(56, 189, 248, 0.12)",
                                color: "#38bdf8",
                                padding: "1px 6px",
                                borderRadius: 8,
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {ticket.channel === "ONLINE_WEB" ? "Online" : "Walk-in"}
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: "#8e9fb5", marginTop: 2 }}>
                            {ticket.service} • Check-in: {ticket.checkInTime}
                            {ticket.patientPhone ? ` • ${ticket.patientPhone}` : ""}
                          </div>
                        </div>
                      </div>

                      {/* Status & Quick Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isServing
                              ? "rgba(229, 184, 105, 0.2)"
                              : isCompleted
                              ? "rgba(16, 185, 129, 0.15)"
                              : isWaiting
                              ? "rgba(56, 189, 248, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: isServing
                              ? "#e5b869"
                              : isCompleted
                              ? "#10b981"
                              : isWaiting
                              ? "#38bdf8"
                              : "#ef4444",
                            border: `1px solid ${
                              isServing
                                ? "rgba(229, 184, 105, 0.4)"
                                : isCompleted
                                ? "rgba(16, 185, 129, 0.3)"
                                : isWaiting
                                ? "rgba(56, 189, 248, 0.3)"
                                : "rgba(239, 68, 68, 0.3)"
                            }`,
                          }}
                        >
                          {ticket.status}
                        </span>

                        {isWaiting && (
                          <button
                            type="button"
                            onClick={() => handleQuickCall(ticket.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: "rgba(229, 184, 105, 0.15)",
                              border: "1px solid rgba(229, 184, 105, 0.4)",
                              color: "#e5b869",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Call Next
                          </button>
                        )}

                        {isServing && (
                          <button
                            type="button"
                            onClick={() => handleQuickFinish(ticket.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              color: "#10b981",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Finish Consultation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 14,
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    color: "#8e9fb5",
                  }}
                >
                  <Ticket size={32} color="#64748b" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                    No queue tokens issued yet today
                  </div>
                  <p style={{ fontSize: 12, maxWidth: 360, margin: "6px auto 14px", color: "#64748b" }}>
                    Patients arriving at the clinic or booking online will appear here automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: "rgba(229, 184, 105, 0.15)",
                      border: "1px solid rgba(229, 184, 105, 0.35)",
                      color: "#e5b869",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Issue First OPD Token &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TODAY'S APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: 14,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          minWidth: 46,
                          height: 46,
                          borderRadius: 12,
                          background: "rgba(129, 140, 248, 0.15)",
                          border: "1px solid rgba(129, 140, 248, 0.3)",
                          color: "#818cf8",
                          fontWeight: 800,
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {apt.bookingNumberDisplay || `#${String(apt.bookingNumber || 1).padStart(2, "0")}`}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                          {apt.patientName}
                        </div>
                        <div style={{ fontSize: 12, color: "#8e9fb5", marginTop: 2 }}>
                          {apt.service || "General Consultation"} • Time: {apt.appointmentTime || "Flexible"}
                          {apt.patientPhone ? ` • ${apt.patientPhone}` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            apt.status === "COMPLETED"
                              ? "rgba(16, 185, 129, 0.15)"
                              : apt.status === "CONFIRMED"
                              ? "rgba(129, 140, 248, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            apt.status === "COMPLETED"
                              ? "#10b981"
                              : apt.status === "CONFIRMED"
                              ? "#818cf8"
                              : "#ef4444",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 14,
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    color: "#8e9fb5",
                  }}
                >
                  <CalendarDays size={32} color="#64748b" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                    No upcoming appointments scheduled
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "6px auto" }}>
                    Patients booking through your public profile will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECENT PATIENTS */}
          {activeTab === "patients" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 18px",
                      borderRadius: 14,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: getAvatarColor(p.name),
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                            {p.name}
                          </span>
                          <span
                            style={{
                              background: "rgba(229, 184, 105, 0.12)",
                              color: "#e5b869",
                              padding: "1px 6px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {p.mrn}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#8e9fb5", marginTop: 2 }}>
                          {p.phone} • Total Visits: {p.totalVisits}
                          {p.bloodGroup ? ` • Blood: ${p.bloodGroup}` : ""}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={ROUTES.patients}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "rgba(56, 189, 248, 0.12)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      View File
                    </Link>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 14,
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    color: "#8e9fb5",
                  }}
                >
                  <Users2 size={32} color="#64748b" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                    No patients in registry yet
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPatientModalOpen(true)}
                    style={{
                      marginTop: 12,
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.35)",
                      color: "#38bdf8",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Register Patient &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL INFLOW ANALYSIS */}
          {activeTab === "hourly" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "#8e9fb5" }}>
                Patient arrival distribution across today&apos;s clinical consulting hours (strictly calculated from active OPD tokens):
              </div>

              {/* Bar Chart Canvas */}
              <div
                style={{
                  height: 180,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 10,
                  padding: "16px 10px 10px",
                  background: "rgba(0, 0, 0, 0.25)",
                  borderRadius: 14,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {hourlyData.map((item) => {
                  const barHeight =
                    item.count > 0 ? Math.max(12, Math.round((item.count / maxHourlyCount) * 140)) : 4;
                  return (
                    <div
                      key={item.hour}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      {item.count > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#e5b869" }}>
                          {item.count}
                        </span>
                      )}
                      <div
                        style={{
                          width: "80%",
                          maxWidth: 24,
                          height: barHeight,
                          borderRadius: "4px 4px 2px 2px",
                          background:
                            item.count > 0
                              ? "linear-gradient(180deg, #e5b869 0%, #b88628 100%)"
                              : "rgba(255, 255, 255, 0.06)",
                          boxShadow:
                            item.count > 0 ? "0 0 10px rgba(229, 184, 105, 0.3)" : "none",
                          transition: "height 0.4s ease",
                        }}
                        title={`${item.hour}: ${item.count} patients`}
                      />
                      <span style={{ fontSize: 9, color: "#64748b", whiteSpace: "nowrap" }}>
                        {item.hour}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8e9fb5" }}>
                <span>Peak Hour: {hourlyData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), hourlyData[0]!).hour}</span>
                <span>Active Visits Logged: {queueTickets.length}</span>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* 4. MODALS */}
      {isTicketModalOpen && (
        <NewTicketModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          onAddTicket={(_newTicket: QueueItem) => {
            setIsTicketModalOpen(false);
            showToast("OPD Ticket issued successfully!");
            loadDashboardData(true);
          }}
          nextTicketNumber={`#${String(queueTickets.length + 1).padStart(2, "0")}`}
          doctorName={doctorProfile?.fullName}
          chamberLocation={primaryChamber.facilityName}
          doctorSpecialty={doctorProfile?.specialty}
          chambers={doctorProfile?.chambers}
          currentChamberId={primaryChamber.id}
        />
      )}

      {isPatientModalOpen && (
        <NewPatientModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onPatientCreated={(_newPatient: PersistentPatient) => {
            setIsPatientModalOpen(false);
            showToast("New patient record registered successfully!");
            loadDashboardData(true);
          }}
        />
      )}
    </div>
  );
}
