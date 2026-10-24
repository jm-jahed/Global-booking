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
  Ticket,
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
} from "@/lib/utils/timezone";
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

  // Modals
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

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

  // Load all authentic live clinical data from backend
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const stored = getStoredPortalUser();

      const [profileRes, queueRes, patientsRes, aptsRes] = await Promise.allSettled([
        getDoctorProfile().catch(() => null),
        fetchDoctorQueue().catch(() => null),
        fetchDoctorPatients({ limit: 12 }).catch(() => null),
        fetchDoctorPortalAppointments().catch(() => null),
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
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived real KPI statistics (Zero fake data)
  const waitingTickets = useMemo(
    () => queueTickets.filter((t) => t.status === "WAITING"),
    [queueTickets],
  );

  const servingTicket = useMemo(
    () => queueTickets.find((t) => t.status === "CALLED" || t.status === "IN_CONSULTATION") || null,
    [queueTickets],
  );

  const completedTickets = useMemo(
    () => queueTickets.filter((t) => t.status === "COMPLETED"),
    [queueTickets],
  );

  const skippedTickets = useMemo(
    () =>
      queueTickets.filter(
        (t) =>
          t.status === "SKIPPED" ||
          t.status === "CANCELLED" ||
          (t.status as string) === "NO_SHOW",
      ),
    [queueTickets],
  );

  const totalTokensToday = queueTickets.length;
  const completionRate =
    totalTokensToday > 0
      ? Math.round((completedTickets.length / totalTokensToday) * 100)
      : 0;

  const activePatientsCount = useMemo(
    () => patients.filter((p) => p.status === "Active" || p.status === "In-Treatment").length,
    [patients],
  );

  const confirmedAppointments = useMemo(
    () => appointments.filter((a) => a.status === "CONFIRMED"),
    [appointments],
  );

  // Real hourly distribution computed strictly in chamber-local hours from authentic ticket timestamps
  const chamberTodayDateKey = useMemo(() => {
    return getChamberBusinessDate(chamberTimezone, new Date());
  }, [chamberTimezone]);

  const hourlyData = useMemo(() => {
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => {
      const label = hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
      const count = queueTickets.filter((t) => {
        // Enforce chamber's local business date boundary
        if (t.dateKey && t.dateKey !== chamberTodayDateKey) {
          return false;
        }
        const ticketLocalHour = getChamberLocalHour(t.createdAt, chamberTimezone);
        return ticketLocalHour === hour;
      }).length;
      return { hour: label, count };
    });
  }, [queueTickets, chamberTimezone, chamberTodayDateKey]);

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

  // Search filtering
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queueTickets;
    const q = searchQuery.toLowerCase();
    return queueTickets.filter(
      (t) =>
        t.patientName?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.service?.toLowerCase().includes(q) ||
        t.patientPhone?.includes(q),
    );
  }, [queueTickets, searchQuery]);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter(
      (a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.bookingNumberDisplay?.toLowerCase().includes(q) ||
        a.service?.toLowerCase().includes(q) ||
        a.patientPhone?.includes(q),
    );
  }, [appointments, searchQuery]);

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
              gap: 7,
              padding: "8px 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              color: "#060b13",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(229, 184, 105, 0.3)",
            }}
          >
            <Ticket size={15} />
            <span>Issue OPD Token</span>
          </button>

          {/* Quick Register Patient */}
          <button
            type="button"
            onClick={() => setIsPatientModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: 10,
              background: "rgba(14, 165, 233, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <UserPlus size={15} />
            <span>Register Patient</span>
          </button>
        </div>
      </section>

      {/* 2. REAL-TIME 4-CARD KPI METRICS GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
        aria-label="Real-time Clinical Indicators"
      >
        {/* Metric 1: Live OPD Queue */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1325 0%, #070c17 100%)",
            border: "1px solid rgba(229, 184, 105, 0.3)",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(229, 184, 105, 0.12)",
                border: "1px solid rgba(229, 184, 105, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <Tv size={18} />
            </div>
            <Link
              href="/live-queue"
              style={{
                fontSize: 11,
                color: "#e5b869",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Live OPD &rarr;
            </Link>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Currently Serving</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: servingTicket ? "#e5b869" : "#ffffff",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              {servingTicket ? servingTicket.ticketNumber : "Station Idle"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {servingTicket ? servingTicket.patientName : "No patient currently in consultation"}
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#8e9fb5" }}>Waiting in Queue:</span>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>{waitingTickets.length} patients</span>
          </div>
        </div>

        {/* Metric 2: Today's Consultations */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1325 0%, #070c17 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#10b981",
                fontWeight: 700,
                background: "rgba(16, 185, 129, 0.1)",
                padding: "2px 8px",
                borderRadius: 12,
              }}
            >
              {completionRate}% Attended
            </span>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Completed Consultations</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#10b981",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              {completedTickets.length}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              out of {totalTokensToday} total visits today
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#8e9fb5" }}>Skipped / No-show:</span>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>{skippedTickets.length}</span>
          </div>
        </div>

        {/* Metric 3: Patient Registry */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1325 0%, #070c17 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
            >
              <Users2 size={18} />
            </div>
            <Link
              href={ROUTES.patients}
              style={{
                fontSize: 11,
                color: "#38bdf8",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Registry &rarr;
            </Link>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Total Registered Patients</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              {totalPatientsCount}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Persistent records isolated to your clinic
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#8e9fb5" }}>Active Treatment:</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>{activePatientsCount} active</span>
          </div>
        </div>

        {/* Metric 4: Appointments Today */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1325 0%, #070c17 100%)",
            border: "1px solid rgba(129, 140, 248, 0.3)",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(129, 140, 248, 0.12)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <CalendarDays size={18} />
            </div>
            <Link
              href={ROUTES.appointments}
              style={{
                fontSize: 11,
                color: "#818cf8",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Schedule &rarr;
            </Link>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Scheduled Appointments</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              {appointments.length}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              online web bookings & phone calls
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#8e9fb5" }}>Confirmed:</span>
            <span style={{ color: "#818cf8", fontWeight: 700 }}>{confirmedAppointments.length} confirmed</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN DASHBOARD CONTENT: 2-COLUMN OPERATIONAL LAYOUT */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: REAL-TIME OPERATIONAL STREAM (TABS) */}
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
          {/* Header Row & Tab Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
              borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
              paddingBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: activeTab === "queue" ? "1px solid rgba(229, 184, 105, 0.5)" : "1px solid transparent",
                  background: activeTab === "queue" ? "rgba(229, 184, 105, 0.15)" : "transparent",
                  color: activeTab === "queue" ? "#e5b869" : "#94a3b8",
                }}
              >
                <Tv size={14} />
                <span>Live OPD Queue</span>
                <span
                  style={{
                    background: activeTab === "queue" ? "#e5b869" : "rgba(255, 255, 255, 0.1)",
                    color: activeTab === "queue" ? "#060b13" : "#cbd5e1",
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {queueTickets.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("appointments")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: activeTab === "appointments" ? "1px solid rgba(129, 140, 248, 0.5)" : "1px solid transparent",
                  background: activeTab === "appointments" ? "rgba(129, 140, 248, 0.15)" : "transparent",
                  color: activeTab === "appointments" ? "#818cf8" : "#94a3b8",
                }}
              >
                <CalendarDays size={14} />
                <span>Appointments</span>
                <span
                  style={{
                    background: activeTab === "appointments" ? "#818cf8" : "rgba(255, 255, 255, 0.1)",
                    color: activeTab === "appointments" ? "#ffffff" : "#cbd5e1",
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {appointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("patients")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: activeTab === "patients" ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid transparent",
                  background: activeTab === "patients" ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  color: activeTab === "patients" ? "#38bdf8" : "#94a3b8",
                }}
              >
                <Users2 size={14} />
                <span>Recent Patients</span>
                <span
                  style={{
                    background: activeTab === "patients" ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
                    color: activeTab === "patients" ? "#060b13" : "#cbd5e1",
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {patients.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("hourly")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: activeTab === "hourly" ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid transparent",
                  background: activeTab === "hourly" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: activeTab === "hourly" ? "#10b981" : "#94a3b8",
                }}
              >
                <Activity size={14} />
                <span>Inflow Analysis</span>
              </button>
            </div>

            {/* Quick Search in Tab Header */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Filter stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: 12,
                  width: 140,
                }}
              />
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

        {/* RIGHT COLUMN: CLINICAL COMMAND WIDGETS */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Widget 1: Station Status / Now Serving Box */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(11, 19, 37, 0.95) 0%, rgba(7, 12, 23, 0.98) 100%)",
              border: "1px solid rgba(229, 184, 105, 0.4)",
              borderRadius: 18,
              padding: 22,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                  }}
                />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                  OPD Chamber Station
                </h3>
              </div>
              <Link
                href="/live-queue?tv=1"
                target="_blank"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#e5b869",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(229, 184, 105, 0.12)",
                  padding: "3px 8px",
                  borderRadius: 8,
                }}
              >
                <Tv size={12} />
                TV Mode
              </Link>
            </div>

            {/* Now Serving Big Display */}
            <div
              style={{
                background: "rgba(229, 184, 105, 0.08)",
                border: "1px solid rgba(229, 184, 105, 0.25)",
                borderRadius: 14,
                padding: "16px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "#8e9fb5", textTransform: "uppercase", fontWeight: 700 }}>
                Currently Inside Chamber
              </span>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#e5b869",
                  letterSpacing: "-0.02em",
                  margin: "4px 0",
                }}
              >
                {servingTicket ? servingTicket.ticketNumber : "IDLE"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
                {servingTicket ? servingTicket.patientName : "Ready for next patient"}
              </div>
            </div>

            {/* Next in Line Preview */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#8e9fb5" }}>Next in Line:</span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                {waitingTickets[0] ? `${waitingTickets[0].ticketNumber} — ${waitingTickets[0].patientName}` : "None waiting"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#8e9fb5" }}>Est. Waiting Time:</span>
              <span style={{ color: "#ffffff", fontWeight: 700 }}>
                {waitingTickets.length > 0 ? `${waitingTickets.length * 12} mins` : "0 min"}
              </span>
            </div>

            <Link
              href="/live-queue"
              style={{
                width: "100%",
                padding: "10px 0",
                textAlign: "center",
                borderRadius: 10,
                background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                color: "#060b13",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                display: "block",
                boxShadow: "0 4px 15px rgba(229, 184, 105, 0.25)",
              }}
            >
              Open Full Live OPD Station &rarr;
            </Link>
          </div>

          {/* Widget 2: Doctor Public Profile & Real Scannable QR Code */}
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: 22,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode size={18} color="#e5b869" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                  Instant Patient Booking QR
                </h3>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Genuine ISO/IEC 18004 Generated QR SVG */}
              <div
                style={{
                  width: 90,
                  height: 90,
                  minWidth: 90,
                  borderRadius: 12,
                  background: "#ffffff",
                  padding: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
                }}
              >
                {qrSvgMarkup ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: qrSvgMarkup.replace('width="104"', 'width="78"').replace('height="104"', 'height="78"'),
                    }}
                  />
                ) : (
                  <QrCode size={50} color="#000000" />
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                  Scan for Walk-in or Web Booking
                </div>
                <div style={{ fontSize: 12, color: "#8e9fb5" }}>
                  Patients scan this QR to book appointments or check in.
                </div>
                <div style={{ fontSize: 12, color: "#e5b869", fontWeight: 700, marginTop: 2 }}>
                  Fee: {doctorProfile?.consultationFee?.formatted || "AED 500.00"}
                </div>
              </div>
            </div>

            {/* Copy / Open Public Link Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleCopyBookingLink}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: copiedLink ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: copiedLink ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: copiedLink ? "#10b981" : "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>

              <Link
                href={`/dr/${doctorSlug}`}
                target="_blank"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(229, 184, 105, 0.12)",
                  border: "1px solid rgba(229, 184, 105, 0.3)",
                  color: "#e5b869",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <span>View Page</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* Widget 3: Quick Navigation Shortcuts */}
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Fast Clinical Portals
            </div>

            <Link
              href="/live-queue"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Tv size={16} color="#e5b869" />
                <span>Live OPD Queue Manager</span>
              </div>
              <ChevronRight size={15} color="#64748b" />
            </Link>

            <Link
              href={ROUTES.patients}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users2 size={16} color="#38bdf8" />
                <span>Patient Registry & Visits</span>
              </div>
              <ChevronRight size={15} color="#64748b" />
            </Link>

            <Link
              href={ROUTES.appointments}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarDays size={16} color="#818cf8" />
                <span>Appointment Schedule</span>
              </div>
              <ChevronRight size={15} color="#64748b" />
            </Link>

            <Link
              href={ROUTES.settings}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Stethoscope size={16} color="#10b981" />
                <span>Chamber & Profile Settings</span>
              </div>
              <ChevronRight size={15} color="#64748b" />
            </Link>
          </div>
        </aside>
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
