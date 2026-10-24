"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  Users2,
  DollarSign,
  Printer,
  RefreshCw,
  Building2,
  Download,
  Tv,
  CalendarDays,
  FileText,
  Activity,
  Check,
  Filter,
} from "lucide-react";
import {
  getStoredPortalUser,
  getDoctorProfile,
  type DoctorProfileRecord,
} from "@/lib/api/admin-client";
import {
  fetchDoctorQueue,
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
import {
  DEFAULT_CHAMBER_TIMEZONE,
  resolveChamberTimezone,
  formatChamberClock,
  getChamberLocalHour,
  getChamberBusinessDate,
} from "@/lib/utils/timezone";

export function ReportsView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<"today" | "all">("today");

  // Real Clinical Data
  const [queueTickets, setQueueTickets] = useState<BackendQueueTicket[]>([]);
  const [patients, setPatients] = useState<PersistentPatient[]>([]);
  const [totalPatientsCount, setTotalPatientsCount] = useState<number>(0);
  const [appointments, setAppointments] = useState<PublicAppointmentRecord[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileRecord | null>(null);

  // Live Chamber Clock
  const primaryChamber = doctorProfile?.chambers?.[0] || {
    id: "main-chamber",
    facilityName: "Main Specialist Clinic",
    city: "Dubai",
    timezone: DEFAULT_CHAMBER_TIMEZONE,
  };
  const chamberTimezone = resolveChamberTimezone(primaryChamber.timezone);

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatChamberClock(chamberTimezone, new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [chamberTimezone]);

  // Load authentic clinical and financial records
  const loadReportsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [profileRes, queueRes, patientsRes, aptsRes] = await Promise.allSettled([
        getDoctorProfile().catch(() => null),
        fetchDoctorQueue().catch(() => null),
        fetchDoctorPatients({ limit: 100 }).catch(() => null),
        fetchDoctorPortalAppointments().catch(() => null),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value?.doctor) {
        setDoctorProfile(profileRes.value.doctor);
      } else {
        const stored = getStoredPortalUser();
        if (stored) {
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
      console.warn("Failed to load clinical reports data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Chamber Local Date Boundary
  const todayKey = useMemo(() => getChamberBusinessDate(chamberTimezone, new Date()), [chamberTimezone]);

  // Filtered tickets based on selected time range
  const targetTickets = useMemo(() => {
    if (timeRange === "today") {
      return queueTickets.filter((t) => !t.dateKey || t.dateKey === todayKey);
    }
    return queueTickets;
  }, [queueTickets, timeRange, todayKey]);

  // Filtered Appointments
  const targetAppointments = useMemo(() => {
    return appointments;
  }, [appointments]);

  // Derived Financial Metrics
  const feeAmountInAed = useMemo(() => {
    if (doctorProfile?.consultationFee?.amountInFils) {
      return doctorProfile.consultationFee.amountInFils / 100;
    }
    return 500;
  }, [doctorProfile]);

  const completedTickets = useMemo(
    () => targetTickets.filter((t) => t.status === "COMPLETED"),
    [targetTickets],
  );

  const totalGrossRevenueAed = useMemo(
    () => completedTickets.length * feeAmountInAed,
    [completedTickets, feeAmountInAed],
  );

  const potentialRevenueAed = useMemo(
    () => targetTickets.length * feeAmountInAed,
    [targetTickets, feeAmountInAed],
  );

  const completionRate = useMemo(
    () => (targetTickets.length > 0 ? Math.round((completedTickets.length / targetTickets.length) * 100) : 0),
    [targetTickets, completedTickets],
  );

  const skippedTickets = useMemo(
    () => targetTickets.filter((t) => t.status === "SKIPPED" || t.status === "CANCELLED"),
    [targetTickets],
  );

  // Channel Distribution (Walk-in vs Online Web)
  const channelStats = useMemo(() => {
    const walkIn = targetTickets.filter((t) => t.channel === "WALK_IN").length;
    const online = targetTickets.filter((t) => t.channel === "ONLINE_WEB").length;
    const phone = targetTickets.filter((t) => t.channel === "PHONE").length;
    return { walkIn, online, phone };
  }, [targetTickets]);

  // Service Breakdown
  const serviceDistribution = useMemo(() => {
    const counts: Record<string, { count: number; completed: number }> = {};
    for (const t of targetTickets) {
      const s = t.service || "General Consultation";
      if (!counts[s]) counts[s] = { count: 0, completed: 0 };
      counts[s]!.count++;
      if (t.status === "COMPLETED") counts[s]!.completed++;
    }
    return Object.entries(counts).map(([service, stat]) => ({
      service,
      totalCount: stat.count,
      completedCount: stat.completed,
      revenueAed: stat.completed * feeAmountInAed,
    })).sort((a, b) => b.totalCount - a.totalCount);
  }, [targetTickets, feeAmountInAed]);

  // Patient Demographics (from real patient files)
  const genderBreakdown = useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;
    for (const p of patients) {
      const g = p.gender?.toLowerCase();
      if (g === "male") male++;
      else if (g === "female") female++;
      else other++;
    }
    return { male, female, other };
  }, [patients]);

  const bloodGroupStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of patients) {
      if (p.bloodGroup) {
        counts[p.bloodGroup] = (counts[p.bloodGroup] || 0) + 1;
      }
    }
    return Object.entries(counts).map(([blood, count]) => ({ blood, count }));
  }, [patients]);

  // Hourly Distribution strictly in chamber timezone
  const hourlyData = useMemo(() => {
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => {
      const label = hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
      const count = targetTickets.filter((t) => {
        if (!t.createdAt) return false;
        const ticketHour = getChamberLocalHour(t.createdAt, chamberTimezone);
        return ticketHour === hour;
      }).length;
      return { hour: label, count };
    });
  }, [targetTickets, chamberTimezone]);

  const maxHourlyCount = useMemo(
    () => Math.max(...hourlyData.map((h) => h.count), 5),
    [hourlyData],
  );

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className="reports-page-container"
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
      {/* 1. TOP HEADER & REPORT CONTROLS */}
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
              <BarChart3 size={13} />
              Clinical Performance & Analytics
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
              <Building2 size={13} color="#e5b869" />
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
            Clinical Performance & Revenue Reports
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#8e9fb5" }}>
            Comprehensive reporting of OPD throughput, consultation collections, patient attendance, and service breakdown.
          </p>
        </div>

        {/* Live Clock, Period Filter & Actions */}
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

          {/* Time Filter Toggle */}
          <div
            style={{
              display: "inline-flex",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setTimeRange("today")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: timeRange === "today" ? "rgba(229, 184, 105, 0.2)" : "transparent",
                color: timeRange === "today" ? "#e5b869" : "#94a3b8",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("all")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: timeRange === "all" ? "rgba(229, 184, 105, 0.2)" : "transparent",
                color: timeRange === "all" ? "#e5b869" : "#94a3b8",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              All Time
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadReportsData(true)}
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
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-gold" : ""} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          {/* Print / Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
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
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </section>

      {/* 2. REAL-TIME 4-CARD FINANCIAL & CLINICAL KPI GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
        aria-label="Financial and Clinical KPIs"
      >
        {/* KPI 1: Gross Realized Revenue */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1325 0%, #070c17 100%)",
            border: "1px solid rgba(229, 184, 105, 0.35)",
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
              <DollarSign size={18} />
            </div>
            <span style={{ fontSize: 11, color: "#e5b869", fontWeight: 700 }}>
              AED Minor Units
            </span>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Realized Consultation Revenue</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e5b869",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              AED {totalGrossRevenueAed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {completedTickets.length} completed @ AED {feeAmountInAed.toFixed(2)}/consultation
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
            <span style={{ color: "#8e9fb5" }}>Potential Session Value:</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>AED {potentialRevenueAed.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 2: Completed Consultations & Attendance Rate */}
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
              {completionRate}% Attendance
            </span>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Completed Patient Visits</div>
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
              out of {targetTickets.length} total OPD encounters
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

        {/* KPI 3: Channel Breakdown */}
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
              <Activity size={18} />
            </div>
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>
              Channel Intake
            </span>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#8e9fb5", fontWeight: 600 }}>Walk-in vs Online Web</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#38bdf8",
                letterSpacing: "-0.02em",
                margin: "4px 0 2px",
              }}
            >
              {channelStats.walkIn} / {channelStats.online}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {channelStats.walkIn} Walk-ins • {channelStats.online} Web Bookings
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
            <span style={{ color: "#8e9fb5" }}>Appointments Total:</span>
            <span style={{ color: "#818cf8", fontWeight: 700 }}>{targetAppointments.length} bookings</span>
          </div>
        </div>

        {/* KPI 4: Persistent Patient Base */}
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
              <Users2 size={18} />
            </div>
            <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>
              Master Registry
            </span>
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
              Persistent clinical files isolated to clinic
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
            <span style={{ color: "#8e9fb5" }}>Returning Patients:</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              {patients.filter((p) => (p.totalVisits || 0) > 1).length} returned
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN ANALYTICS: 2-COLUMN SECTION */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: SERVICE BREAKDOWN & COMPLETED AUDIT STREAM */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Service Revenue Distribution Table */}
          <article
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  Clinical Service Distribution & Revenue
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8e9fb5" }}>
                  Performance analysis grouped by medical service requested during check-in.
                </p>
              </div>
            </div>

            {serviceDistribution.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {serviceDistribution.map((item) => (
                  <div
                    key={item.service}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>{item.service}</div>
                      <div style={{ fontSize: 12, color: "#8e9fb5", marginTop: 2 }}>
                        {item.totalCount} encounters • {item.completedCount} completed
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#e5b869" }}>
                        AED {item.revenueAed.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                        {item.totalCount > 0 ? Math.round((item.completedCount / item.totalCount) * 100) : 0}% attended
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                <FileText size={32} color="#64748b" style={{ margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                  No service encounters logged yet
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "6px auto 0" }}>
                  Tickets issued from Live Queue will populate service analytics automatically.
                </p>
              </div>
            )}
          </article>

          {/* Real Completed Consultations Audit Stream */}
          <article
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  Completed Consultation Audit Log
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8e9fb5" }}>
                  Attended patients, ticket numbers, and check-in timestamps.
                </p>
              </div>
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                {completedTickets.length} Consultations
              </span>
            </div>

            {completedTickets.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {completedTickets.slice(0, 10).map((ticket) => (
                  <div
                    key={ticket.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.05)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          minWidth: 42,
                          height: 42,
                          borderRadius: 10,
                          background: "#10b981",
                          color: "#060b13",
                          fontWeight: 800,
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {ticket.ticketNumber}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                          {ticket.patientName}
                        </div>
                        <div style={{ fontSize: 12, color: "#8e9fb5", marginTop: 2 }}>
                          {ticket.service} • Check-in: {ticket.checkInTime}
                          {ticket.completedAt ? ` • Done: ${new Date(ticket.completedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                        }}
                      >
                        COMPLETED
                      </span>
                      <div style={{ fontSize: 12, color: "#e5b869", fontWeight: 700, marginTop: 4 }}>
                        AED {feeAmountInAed.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                <CheckCircle2 size={32} color="#64748b" style={{ margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
                  No completed consultations for this period
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "6px auto 0" }}>
                  Consultations marked as &quot;Finish Consultation&quot; in Live Queue will appear here.
                </p>
              </div>
            )}
          </article>
        </div>

        {/* RIGHT COLUMN: HOURLY VISUAL INFLOW & PATIENT DEMOGRAPHICS */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Hourly Inflow Chart Box */}
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
                <TrendingUp size={16} color="#e5b869" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                  Chamber Inflow Distribution
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "#8e9fb5" }}>
                {chamberTimezone}
              </span>
            </div>

            {/* Inflow Bar Canvas */}
            <div
              style={{
                height: 160,
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                padding: "16px 8px 10px",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: 14,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {hourlyData.map((item) => {
                const barHeight = item.count > 0 ? Math.max(12, Math.round((item.count / maxHourlyCount) * 120)) : 4;
                return (
                  <div
                    key={item.hour}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    {item.count > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#e5b869" }}>
                        {item.count}
                      </span>
                    )}
                    <div
                      style={{
                        width: "80%",
                        maxWidth: 20,
                        height: barHeight,
                        borderRadius: "3px 3px 1px 1px",
                        background: item.count > 0 ? "linear-gradient(180deg, #e5b869 0%, #b88628 100%)" : "rgba(255, 255, 255, 0.06)",
                        boxShadow: item.count > 0 ? "0 0 10px rgba(229, 184, 105, 0.3)" : "none",
                        transition: "height 0.4s ease",
                      }}
                      title={`${item.hour}: ${item.count} patients`}
                    />
                    <span style={{ fontSize: 8, color: "#64748b", whiteSpace: "nowrap" }}>
                      {item.hour.replace(":00", "")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8e9fb5" }}>
              <span>Peak: {hourlyData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), hourlyData[0]!).hour}</span>
              <span>Encounters: {targetTickets.length}</span>
            </div>
          </div>

          {/* Patient Demographics & Profile Attributes */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users2 size={16} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                Patient Demographic Insights
              </h3>
            </div>

            {/* Gender Distribution */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#8e9fb5", fontWeight: 600 }}>Gender Ratio (Registered)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8e9fb5" }}>Male</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{genderBreakdown.male}</div>
                </div>
                <div style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(236, 72, 153, 0.1)", border: "1px solid rgba(236, 72, 153, 0.2)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8e9fb5" }}>Female</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ec4899" }}>{genderBreakdown.female}</div>
                </div>
                <div style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8e9fb5" }}>Other</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{genderBreakdown.other}</div>
                </div>
              </div>
            </div>

            {/* Blood Groups */}
            {bloodGroupStats.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#8e9fb5", fontWeight: 600 }}>Blood Groups Recorded</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {bloodGroupStats.map((b) => (
                    <span
                      key={b.blood}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 8,
                        background: "rgba(229, 184, 105, 0.12)",
                        border: "1px solid rgba(229, 184, 105, 0.3)",
                        color: "#e5b869",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {b.blood}: {b.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
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
              Operational Portals
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
              <span style={{ fontSize: 11, color: "#e5b869" }}>&rarr;</span>
            </Link>

            <Link
              href="/patients"
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
              <span style={{ fontSize: 11, color: "#38bdf8" }}>&rarr;</span>
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
