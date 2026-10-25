"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CalendarPlus,
  Calendar,
  Users,
  Stethoscope,
  FileText,
  Printer,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getStoredPortalUser,
  getDoctorProfile,
  type DoctorProfileRecord,
} from "@/lib/api/admin-client";
import {
  fetchDoctorReports,
  type DoctorReportsResponse,
  type DoctorReportEncounterItem,
} from "@/lib/api/doctor-reports-client";

type DateRangePreset = "THIS_MONTH" | "LAST_30" | "LAST_7" | "TODAY" | "CUSTOM";

interface PresetOption {
  id: DateRangePreset;
  label: string;
  getDates: () => { startDate: string; endDate: string; displayLabel: string };
}

function formatDateDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[d.getMonth()] || "";
  const y = d.getFullYear();
  return `${day} ${m} ${y}`;
}

function formatIsoDateDisplay(isoStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr;
  const parts = isoStr.split("-").map(Number);
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const y = parts[0] ?? new Date().getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[m - 1] || "";
  return `${String(d).padStart(2, "0")} ${monthName} ${y}`;
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: "THIS_MONTH",
    label: "This Month",
    getDates: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: toIsoDate(firstDay),
        endDate: toIsoDate(now),
        displayLabel: `${formatDateDisplay(firstDay)} - ${formatDateDisplay(now)}`,
      };
    },
  },
  {
    id: "LAST_30",
    label: "Last 30 Days",
    getDates: () => {
      const now = new Date();
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      return {
        startDate: toIsoDate(past30),
        endDate: toIsoDate(now),
        displayLabel: `${formatDateDisplay(past30)} - ${formatDateDisplay(now)}`,
      };
    },
  },
  {
    id: "LAST_7",
    label: "Last 7 Days",
    getDates: () => {
      const now = new Date();
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return {
        startDate: toIsoDate(past7),
        endDate: toIsoDate(now),
        displayLabel: `${formatDateDisplay(past7)} - ${formatDateDisplay(now)}`,
      };
    },
  },
  {
    id: "TODAY",
    label: "Today",
    getDates: () => {
      const now = new Date();
      return {
        startDate: toIsoDate(now),
        endDate: toIsoDate(now),
        displayLabel: `Today (${formatDateDisplay(now)})`,
      };
    },
  },
];

export function ReportsView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileRecord | null>(null);

  // Date Range Filter States
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("THIS_MONTH");
  const [dateRangeDates, setDateRangeDates] = useState(() => PRESET_OPTIONS[0]!.getDates());
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false);

  // Custom Date Range State
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() => PRESET_OPTIONS[0]!.getDates().startDate);
  const [customEndDate, setCustomEndDate] = useState<string>(() => PRESET_OPTIONS[0]!.getDates().endDate);
  const [customDateError, setCustomDateError] = useState<string | null>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Search & Filter Dropdown States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");
  const [selectedVisitType, setSelectedVisitType] = useState<string>("ALL");
  const [appliedVisitType, setAppliedVisitType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [appliedStatus, setAppliedStatus] = useState<string>("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Genuine Backend Report State
  const [reportsData, setReportsData] = useState<DoctorReportsResponse | null>(null);

  // Click outside listener for date range dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false);
      }
    }
    if (isDateRangeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDateRangeOpen]);

  // Load Real Doctor Profile
  useEffect(() => {
    let mounted = true;
    getDoctorProfile()
      .then((res) => {
        if (mounted && res?.doctor) {
          setDoctorProfile(res.doctor);
        }
      })
      .catch(() => {
        // Fallback to stored portal identity
        const stored = getStoredPortalUser();
        if (mounted && stored) {
          setDoctorProfile({
            id: stored.id,
            doctorId: stored.id,
            fullName: stored.fullName || stored.name || "Doctor",
            email: stored.email,
            phone: "",
            avatar: "",
            specialty: "Practitioner",
            licenseNumber: "",
            accountStatus: "ACTIVE",
            approvedAt: "",
            subscriptionId: "",
            assignedPatientCount: 0,
            totalBookingsCount: 0,
            chamberLocationsSummary: "",
            yearsOfExperience: 0,
            medicalDegrees: [],
            consultationFee: { amountInFils: 50000, currency: "AED", formatted: "500.00" },
            createdAt: "",
            updatedAt: "",
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch genuine backend reports
  const loadReports = useCallback(
    async (isBackground = false) => {
      if (isBackground) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchDoctorReports({
          startDate: dateRangeDates.startDate,
          endDate: dateRangeDates.endDate,
          search: appliedSearch || undefined,
          visitType: appliedVisitType,
          status: appliedStatus,
          page: currentPage,
          limit: pageSize,
        });

        setReportsData(response);
      } catch (err: any) {
        console.error("Doctor reports load error:", err);
        setError(err?.message || "Failed to load clinical reports from backend.");
        setReportsData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateRangeDates, appliedSearch, appliedVisitType, appliedStatus, currentPage, pageSize],
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Preset Change
  const handleSelectPreset = (preset: PresetOption) => {
    setSelectedPreset(preset.id);
    setIsCustomMode(false);
    setCustomDateError(null);
    const dates = preset.getDates();
    setDateRangeDates(dates);
    setCustomStartDate(dates.startDate);
    setCustomEndDate(dates.endDate);
    setIsDateRangeOpen(false);
    setCurrentPage(1);
  };

  // Handle Custom Range Apply
  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      setCustomDateError("Please select both start and end dates.");
      return;
    }
    if (customStartDate > customEndDate) {
      setCustomDateError("Start date cannot be after end date.");
      return;
    }
    setCustomDateError(null);
    setSelectedPreset("CUSTOM");
    setDateRangeDates({
      startDate: customStartDate,
      endDate: customEndDate,
      displayLabel: `${formatIsoDateDisplay(customStartDate)} - ${formatIsoDateDisplay(customEndDate)}`,
    });
    setIsDateRangeOpen(false);
    setIsCustomMode(false);
    setCurrentPage(1);
  };

  // Handle Apply Filter
  const handleApplyFilter = () => {
    setAppliedSearch(searchQuery.trim());
    setAppliedVisitType(selectedVisitType);
    setAppliedStatus(selectedStatus);
    setCurrentPage(1);
  };



  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Generate Avatar initials color
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

  // Dynamic Trend Chart Path Geometry derived from genuine API results
  const trendGeometry = useMemo(() => {
    const points = reportsData?.visitTrend || [];
    if (points.length === 0) {
      return {
        pathNewPatients: "M 40,180 L 580,180",
        areaNewPatients: "M 40,180 L 580,180 Z",
        pathFollowUp: "M 40,180 L 580,180",
        areaFollowUp: "M 40,180 L 580,180 Z",
        dotsNewPatients: [],
        dotsFollowUp: [],
        yGridLines: [
          { val: 10, y: 50 },
          { val: 5, y: 115 },
          { val: 0, y: 180 },
        ],
        xTicks: [],
        hasData: false,
      };
    }

    const maxCount = Math.max(5, ...points.map((p) => Math.max(p.newPatients, p.followUps, p.totalVisits)));
    const yMax = Math.ceil(maxCount / 5) * 5;

    const getY = (val: number) => 180 - (val / yMax) * 130;
    const getX = (index: number) => {
      if (points.length <= 1) return 310;
      return 40 + (index / (points.length - 1)) * 540;
    };

    // Build SVG smooth path strings
    const newCoords = points.map((p, i) => ({ x: getX(i), y: getY(p.newPatients) }));
    const followCoords = points.map((p, i) => ({ x: getX(i), y: getY(p.followUps) }));

    const buildPath = (coords: { x: number; y: number }[]) => {
      if (coords.length === 0) return "M 40,180";
      if (coords.length === 1) return `M 40,${coords[0]!.y} L 580,${coords[0]!.y}`;
      let d = `M ${coords[0]!.x.toFixed(1)},${coords[0]!.y.toFixed(1)}`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1]!;
        const curr = coords[i]!;
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (curr.x - prev.x) / 2;
        const cp2y = curr.y;
        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
      }
      return d;
    };

    const pathNewPatients = buildPath(newCoords);
    const areaNewPatients = `${pathNewPatients} L ${getX(points.length - 1).toFixed(1)},180 L ${getX(0).toFixed(1)},180 Z`;

    const pathFollowUp = buildPath(followCoords);
    const areaFollowUp = `${pathFollowUp} L ${getX(points.length - 1).toFixed(1)},180 L ${getX(0).toFixed(1)},180 Z`;

    // Filter dots: sample up to 10 dots for clear visual presentation
    const step = Math.max(1, Math.floor(points.length / 8));
    const dotsNewPatients = newCoords.filter((_, i) => i % step === 0 || i === points.length - 1);
    const dotsFollowUp = followCoords.filter((_, i) => i % step === 0 || i === points.length - 1);

    // X-Axis sample ticks
    const tickStep = Math.max(1, Math.floor(points.length / 5));
    const xTicks = points
      .map((p, i) => ({ label: p.displayDate, x: getX(i) }))
      .filter((_, i) => i % tickStep === 0 || i === points.length - 1);

    const yGridLines = [
      { val: yMax, y: 50 },
      { val: Math.round(yMax * 0.66), y: 93 },
      { val: Math.round(yMax * 0.33), y: 136 },
      { val: 0, y: 180 },
    ];

    const hasData = points.some((p) => p.totalVisits > 0);

    return {
      pathNewPatients,
      areaNewPatients,
      pathFollowUp,
      areaFollowUp,
      dotsNewPatients,
      dotsFollowUp,
      yGridLines,
      xTicks,
      hasData,
    };
  }, [reportsData]);

  // Donut Arc Calculations
  const donutArcs = useMemo(() => {
    const bd = reportsData?.visitTypeBreakdown;
    const total = reportsData?.summary.totalVisits || 0;

    if (!bd || !bd.hasData || total === 0) {
      return {
        hasData: false,
        consultationDash: "0 389.56",
        consultationOffset: 0,
        followUpDash: "0 389.56",
        followUpOffset: 0,
        reviewDash: "0 389.56",
        reviewOffset: 0,
        consultationPct: 0,
        followUpPct: 0,
        reviewPct: 0,
        consultationCount: 0,
        followUpCount: 0,
        reviewCount: 0,
        totalVisits: 0,
      };
    }

    const cDash = (bd.consultationPct / 100) * 389.56;
    const fDash = (bd.followUpPct / 100) * 389.56;
    const rDash = (bd.reviewPct / 100) * 389.56;

    const fOffset = -cDash;
    const rOffset = -(cDash + fDash);

    return {
      hasData: true,
      consultationDash: `${Math.max(0, cDash)} 389.56`,
      consultationOffset: 0,
      followUpDash: `${Math.max(0, fDash)} 389.56`,
      followUpOffset: fOffset,
      reviewDash: `${Math.max(0, rDash)} 389.56`,
      reviewOffset: rOffset,
      consultationPct: bd.consultationPct,
      followUpPct: bd.followUpPct,
      reviewPct: bd.reviewPct,
      consultationCount: bd.consultationCount,
      followUpCount: bd.followUpCount,
      reviewCount: bd.reviewCount,
      totalVisits: total,
    };
  }, [reportsData]);

  const summary = reportsData?.summary;
  const encounters = reportsData?.encounters.items || [];
  const totalEncounters = reportsData?.encounters.total || 0;
  const totalPages = reportsData?.encounters.totalPages || 1;

  return (
    <div className="reports-luxury-page-container">
      {/* PRINT-ONLY OFFICIAL CLINICAL REPORT LETTERHEAD */}
      <div className="reports-print-only-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Global Booking Healthcare Network
            </div>
            <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 600, marginTop: 2 }}>
              Official Clinical Consultation &amp; Throughput Report
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
              {doctorProfile?.fullName || "Doctor"}
            </div>
            <div style={{ fontSize: 11.5, color: "#4b5563" }}>
              {doctorProfile?.specialty || "General Medicine"}
            </div>
            {doctorProfile?.licenseNumber && (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                License: {doctorProfile.licenseNumber}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: 8, fontSize: 11, color: "#4b5563" }}>
          <div>
            <strong>Reporting Window:</strong> {dateRangeDates.displayLabel}
          </div>
          <div>
            <strong>Generated:</strong> {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
      </div>

      {/* 1. TOP HEADER ROW */}
      <header className="reports-header-row" aria-label="Reports Header">
        <div className="reports-header-left">
          <div className="reports-header-icon-badge" title="Reports & Analytics">
            <CalendarPlus size={24} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="reports-header-title-text">Reports</h1>
            <p className="reports-header-subtitle-text">
              {doctorProfile?.fullName ? `${doctorProfile.fullName} • ` : ""}
              Authentic patient history, visit records and clinical reporting
            </p>
          </div>
        </div>

        <div className="reports-header-actions">
          {/* Refresh Action */}
          <button
            type="button"
            className="reports-btn-action"
            onClick={() => loadReports(true)}
            disabled={loading || refreshing}
            title="Refresh clinical reports from backend"
          >
            <RefreshCw size={15} style={{ color: "#f5c270" }} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Interactive Date Range Dropdown with Custom Date Picker */}
          <div ref={dateDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="reports-btn-date-range"
              onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              title="Select reporting period or customize dates"
            >
              <Calendar size={15} style={{ color: "#f5c270" }} />
              <span>{dateRangeDates.displayLabel}</span>
              <ChevronDown size={14} style={{ color: "#94a3b8" }} />
            </button>

            {isDateRangeOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 9999,
                  background: "linear-gradient(135deg, #0d1629 0%, #080e1b 100%)",
                  border: "1px solid rgba(229, 184, 105, 0.4)",
                  borderRadius: 12,
                  boxShadow: "0 14px 40px rgba(0, 0, 0, 0.75)",
                  padding: "8px 0",
                  minWidth: 260,
                }}
              >
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      textAlign: "left",
                      background: selectedPreset === preset.id && !isCustomMode ? "rgba(229, 184, 105, 0.12)" : "transparent",
                      color: selectedPreset === preset.id && !isCustomMode ? "#f5c270" : "#cbd5e1",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: selectedPreset === preset.id && !isCustomMode ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{preset.label}</span>
                    {selectedPreset === preset.id && !isCustomMode && <CheckCircle2 size={13} style={{ color: "#f5c270" }} />}
                  </button>
                ))}

                <div style={{ height: 1, background: "rgba(255, 255, 255, 0.08)", margin: "6px 0" }} />

                {/* Custom Date Range Toggle & Input Panel */}
                <div style={{ padding: "4px 14px 8px 14px" }}>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    style={{
                      width: "100%",
                      background: selectedPreset === "CUSTOM" || isCustomMode ? "rgba(2, 143, 215, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${selectedPreset === "CUSTOM" || isCustomMode ? "rgba(2, 143, 215, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                      color: selectedPreset === "CUSTOM" || isCustomMode ? "#028FD7" : "#cbd5e1",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Calendar size={13} style={{ color: "#028FD7" }} />
                      <span>Custom Date Range</span>
                    </span>
                    <ChevronDown
                      size={13}
                      style={{
                        transform: isCustomMode ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>

                  {isCustomMode && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 9 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 3, fontWeight: 600 }}>
                          From Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          max={customEndDate || undefined}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(5, 11, 20, 0.95)",
                            border: "1px solid rgba(2, 143, 215, 0.4)",
                            color: "#ffffff",
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            colorScheme: "dark",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 3, fontWeight: 600 }}>
                          To Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          min={customStartDate || undefined}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(5, 11, 20, 0.95)",
                            border: "1px solid rgba(2, 143, 215, 0.4)",
                            color: "#ffffff",
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            colorScheme: "dark",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {customDateError && (
                        <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                          {customDateError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleApplyCustomRange}
                        style={{
                          marginTop: 2,
                          width: "100%",
                          background: "linear-gradient(135deg, #028FD7 0%, #0277b5 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 750,
                          cursor: "pointer",
                          boxShadow: "0 3px 12px rgba(2, 143, 215, 0.4)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Apply Custom Range
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            className="reports-btn-action"
            onClick={handlePrint}
            title="Open browser print dialog to print or save PDF"
          >
            <Printer size={15} style={{ color: "#f5c270" }} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </header>

      {/* Error Alert Banner */}
      {error && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadReports()}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ffffff",
              padding: "4px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. FILTER BAR */}
      <section className="reports-filter-deck" aria-label="Report Filters">
        <div className="reports-search-wrap">
          <Search size={16} className="reports-search-icon" />
          <input
            type="text"
            className="reports-search-input"
            placeholder="Search patient name, phone or MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyFilter();
            }}
          />
        </div>

        <div className="reports-filter-controls-group">
          {/* Visit Type Dropdown */}
          <select
            className="reports-select-pill"
            value={selectedVisitType}
            onChange={(e) => setSelectedVisitType(e.target.value)}
            aria-label="Filter by visit type"
          >
            <option value="ALL">All Visit Types</option>
            <option value="Consultation">Consultation</option>
            <option value="Follow Up">Follow Up</option>
            <option value="Review">Review</option>
          </select>

          {/* Status Dropdown */}
          <select
            className="reports-select-pill"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Status</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Apply Filter Button - Styled with Brand #028FD7 */}
          <button
            type="button"
            className="reports-btn-apply"
            onClick={handleApplyFilter}
            title="Apply current search and filter selections"
          >
            <Filter size={15} strokeWidth={2.4} />
            <span>Apply Filter</span>
          </button>
        </div>
      </section>

      {/* 3. FOUR LUXURY GLOWING KPI CARDS */}
      <section className="reports-kpi-grid" aria-label="Key Performance Indicators">
        {/* Card 1: Total Patients */}
        <div className="reports-kpi-card kpi-emerald">
          <div className="reports-kpi-icon-orb">
            <Users size={22} strokeWidth={2.4} />
          </div>
          <div className="reports-kpi-content">
            <span className="reports-kpi-label">Total Patients</span>
            <span className="reports-kpi-value">{loading ? "..." : summary?.totalPatients ?? 0}</span>
            <span className="reports-kpi-desc">Unique patients attended in period</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 2: Total Visits */}
        <div className="reports-kpi-card kpi-cyan">
          <div className="reports-kpi-icon-orb">
            <Calendar size={22} strokeWidth={2.4} />
          </div>
          <div className="reports-kpi-content">
            <span className="reports-kpi-label">Total Visits</span>
            <span className="reports-kpi-value">{loading ? "..." : summary?.totalVisits ?? 0}</span>
            <span className="reports-kpi-desc">Completed clinical visits</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 3: Follow Up Visits */}
        <div className="reports-kpi-card kpi-purple">
          <div className="reports-kpi-icon-orb">
            <Stethoscope size={22} strokeWidth={2.4} />
          </div>
          <div className="reports-kpi-content">
            <span className="reports-kpi-label">Follow Up Visits</span>
            <span className="reports-kpi-value">{loading ? "..." : summary?.followUpVisits ?? 0}</span>
            <span className="reports-kpi-desc">Return patient encounters</span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>

        {/* Card 4: Average Visit Interval */}
        <div className="reports-kpi-card kpi-amber">
          <div className="reports-kpi-icon-orb">
            <FileText size={22} strokeWidth={2.4} />
          </div>
          <div className="reports-kpi-content">
            <span className="reports-kpi-label">Average Visit Interval</span>
            <span className="reports-kpi-value">
              {loading
                ? "..."
                : summary?.hasSufficientIntervalData && summary.averageIntervalDays !== null
                ? `${summary.averageIntervalDays} Days`
                : "N/A"}
            </span>
            <span className="reports-kpi-desc">
              {summary?.hasSufficientIntervalData
                ? "Average return days between visits"
                : "Insufficient repeat visits in period"}
            </span>
          </div>
          <ChevronRight size={18} style={{ color: "#64748b", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
        </div>
      </section>

      {/* 4. CHARTS SECTION (Visit Trend & Visit Type) */}
      <section className="reports-charts-grid" aria-label="Visual Analytics">
        {/* Chart 1: Visit Trend (Real Continuous Geometry) */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <h2 className="reports-chart-title">Visit Trend</h2>
            <div className="reports-trend-legend">
              <div className="trend-legend-item">
                <span className="trend-legend-dot emerald" />
                <span>New Patients</span>
              </div>
              <div className="trend-legend-item">
                <span className="trend-legend-dot blue" />
                <span>Follow Up</span>
              </div>
            </div>
          </div>

          {/* SVG Spline Wave Area Chart */}
          <div style={{ position: "relative", width: "100%", height: 210 }}>
            <svg
              viewBox="0 0 600 200"
              style={{ width: "100%", height: "100%", overflow: "visible" }}
              preserveAspectRatio="none"
            >
              <defs>
                {/* Gradient for New Patients (Emerald) */}
                <linearGradient id="trendEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Gradient for Follow Up (Cyan/Blue) */}
                <linearGradient id="trendCyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
                </filter>
                <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Grid Lines & Y-Axis Labels */}
              {trendGeometry.yGridLines.map((line) => (
                <g key={line.val}>
                  <text
                    x="8"
                    y={line.y + 4}
                    fill="#64748b"
                    fontSize="10.5"
                    fontFamily="inherit"
                    fontWeight="600"
                  >
                    {line.val}
                  </text>
                  <line
                    x1="32"
                    y1={line.y}
                    x2="595"
                    y2={line.y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray={line.val === 0 ? "none" : "3,3"}
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* AREA 1: New Patients Filled Gradient Area */}
              <path d={trendGeometry.areaNewPatients} fill="url(#trendEmeraldGrad)" />

              {/* AREA 2: Follow Up Filled Gradient Area */}
              <path d={trendGeometry.areaFollowUp} fill="url(#trendCyanGrad)" />

              {/* CURVE 1: New Patients Emerald Wave Line */}
              <path
                d={trendGeometry.pathNewPatients}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                filter="url(#emeraldGlow)"
              />

              {/* CURVE 2: Follow Up Cyan Wave Line */}
              <path
                d={trendGeometry.pathFollowUp}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                filter="url(#cyanGlow)"
              />

              {/* Glowing Data Dots on Emerald Line */}
              {trendGeometry.dotsNewPatients.map((dot, i) => (
                <circle
                  key={`em-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="3.5"
                  fill="#10b981"
                  stroke="#050b14"
                  strokeWidth="1.5"
                  filter="url(#emeraldGlow)"
                />
              ))}

              {/* Glowing Data Dots on Cyan Line */}
              {trendGeometry.dotsFollowUp.map((dot, i) => (
                <circle
                  key={`cy-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="3.5"
                  fill="#38bdf8"
                  stroke="#050b14"
                  strokeWidth="1.5"
                  filter="url(#cyanGlow)"
                />
              ))}

              {/* X-Axis Date Labels */}
              {trendGeometry.xTicks.map((tick) => (
                <text
                  key={tick.label + tick.x}
                  x={tick.x}
                  y="196"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="inherit"
                  fontWeight="600"
                >
                  {tick.label}
                </text>
              ))}
            </svg>

            {/* Empty state overlay if zero visits */}
            {!trendGeometry.hasData && !loading && (
              <div
                style={{
                  position: "absolute",
                  inset: "30px 40px 30px 40px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(5, 11, 20, 0.75)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 10,
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  fontSize: 12.5,
                  fontWeight: 600,
                  textAlign: "center",
                  padding: 16,
                }}
              >
                <span>No consultation activity recorded in this period.</span>
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Completed queue tickets and appointments will populate this curve.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Visit Type (Luxury Donut Ring Chart) */}
        <div className="reports-chart-card">
          <div className="reports-chart-header">
            <h2 className="reports-chart-title">Visit Type</h2>
          </div>

          <div className="reports-donut-body">
            {/* SVG Donut Ring */}
            <div style={{ position: "relative", width: 145, height: 145, flexShrink: 0 }}>
              <svg viewBox="0 0 160 160" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="20"
                />

                {donutArcs.hasData && (
                  <>
                    {/* Consultation Arc */}
                    {donutArcs.consultationPct > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="62"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="20"
                        strokeDasharray={donutArcs.consultationDash}
                        strokeDashoffset={donutArcs.consultationOffset}
                        strokeLinecap="round"
                        style={{
                          filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))",
                          transition: "stroke-dasharray 0.8s ease",
                        }}
                      />
                    )}

                    {/* Follow Up Arc */}
                    {donutArcs.followUpPct > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="62"
                        fill="transparent"
                        stroke="#38bdf8"
                        strokeWidth="20"
                        strokeDasharray={donutArcs.followUpDash}
                        strokeDashoffset={donutArcs.followUpOffset}
                        strokeLinecap="round"
                        style={{
                          filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))",
                          transition: "stroke-dasharray 0.8s ease",
                        }}
                      />
                    )}

                    {/* Review Arc */}
                    {donutArcs.reviewPct > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="62"
                        fill="transparent"
                        stroke="#a855f7"
                        strokeWidth="20"
                        strokeDasharray={donutArcs.reviewDash}
                        strokeDashoffset={donutArcs.reviewOffset}
                        strokeLinecap="round"
                        style={{
                          filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))",
                          transition: "stroke-dasharray 0.8s ease",
                        }}
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Center Metric */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
                  {loading ? "..." : donutArcs.totalVisits}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 4 }}>
                  Total Visits
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="donut-legend-list">
              <div className="donut-legend-item">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="trend-legend-dot emerald" />
                  <span style={{ color: "#ffffff" }}>Consultation</span>
                </div>
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                  {donutArcs.consultationCount} ({donutArcs.consultationPct}%)
                </span>
              </div>

              <div className="donut-legend-item">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="trend-legend-dot blue" />
                  <span style={{ color: "#ffffff" }}>Follow Up</span>
                </div>
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                  {donutArcs.followUpCount} ({donutArcs.followUpPct}%)
                </span>
              </div>

              <div className="donut-legend-item">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="trend-legend-dot purple" />
                  <span style={{ color: "#ffffff" }}>Review</span>
                </div>
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                  {donutArcs.reviewCount} ({donutArcs.reviewPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PATIENT VISIT HISTORY TABLE */}
      <section className="reports-table-card" aria-label="Patient Visit History">
        <div className="reports-table-header">
          <div className="reports-table-title-group">
            <CalendarPlus size={20} style={{ color: "#f5c270" }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
              Patient Visit History (All Records)
            </h2>
          </div>

          <div className="reports-table-meta-group">
            <span>
              Total Records: <strong style={{ color: "#ffffff" }}>{totalEncounters}</strong>
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Show</span>
              <select
                className="reports-select-pill"
                style={{ padding: "6px 28px 6px 10px", fontSize: 12 }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>

        {/* Table Viewport */}
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th style={{ width: 45 }}>#</th>
                <th>Patient Name</th>
                <th>Visit Type</th>
                <th>Date &amp; Time</th>
                <th>Doctor / Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "#8e9fb5" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <RefreshCw size={16} className="animate-spin" style={{ color: "#f5c270" }} />
                      <span>Loading clinical encounter records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : encounters.length > 0 ? (
                encounters.map((visit: DoctorReportEncounterItem, index: number) => {
                  const recordIndex = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={visit.id}>
                      {/* Serial */}
                      <td style={{ color: "#64748b", fontWeight: 700, fontSize: 12 }}>
                        {String(recordIndex).padStart(2, "0")}
                      </td>

                      {/* Patient Name + Avatar + MRN */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: getInitialsGradient(visit.patientName),
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
                            {visit.patientName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13.5 }}>
                              {visit.patientName}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                              <span style={{ color: "#38bdf8", fontWeight: 600 }}>{visit.mrn}</span>
                              <span style={{ margin: "0 6px" }}>•</span>
                              <span>{visit.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Visit Type Badge */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background:
                              visit.visitType === "Consultation"
                                ? "rgba(16, 185, 129, 0.14)"
                                : visit.visitType === "Follow Up"
                                ? "rgba(56, 189, 248, 0.14)"
                                : "rgba(168, 85, 247, 0.14)",
                            color:
                              visit.visitType === "Consultation"
                                ? "#34d399"
                                : visit.visitType === "Follow Up"
                                ? "#38bdf8"
                                : "#c084fc",
                            border: `1px solid ${
                              visit.visitType === "Consultation"
                                ? "rgba(16, 185, 129, 0.3)"
                                : visit.visitType === "Follow Up"
                                ? "rgba(56, 189, 248, 0.3)"
                                : "rgba(168, 85, 247, 0.3)"
                            }`,
                          }}
                        >
                          {visit.visitType}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ color: "#cbd5e1", fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {visit.dateTime}
                      </td>

                      {/* Doctor / Service */}
                      <td>
                        <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 13 }}>
                          {visit.doctorName}
                        </div>
                        <div style={{ color: "#8e9fb5", fontSize: 11.5, marginTop: 1 }}>
                          {visit.service}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background:
                                visit.status === "Completed"
                                  ? "#10b981"
                                  : visit.status === "In Progress"
                                  ? "#38bdf8"
                                  : visit.status === "Cancelled"
                                  ? "#ef4444"
                                  : "#f59e0b",
                              boxShadow: `0 0 8px ${
                                visit.status === "Completed"
                                  ? "#10b981"
                                  : visit.status === "In Progress"
                                  ? "#38bdf8"
                                  : visit.status === "Cancelled"
                                  ? "#ef4444"
                                  : "#f59e0b"
                              }`,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                visit.status === "Completed"
                                  ? "#10b981"
                                  : visit.status === "In Progress"
                                  ? "#38bdf8"
                                  : visit.status === "Cancelled"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                          >
                            {visit.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "#8e9fb5" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <CalendarPlus size={28} style={{ color: "#64748b", opacity: 0.5 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#cbd5e1" }}>
                        No clinical visit records found.
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        There are no completed consultations matching your selected date range and filters.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            paddingTop: 10,
            fontSize: 12.5,
            color: "#94a3b8",
          }}
        >
          <div>
            Showing{" "}
            <strong style={{ color: "#ffffff" }}>
              {totalEncounters > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong style={{ color: "#ffffff" }}>
              {Math.min(currentPage * pageSize, totalEncounters)}
            </strong>{" "}
            of <strong style={{ color: "#ffffff" }}>{totalEncounters}</strong> records
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: currentPage <= 1 ? "#475569" : "#cbd5e1",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border:
                    currentPage === pageNum
                      ? "1px solid rgba(229, 184, 105, 0.6)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  background:
                    currentPage === pageNum
                      ? "linear-gradient(135deg, rgba(229, 184, 105, 0.25) 0%, rgba(184, 134, 40, 0.15) 100%)"
                      : "rgba(255, 255, 255, 0.03)",
                  color: currentPage === pageNum ? "#f5c270" : "#94a3b8",
                  fontWeight: 750,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {pageNum}
              </button>
            ))}

            {totalPages > 5 && (
              <>
                <span style={{ color: "#64748b", padding: "0 2px" }}>...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border:
                      currentPage === totalPages
                        ? "1px solid rgba(229, 184, 105, 0.6)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    background:
                      currentPage === totalPages
                        ? "linear-gradient(135deg, rgba(229, 184, 105, 0.25) 0%, rgba(184, 134, 40, 0.15) 100%)"
                        : "rgba(255, 255, 255, 0.03)",
                    color: currentPage === totalPages ? "#f5c270" : "#94a3b8",
                    fontWeight: 750,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: currentPage >= totalPages ? "#475569" : "#cbd5e1",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* PRINT-ONLY OFFICIAL FOOTER */}
      <div className="reports-print-only-footer">
        <span>Confidential Clinical Analytics Document • Generated securely via Global Booking Portal</span>
        <span>Doctor ID: {doctorProfile?.doctorId || "DOC"} • Page 1 of 1</span>
      </div>
    </div>
  );
}
