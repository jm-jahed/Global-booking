"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users2,
  Clock,
  Tv,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Volume2,
  Monitor,
  ChevronDown,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock4,
  RefreshCw,
  BellRing,
  MoreVertical,
  Check,
  ShieldAlert,
  Stethoscope,
  Globe,
  PhoneCall,
  MapPin,
  ExternalLink,
  Activity,
  Zap,
  Calendar,
  Users,
  Bed,
  BarChart2,
  CreditCard,
  Phone,
  Ticket,
} from "lucide-react";
import {
  fetchDoctorQueue,
  callQueuePatient,
  finishQueuePatient,
  type BackendQueueTicket,
} from "@/lib/api/doctor-queue-client";
import { DOCTOR_CHAMBER_COUNTERS } from "@/lib/services/doctor-queue-service";
import { QueueItem, CounterStation, QueueStatus, PriorityLevel, CheckInChannel } from "@/types/queue";
import { NewTicketModal } from "./new-ticket-modal";
import { LiveDisplayModal } from "./live-display-modal";
import { getStoredPortalUser } from "@/lib/api/admin-client";

function mapBackendTicketToQueueItem(
  t: BackendQueueTicket,
  specialistName: string
): QueueItem {
  let mappedStatus: QueueStatus = "Waiting";
  if (t.status === "CALLED" || t.status === "IN_CONSULTATION") {
    mappedStatus = "Serving";
  } else if (t.status === "COMPLETED") {
    mappedStatus = "Completed";
  } else {
    mappedStatus = "Waiting";
  }

  let mappedPriority: PriorityLevel = "Standard";
  if (t.priority === "VIP") mappedPriority = "VIP";
  else if (t.priority === "URGENT") mappedPriority = "Urgent";

  let mappedChannel: CheckInChannel = "Chamber Visit";
  if (t.channel === "WALK_IN") mappedChannel = "QR Walk-In";
  else if (t.channel === "ONLINE_WEB") mappedChannel = "Online Booking";

  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    clientName: t.patientName,
    clientAvatar: "",
    service: t.service || "Chamber Consultation",
    specialist: specialistName,
    counterName: t.chamberName || "Main Chamber",
    checkInTime: t.checkInTime || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"),
    estWaitMinutes: 0,
    status: mappedStatus,
    priority: mappedPriority,
    channel: mappedChannel,
    notes: t.notes,
    patientPhone: t.patientPhone,
    patientId: t.patientOprId || (t.appointmentId ? `#APT-${t.appointmentId.slice(-5)}` : `#TKT-${t.serialIndex}`),
  };
}

export function LiveQueueView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [counters, setCounters] = useState<CounterStation[]>(DOCTOR_CHAMBER_COUNTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [selectedChamberId, setSelectedChamberId] = useState("");
  const [activeTab, setActiveTab] = useState<"queue" | "dispatch" | "lobby" | "schedule" | "reports">("queue");

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTvDisplayOpen, setIsTvDisplayOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = getStoredPortalUser();
    if (stored) {
      setCurrentUser(stored);
      if (stored.fullName || stored.name) {
        const chamberTitle =
          stored.chamberLocationsSummary ||
          (Array.isArray(stored.chambers) && stored.chambers[0]?.facilityName) ||
          "Main Consultation Chamber";
        setCounters([
          {
            id: "cnt-1",
            name: chamberTitle,
            room: chamberTitle,
            specialist: stored.fullName || stored.name || "Doctor Practice",
            specialistRole: stored.specialty || "Specialist Physician",
            specialistAvatar: stored.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
            status: "Active",
            currentTicket: undefined,
            totalServedToday: 0,
          },
        ]);
      }
    }
  }, []);

  const doctorName = currentUser?.fullName || currentUser?.name || "Doctor Practice";
  const chamberLocation =
    currentUser?.chamberLocationsSummary ||
    (Array.isArray(currentUser?.chambers) && currentUser?.chambers[0]?.facilityName) ||
    "Main Consultation Chamber";
  const doctorSpecialty = currentUser?.specialty || "Specialist Physician";
  const chambers: any[] = useMemo(() => {
    if (Array.isArray(currentUser?.chambers) && currentUser.chambers.length > 0) {
      return currentUser.chambers;
    }
    return [
      {
        id: "main-chamber",
        facilityName: chamberLocation,
        roomNumber: "Chamber 302",
        timezone: "Asia/Dhaka",
      },
    ];
  }, [currentUser, chamberLocation]);

  // Load live queue items directly from backend API (MongoDB)
  const loadQueue = useCallback(
    async (chamberId?: string, isSilent = false) => {
      if (!isSilent) setIsSyncing(true);
      try {
        const activeChamberId = chamberId !== undefined ? chamberId : selectedChamberId;
        const res = await fetchDoctorQueue(activeChamberId ? { chamberId: activeChamberId } : undefined);
        if (res && Array.isArray(res.items)) {
          const mapped = res.items.map((item) =>
            mapBackendTicketToQueueItem(item, doctorName)
          );
          setQueue(mapped);
          setApiError(null);

          // Sync station counter tickets with currently serving patient
          setCounters((prevCounters) =>
            prevCounters.map((c) => {
              const servingItem = mapped.find((q) => q.status === "Serving");
              const servedCount = mapped.filter((q) => q.status === "Completed").length;
              return {
                ...c,
                currentTicket: servingItem?.ticketNumber,
                totalServedToday: servedCount,
              };
            })
          );
        }
      } catch (err: any) {
        if (!isSilent) {
          setApiError(err.message || "Failed to load live queue from server.");
        }
      } finally {
        if (!isSilent) setIsSyncing(false);
      }
    },
    [selectedChamberId, doctorName]
  );

  useEffect(() => {
    loadQueue(selectedChamberId, false);

    const handleUpdate = () => {
      loadQueue(selectedChamberId, true);
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("global-booking-updated", handleUpdate);

    // Cross-device live synchronization polling (~3.5s)
    const interval = setInterval(() => {
      loadQueue(selectedChamberId, true);
    }, 3500);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("global-booking-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [selectedChamberId, loadQueue]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSync = async () => {
    await loadQueue(selectedChamberId, false);
    showToast("Live OPD Queue synchronized with real-time backend!");
  };

  // Next ticket calculation
  const nextTicketNumber = useMemo(() => {
    const numbers = queue
      .map((q) => parseInt(q.ticketNumber.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 500);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `#${(max + 1).toString().padStart(2, "0")}`;
  }, [queue]);

  // Real KPIs with zero fabricated mock fallback
  const kpis = useMemo(() => {
    const waiting = queue.filter((q) => q.status === "Waiting").length;
    const serving = queue.filter((q) => q.status === "Serving").length;
    const upcomingList = queue.filter((q) => q.status === "Next" || q.status === "Waiting");
    const nextPatient1 = upcomingList[0];
    const nextPatient2 = upcomingList[1];
    const nextPatient3 = upcomingList[2];
    const completed = queue.filter((q) => q.status === "Completed").length;

    return {
      waiting,
      serving,
      next1Ticket: nextPatient1?.ticketNumber || "—",
      next1Name: nextPatient1?.clientName || "No patient waiting",
      next2Ticket: nextPatient2?.ticketNumber || "—",
      next2Name: nextPatient2?.clientName || "No patient waiting",
      next3Ticket: nextPatient3?.ticketNumber || "—",
      next3Name: nextPatient3?.clientName || "No patient waiting",
      completed,
      totalToday: queue.length,
    };
  }, [queue]);

  // Backend actions: Call Next & Finish
  const handleCallNextTicket = async (ticketId: string) => {
    try {
      await callQueuePatient(ticketId);
      showToast("Patient called to consultation chamber!");
      await loadQueue(selectedChamberId, true);
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to call patient"}`);
    }
  };

  const handleFinishTicket = async (ticketId: string) => {
    try {
      await finishQueuePatient(ticketId);
      showToast("Consultation marked Completed.");
      await loadQueue(selectedChamberId, true);
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to finish consultation"}`);
    }
  };

  const handleAddTicket = (newItem: QueueItem) => {
    setQueue((prev) => [newItem, ...prev]);
    showToast(`OPD Ticket ${newItem.ticketNumber} issued for ${newItem.clientName}!`);
    loadQueue(selectedChamberId, true);
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchSearch =
        item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.counterName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "All Status"
          ? item.status !== "Completed"
          : item.status === statusFilter;

      const matchPriority =
        priorityFilter === "All Priority" || item.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [queue, searchQuery, statusFilter, priorityFilter]);

  const getAvatarGradient = (idx: number) => {
    const gradients = [
      "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", // purple
      "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", // teal
      "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)", // blue
      "linear-gradient(135deg, #059669 0%, #34d399 100%)", // emerald
      "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)", // amber
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <div className="queue-luxury-page-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Live OPD Queue & Chamber Dispatch */}
      <section className="queue-luxury-header">
        <div className="queue-header-left">
          {/* Pure glowing gold ECG heartbeat line */}
          <svg
            width="32"
            height="24"
            viewBox="0 0 32 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="queue-ecg-pulse-icon"
          >
            <path
              d="M 1 12 L 7 12 L 9 15 L 12 4 L 16 20 L 19 8 L 21 15 L 23 12 L 31 12"
              stroke="#f5a623"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 4px rgba(245, 166, 35, 0.7))"
            />
          </svg>
          <div>
            <h1 className="queue-header-title">Live OPD Queue & Chamber Dispatch</h1>
            <p className="queue-header-subtitle">
              Real-time patient triage, chamber calling, and waiting lobby monitor.
            </p>
          </div>
        </div>

        <div className="queue-header-actions">
          <button
            type="button"
            className="btn-glass-action"
            onClick={handleManualSync}
            title="Sync live queue with latest database records"
          >
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} />
            <span>Sync Queue</span>
          </button>

          <button
            type="button"
            className="btn-glass-action"
            onClick={() => setIsTvDisplayOpen(true)}
            title="Open Waiting Room Live TV Display"
          >
            <Tv size={15} />
            <span>Open TV Waiting Display ↗</span>
          </button>

          <button
            type="button"
            className="btn-gold-ticket"
            onClick={() => setIsNewTicketOpen(true)}
            title="Issue Walk-in OPD Ticket"
          >
            <Ticket size={16} strokeWidth={2.4} />
            <span>Issue Walk-in OPD Ticket</span>
          </button>
        </div>
      </section>

      {/* Network / API Error Notice Banner */}
      {apiError && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "10px 16px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fca5a5",
            fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadQueue(selectedChamberId, false)}
            style={{
              background: "transparent",
              border: "1px solid rgba(252, 165, 165, 0.5)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 LUXURY KPI METRIC CARDS */}
      <section className="queue-luxury-kpi-grid" aria-label="Queue KPI Metrics">
        {/* Card 1: Currently Waiting */}
        <article className="luxury-kpi-card">
          <svg className="kpi-chamfer-corner" viewBox="0 0 24 24" fill="none">
            <path d="M 0 16 L 16 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="kpi-icon-bubble cyan">
            <Users2 size={22} strokeWidth={2} />
          </div>
          <div className="kpi-content-box">
            <span className="kpi-label-text">Currently Waiting</span>
            <span className="kpi-big-value">{kpis.waiting.toString().padStart(2, "0")}</span>
            <div className="kpi-bottom-row">
              <span className="kpi-sub-text cyan">In Waiting Lobby</span>
              <div className="kpi-live-badge">
                <span className="kpi-pulse-dot" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Next Patient in Line */}
        <article className="luxury-kpi-card">
          <svg className="kpi-chamfer-corner" viewBox="0 0 24 24" fill="none">
            <path d="M 0 16 L 16 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="kpi-icon-bubble emerald">
            <User size={22} strokeWidth={2} />
          </div>
          <div className="kpi-content-box">
            <span className="kpi-label-text">Next Patient in Line</span>
            <span className="kpi-big-value">{kpis.next1Ticket}</span>
            <div className="kpi-bottom-row">
              <span className="kpi-sub-text slate">{kpis.next1Name}</span>
              <div className="kpi-live-badge">
                <span className="kpi-pulse-dot" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </article>

        {/* Card 3: Next Patient in Line */}
        <article className="luxury-kpi-card">
          <svg className="kpi-chamfer-corner" viewBox="0 0 24 24" fill="none">
            <path d="M 0 16 L 16 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="kpi-icon-bubble blue">
            <User size={22} strokeWidth={2} />
          </div>
          <div className="kpi-content-box">
            <span className="kpi-label-text">Next Patient in Line</span>
            <span className="kpi-big-value">{kpis.next2Ticket}</span>
            <div className="kpi-bottom-row">
              <span className="kpi-sub-text slate">{kpis.next2Name}</span>
              <div className="kpi-live-badge">
                <span className="kpi-pulse-dot" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </article>

        {/* Card 4: Next Patient in Line */}
        <article className="luxury-kpi-card">
          <svg className="kpi-chamfer-corner" viewBox="0 0 24 24" fill="none">
            <path d="M 0 16 L 16 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="kpi-icon-bubble cyan">
            <User size={22} strokeWidth={2} />
          </div>
          <div className="kpi-content-box">
            <span className="kpi-label-text">Next Patient in Line</span>
            <span className="kpi-big-value">{kpis.next3Ticket}</span>
            <div className="kpi-bottom-row">
              <span className="kpi-sub-text slate">{kpis.next3Name}</span>
              <div className="kpi-live-badge">
                <span className="kpi-pulse-dot" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* CONTROL FILTER BAR */}
      <section className="queue-luxury-filter-bar">
        <div className="filter-search-pill">
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search ticket #, patient, chamber..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div className="filter-select-pill">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-native-select"
          >
            <option value="All Status">All Status</option>
            <option value="Serving">In Consultation</option>
            <option value="Next">Next</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
          </select>
          <ChevronDown size={12} className="filter-arrow" />
        </div>

        <div className="filter-select-pill">
          <select
            value={selectedChamberId}
            onChange={(e) => setSelectedChamberId(e.target.value)}
            className="filter-native-select"
          >
            <option value="">All Chambers ({chambers.length})</option>
            {chambers.map((ch: any) => (
              <option key={ch.id} value={ch.id}>
                {ch.facilityName || ch.name || "Chamber"}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="filter-arrow" />
        </div>

        <div className="filter-live-pill" onClick={handleManualSync}>
          <span className="live-spark-icon">✦</span>
          <span>Live Updates</span>
        </div>
      </section>

      {/* PATIENT QUEUE PIPELINE TABLE */}
      <section className="queue-luxury-table-wrap">
        <table className="queue-luxury-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>#</th>
              <th>PATIENT DETAILS</th>
              <th>ASSIGNED CHAMBER</th>
              <th>CHECK-IN</th>
              <th>QUEUE STATUS</th>
              <th style={{ textAlign: "right" }}>TRIAGE ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueue.length > 0 ? (
              filteredQueue.map((item, index) => {
                const isNowServing = item.status === "Serving";
                return (
                  <tr
                    key={item.id}
                    className={isNowServing ? "row-serving-glow" : ""}
                  >
                    <td>
                      <span className={isNowServing ? "token-pill-gold" : "token-pill-dark"}>
                        {item.ticketNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          className="patient-initials-bubble"
                          style={{ background: getAvatarGradient(index) }}
                        >
                          {item.clientName.charAt(0)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                            {item.clientName}
                          </span>
                          <span style={{ fontSize: 10.5, color: "#64748b" }}>
                            {item.patientId || `#OPD-${45870 + index + 2}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={15} color="#ffffff" style={{ opacity: 0.9, flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                          <span style={{ fontSize: 12.5, color: "#ffffff", fontWeight: 600 }}>
                            {item.counterName.split("(")[0].trim() || "Main Chamber"}
                          </span>
                          {isNowServing && (
                            <span style={{ color: "#2dd4bf", fontSize: 11, fontWeight: 700 }}>
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.checkInTime}</span>
                    </td>
                    <td>
                      <span
                        className={
                          isNowServing
                            ? "badge-status-consultation"
                            : "badge-status-waiting"
                        }
                      >
                        {isNowServing ? "In Consultation" : "Waiting"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        {isNowServing ? (
                          <button
                            type="button"
                            className="btn-row-finish"
                            onClick={() => handleFinishTicket(item.id)}
                            title="Finish consultation"
                          >
                            Finish
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-row-call"
                            onClick={() => handleCallNextTicket(item.id)}
                            title="Call patient into chamber"
                          >
                            <Phone size={13} className="text-gold" />
                            <span>Call Next</span>
                          </button>
                        )}
                        <button type="button" className="btn-row-dots" aria-label="Row menu">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                  <Users2 size={32} color="#e5b869" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                  <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#ffffff" }}>
                    {queue.length === 0 ? "No Patients in Live Queue" : "No patients matching filter."}
                  </p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "#64748b" }}>
                    {queue.length === 0
                      ? "Issue a walk-in OPD ticket above to begin serving."
                      : "Try adjusting your search query or status filter."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* NEW TICKET MODAL */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onAddTicket={handleAddTicket}
        nextTicketNumber={nextTicketNumber}
        doctorName={doctorName}
        chamberLocation={chamberLocation}
        doctorSpecialty={doctorSpecialty}
        chambers={chambers}
        currentChamberId={selectedChamberId}
      />

      {/* LIVE TV WAITING ROOM DISPLAY MODAL */}
      <LiveDisplayModal
        isOpen={isTvDisplayOpen}
        onClose={() => setIsTvDisplayOpen(false)}
        queue={queue}
        counters={counters}
        doctorName={doctorName}
        chamberLocation={chamberLocation}
        doctorSpecialty={doctorSpecialty}
      />
    </div>
  );
}
