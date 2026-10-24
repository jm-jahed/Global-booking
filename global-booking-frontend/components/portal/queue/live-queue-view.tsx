"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
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
  CalendarPlus,
  Users,
  Bed,
  BarChart2,
  CreditCard,
  Phone,
  Ticket,
  Sliders,
  SkipForward,
  RotateCcw,
  UserCheck,
  XCircle,
  Radio,
  Crown,
} from "lucide-react";
import {
  fetchDoctorQueue,
  callQueuePatient,
  finishQueuePatient,
  skipQueuePatient,
  noShowQueuePatient,
  triggerDoctorQueueDayEnd,
  type BackendQueueTicket,
} from "@/lib/api/doctor-queue-client";
import { DOCTOR_CHAMBER_COUNTERS } from "@/lib/services/doctor-queue-service";
import { QueueItem, CounterStation, QueueStatus, PriorityLevel, CheckInChannel } from "@/types/queue";
import { NewTicketModal } from "./new-ticket-modal";
import { LiveDisplayModal } from "./live-display-modal";
import { getStoredPortalUser } from "@/lib/api/admin-client";
import { fetchDoctorPortalAppointments } from "@/lib/api/doctor-appointments-client";
import {
  DEFAULT_CHAMBER_TIMEZONE,
  resolveChamberTimezone,
  getChamberBusinessDate,
  formatIsoToDDMMYYYY,
  parseDDMMYYYYToIso,
  shiftDateIso,
} from "@/lib/utils/timezone";

function mapBackendTicketToQueueItem(
  t: BackendQueueTicket,
  specialistName: string
): QueueItem {
  let mappedStatus: QueueStatus = "Waiting";
  if (t.status === "CALLED" || t.status === "IN_CONSULTATION") {
    mappedStatus = "Serving";
  } else if (t.status === "COMPLETED") {
    mappedStatus = "Completed";
  } else if (t.status === "SKIPPED" || t.status === "CANCELLED" || (t.status as string) === "NO_SHOW") {
    mappedStatus = "Skipped";
  } else {
    mappedStatus = "Waiting";
  }

  let mappedPriority: PriorityLevel = "Standard";
  if (t.priority === "VIP") mappedPriority = "VIP";
  else if (t.priority === "URGENT") mappedPriority = "Urgent";

  let mappedChannel: CheckInChannel = "Chamber Visit";
  if (t.channel === "WALK_IN") mappedChannel = "QR Walk-In";
  else if (t.channel === "ONLINE_WEB") mappedChannel = "Online Booking";

  // Calculate waiting duration from check-in time
  let waitDurationText = "—";
  if (t.createdAt) {
    const diffMs = Math.max(0, Date.now() - new Date(t.createdAt).getTime());
    const mins = Math.floor(diffMs / 60000);
    waitDurationText = mins > 0 ? `${mins} min` : "Just now";
  }

  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    clientName: t.patientName,
    clientAvatar: "",
    service: t.service || "General Consultation",
    specialist: specialistName,
    counterName: t.chamberName || "Main Chamber",
    checkInTime: t.checkInTime || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"),
    estWaitMinutes: waitDurationText === "—" ? 0 : parseInt(waitDurationText, 10) || 5,
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
  const [selectedChamberId, setSelectedChamberId] = useState("");

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTvDisplayOpen, setIsTvDisplayOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const doctorName = currentUser?.fullName || currentUser?.name || "Dr Jahedul Islam";
  const chamberLocation =
    currentUser?.chamberLocationsSummary ||
    (Array.isArray(currentUser?.chambers) && currentUser?.chambers[0]?.facilityName) ||
    "Main Consultation Chamber";
  const doctorSpecialty = currentUser?.specialty || "Cardiology";

  const chambers: any[] = useMemo(() => {
    if (Array.isArray(currentUser?.chambers) && currentUser.chambers.length > 0) {
      return currentUser.chambers;
    }
    return [
      {
        id: "main-chamber",
        facilityName: chamberLocation,
        roomNumber: "Chamber 302",
        timezone: DEFAULT_CHAMBER_TIMEZONE,
      },
    ];
  }, [currentUser, chamberLocation]);

  const activeChamber = useMemo(() => {
    if (selectedChamberId) {
      return chambers.find((c: any) => c.id === selectedChamberId) || chambers[0];
    }
    return chambers[0];
  }, [chambers, selectedChamberId]);

  const resolvedChamberTimezone = useMemo(() => {
    return resolveChamberTimezone(activeChamber?.timezone || currentUser?.timezone);
  }, [activeChamber, currentUser]);

  // Chamber-local today's business date (YYYY-MM-DD)
  const chamberTodayDateKey = useMemo(() => {
    return getChamberBusinessDate(resolvedChamberTimezone);
  }, [resolvedChamberTimezone]);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    return getChamberBusinessDate(DEFAULT_CHAMBER_TIMEZONE);
  });
  const [hasUserManuallySelectedDate, setHasUserManuallySelectedDate] = useState(false);

  // Sync to chamber's authoritative local date when timezone resolves (unless user navigated away)
  useEffect(() => {
    if (!hasUserManuallySelectedDate) {
      setSelectedDateKey(chamberTodayDateKey);
    }
  }, [chamberTodayDateKey, hasUserManuallySelectedDate]);

  const selectedDateDisplay = useMemo(() => {
    return formatIsoToDDMMYYYY(selectedDateKey);
  }, [selectedDateKey]);

  const isSelectedDateToday = selectedDateKey === chamberTodayDateKey;

  const [displayInputVal, setDisplayInputVal] = useState(() => formatIsoToDDMMYYYY(selectedDateKey));
  useEffect(() => {
    setDisplayInputVal(formatIsoToDDMMYYYY(selectedDateKey));
  }, [selectedDateKey]);

  const handleDateSelect = (isoDate: string) => {
    if (!isoDate) return;
    setHasUserManuallySelectedDate(true);
    setSelectedDateKey(isoDate);
  };

  const handlePrevDay = () => {
    setHasUserManuallySelectedDate(true);
    setSelectedDateKey((prev) => shiftDateIso(prev, -1));
  };

  const handleNextDay = () => {
    setHasUserManuallySelectedDate(true);
    setSelectedDateKey((prev) => shiftDateIso(prev, 1));
  };

  const handleResetToToday = () => {
    setHasUserManuallySelectedDate(false);
    setSelectedDateKey(chamberTodayDateKey);
  };

  const handleDisplayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayInputVal(val);
    const parsed = parseDDMMYYYYToIso(val);
    if (parsed) {
      setHasUserManuallySelectedDate(true);
      setSelectedDateKey(parsed);
    }
  };

  // Load live queue items directly from MongoDB backend API
  const loadQueue = useCallback(
    async (chamberId?: string, isSilent = false, dateKeyOverride?: string) => {
      if (!isSilent) setIsSyncing(true);
      try {
        const activeChamberId = chamberId !== undefined ? chamberId : selectedChamberId;
        const targetDateKey = dateKeyOverride !== undefined ? dateKeyOverride : selectedDateKey;

        const [res, aptRes] = await Promise.all([
          fetchDoctorQueue(activeChamberId ? { chamberId: activeChamberId, dateKey: targetDateKey } : { dateKey: targetDateKey }).catch(() => null),
          fetchDoctorPortalAppointments(activeChamberId ? { chamberId: activeChamberId, appointmentDate: targetDateKey } : { appointmentDate: targetDateKey }).catch(() => null),
        ]);

        const ticketItems = res && Array.isArray(res.items)
          ? res.items.map((item) => mapBackendTicketToQueueItem(item, doctorName))
          : [];

        // Check if there are appointments that aren't already represented in ticketItems
        const existingTicketAptIds = new Set(
          (res?.items || []).map((t) => t.appointmentId).filter(Boolean)
        );
        const existingTicketNumbers = new Set(ticketItems.map((t) => t.ticketNumber));

        const aptItems: QueueItem[] = (aptRes && Array.isArray(aptRes.items) ? aptRes.items : [])
          .filter((apt) => !existingTicketAptIds.has(apt.id) && !existingTicketNumbers.has(apt.bookingNumberDisplay || ""))
          // CRITICAL: Ensure appointments from other dates cannot leak into the selected date's queue
          .filter((apt) => !targetDateKey || apt.appointmentDate === targetDateKey)
          .map((apt) => ({
            id: apt.id,
            ticketNumber: apt.bookingNumberDisplay || `#${String(apt.bookingNumber || 1).padStart(2, "0")}`,
            clientName: apt.patientName,
            clientAvatar: "",
            service: apt.service || "General Consultation",
            specialist: doctorName,
            counterName: apt.chamberName || "Main Chamber",
            checkInTime: apt.appointmentTime || (apt.createdAt ? new Date(apt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"),
            estWaitMinutes: 5,
            status: apt.status === "COMPLETED" ? "Completed" : (apt.status === "CANCELLED" || (apt.status as string) === "SKIPPED") ? "Skipped" : apt.status === "IN_CONSULTATION" ? "Serving" : "Waiting",
            priority: "Standard",
            channel: "Online Booking",
            notes: `Online Booking Date: ${apt.appointmentDate ? formatIsoToDDMMYYYY(apt.appointmentDate) : ""}`,
            patientPhone: apt.patientPhone,
            patientId: apt.bookingNumberDisplay || `#APT-${apt.id.slice(-5)}`,
          }));

        const mapped = [...ticketItems, ...aptItems];
        mapped.sort((a, b) => {
          const numA = parseInt(a.ticketNumber.replace(/\D/g, ""), 10) || 0;
          const numB = parseInt(b.ticketNumber.replace(/\D/g, ""), 10) || 0;
          return numA - numB;
        });
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
      } catch (err: any) {
        if (!isSilent) {
          setApiError(err.message || "Failed to load live queue from server.");
        }
      } finally {
        if (!isSilent) setIsSyncing(false);
      }
    },
    [selectedChamberId, selectedDateKey, doctorName]
  );

  useEffect(() => {
    loadQueue(selectedChamberId, false, selectedDateKey);

    const handleUpdate = () => {
      loadQueue(selectedChamberId, true, selectedDateKey);
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("global-booking-updated", handleUpdate);

    // Cross-device live synchronization polling (~3.5s)
    const interval = setInterval(() => {
      loadQueue(selectedChamberId, true, selectedDateKey);
    }, 3500);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("global-booking-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [selectedChamberId, loadQueue]);

  const showToast = (msg = "Done") => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1500);
  };

  const handleManualSync = async () => {
    await loadQueue(selectedChamberId, false);
    showToast("Live Queue synchronized with real-time database!");
  };

  // Next ticket calculation
  const nextTicketNumber = useMemo(() => {
    const numbers = queue
      .map((q) => parseInt(q.ticketNumber.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 500);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `#${(max + 1).toString().padStart(2, "0")}`;
  }, [queue]);

  // Derived patient states for KPI cards
  const currentlyServingPatient = useMemo(() => {
    return queue.find((q) => q.status === "Serving");
  }, [queue]);

  const nextWaitingPatient = useMemo(() => {
    return queue.find((q) => q.status === "Waiting" || q.status === "Next");
  }, [queue]);

  // Real KPIs with zero fabricated mock fallback
  const kpis = useMemo(() => {
    const waiting = queue.filter((q) => q.status === "Waiting" || q.status === "Next").length;
    const completed = queue.filter((q) => q.status === "Completed").length;

    return {
      waiting,
      completed,
      servingToken: currentlyServingPatient?.ticketNumber || "—",
      servingName: currentlyServingPatient?.clientName || "No patient serving",
      servingService: currentlyServingPatient?.service || "Awaiting call",
      nextToken: nextWaitingPatient?.ticketNumber || "—",
      nextName: nextWaitingPatient?.clientName || "No patient waiting",
      nextService: nextWaitingPatient?.service || "Queue empty",
    };
  }, [queue, currentlyServingPatient, nextWaitingPatient]);

  const [isDayEnding, setIsDayEnding] = useState(false);

  // Day-End Queue Cleanup: Archives completed queue tickets for today/past dates so tomorrow starts clean
  const handleDayEndCleanup = async () => {
    if (!window.confirm("End Day's Queue: This will archive today's completed and attended queue tickets so tomorrow starts with a clean queue. All patient records and appointment history are completely preserved. Proceed?")) {
      return;
    }
    setIsDayEnding(true);
    try {
      const res = await triggerDoctorQueueDayEnd({
        chamberId: selectedChamberId || undefined,
        forceToday: true,
      });
      showToast(`Day-End Completed! ${res.archivedCount} tickets archived. All patient records preserved.`);
      await loadQueue(selectedChamberId, true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("global-booking-updated"));
      }
    } catch (err: any) {
      showToast(err.message || "Day-End cleanup failed.");
      setApiError(err.message || "Day-End cleanup encountered an error.");
    } finally {
      setIsDayEnding(false);
    }
  };

  // 1. Next: Completes currently running patient AND calls next patient into the room
  const handleNext = async () => {
    const serving = queue.find((q) => q.status === "Serving");
    const nextWaiting = queue.find((q) => q.status === "Waiting" || q.status === "Next");

    if (!serving && !nextWaiting) {
      showToast("Done");
      return;
    }

    // Instant optimistic UI update
    setQueue((prevQueue) => {
      return prevQueue.map((item) => {
        if (serving && item.id === serving.id) {
          return { ...item, status: "Completed" as QueueStatus };
        }
        if (nextWaiting && item.id === nextWaiting.id) {
          return { ...item, status: "Serving" as QueueStatus };
        }
        return item;
      });
    });

    // Small clean "Done" popup
    showToast("Done");

    try {
      if (serving) {
        await finishQueuePatient(serving.id);
      }
      if (nextWaiting) {
        await callQueuePatient(nextWaiting.id);
      }
      showToast("Consultation Completed & Patient Synced!");
      setApiError(null);
    } catch (err: any) {
      console.warn("Queue transition:", err);
      const errMsg = err.message || "Failed to complete queue ticket.";
      setApiError(errMsg);
      showToast(`Error: ${errMsg}`);
    } finally {
      await loadQueue(selectedChamberId, true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("global-booking-updated"));
      }
    }
  };

  // 2. Skip: Skips running patient (if absent) AND calls next patient into the room
  const handleSkip = async () => {
    const serving = queue.find((q) => q.status === "Serving");
    const waitingList = queue.filter((q) => q.status === "Waiting" || q.status === "Next");
    const patientToSkip = serving || waitingList[0];

    if (!patientToSkip) {
      showToast("No active patient to skip.");
      return;
    }

    const patientToCall = serving ? waitingList[0] : waitingList[1];

    try {
      await skipQueuePatient(patientToSkip.id);
      if (patientToCall) {
        await callQueuePatient(patientToCall.id);
      }
      showToast("Patient marked absent/skipped.");
      setApiError(null);
    } catch (err: any) {
      console.warn("Queue skip transition:", err);
      const errMsg = err.message || "Failed to skip queue ticket.";
      setApiError(errMsg);
      showToast(`Error: ${errMsg}`);
    } finally {
      await loadQueue(selectedChamberId, true);
      if (typeof window !== "undefined") {
        localStorage.setItem("global-booking-last-sync", Date.now().toString());
        window.dispatchEvent(new Event("global-booking-updated"));
      }
    }
  };

  // 3. Table row action: Call specific patient
  const handleCallSpecificTicket = async (ticketId: string) => {
    const serving = queue.find((q) => q.status === "Serving");

    try {
      if (serving && serving.id !== ticketId) {
        await finishQueuePatient(serving.id);
      }
      await callQueuePatient(ticketId);
      showToast("Patient Called into Consultation Chamber.");
      setApiError(null);
    } catch (err: any) {
      console.warn("Call specific ticket:", err);
      const errMsg = err.message || "Failed to call ticket.";
      setApiError(errMsg);
      showToast(`Error: ${errMsg}`);
    } finally {
      await loadQueue(selectedChamberId, true);
      if (typeof window !== "undefined") {
        localStorage.setItem("global-booking-last-sync", Date.now().toString());
        window.dispatchEvent(new Event("global-booking-updated"));
      }
    }
  };

  // 4. Table row action: Skip specific patient
  const handleSkipSpecificTicket = async (ticketId: string) => {
    const serving = queue.find((q) => q.status === "Serving");
    const isServing = serving?.id === ticketId;
    const nextWaiting = queue.find((q) => (q.status === "Waiting" || q.status === "Next") && q.id !== ticketId);

    try {
      await skipQueuePatient(ticketId);
      if (isServing && nextWaiting) {
        await callQueuePatient(nextWaiting.id);
      }
      showToast("Patient marked absent.");
      setApiError(null);
    } catch (err: any) {
      console.warn("Skip specific ticket:", err);
      const errMsg = err.message || "Failed to skip ticket.";
      setApiError(errMsg);
      showToast(`Error: ${errMsg}`);
    } finally {
      await loadQueue(selectedChamberId, true);
      if (typeof window !== "undefined") {
        localStorage.setItem("global-booking-last-sync", Date.now().toString());
        window.dispatchEvent(new Event("global-booking-updated"));
      }
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
          ? true
          : statusFilter === "In Progress"
          ? item.status === "Serving"
          : statusFilter === "Waiting"
          ? item.status === "Waiting" || item.status === "Next"
          : statusFilter === "Completed"
          ? item.status === "Completed"
          : statusFilter === "Skipped"
          ? item.status === "Skipped"
          : item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [queue, searchQuery, statusFilter]);

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
    <div className="queue-luxury-page-container" style={{ padding: "20px 24px", minHeight: "100vh", background: "#050b14", color: "#ffffff" }}>
      {/* Small "Done" Luxury Toast Pill */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 6px 25px rgba(16, 185, 129, 0.35)",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.02em",
          }}
        >
          <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.8} />
          <span>Done</span>
        </div>
      )}

      {/* TOP HEADER: Luxury Premium Live Queue Deck */}
      <section className="live-queue-header-deck" aria-label="Live Queue Header">
        <div className="live-queue-header-main-row">
          <div className="live-queue-brand-group">
            {/* Glowing circular concentric beacon icon */}
            <div className="live-queue-beacon-circle">
              <Radio size={22} style={{ color: "#e5b869", filter: "drop-shadow(0 0 10px rgba(229, 184, 105, 0.5))" }} />
              <span className="live-queue-live-dot" title="Real-time synchronized" />
            </div>
            <div className="live-queue-title-wrap">
              <div className="live-queue-badge-row">
                <span className="live-queue-status-tag">
                  <span className="live-pulsing-dot" />
                  ACTIVE ROSTER
                </span>
              </div>
              <div className="live-queue-title-row">
                <h1 className="live-queue-title-text">
                  Live Queue Management
                </h1>
                <ChevronRight size={18} className="live-queue-title-chevron text-gold" />
              </div>
              <p className="live-queue-subtitle-text">
                Real-time patient queue, live token call &amp; serial tracking
              </p>
            </div>
          </div>
        </div>

        <div className="live-queue-actions-deck">
          <button
            type="button"
            className="btn-luxury-sync"
            onClick={handleManualSync}
            title="Sync live queue with latest database records"
          >
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} style={{ color: "#e5b869" }} />
            <span>Sync Queue</span>
          </button>

          <button
            type="button"
            className="btn-luxury-tv"
            onClick={() => setIsTvDisplayOpen(true)}
            title="Open Waiting Room Live TV Display"
          >
            <Tv size={15} style={{ color: "#38bdf8" }} />
            <span>Open TV Display</span>
          </button>

          <button
            type="button"
            className="btn-luxury-new-ticket"
            onClick={() => setIsNewTicketOpen(true)}
            title="New Patient Appointment"
          >
            <CalendarPlus size={16} strokeWidth={2.4} />
            <span>New Patient Appointment</span>
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

      {/* TOP 4 LUXURY KPI METRIC CARDS (Exact match to ticked cards in reference image) */}
      <section className="queue-kpi-grid" aria-label="Queue KPI Metrics">
        {/* Card 1: Now Serving (Gold Glowing Card) */}
        <article
          className="queue-kpi-card"
          style={{
            background: "linear-gradient(145deg, rgba(229, 184, 105, 0.14) 0%, rgba(184, 134, 40, 0.05) 100%)",
            border: "1px solid rgba(229, 184, 105, 0.4)",
            borderRadius: 14,
            padding: "16px 18px",
            position: "relative",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(229, 184, 105, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(229, 184, 105, 0.25) 0%, rgba(184, 134, 40, 0.3) 100%)",
              border: "1px solid rgba(229, 184, 105, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(229, 184, 105, 0.3)",
            }}
          >
            <Crown size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e5b869", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Now Serving
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "1px 0" }}>
              {kpis.servingToken}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kpis.servingName === "No patient in consultation" ? "No patient serving" : kpis.servingName}
            </div>
          </div>
          <ChevronRight size={16} color="#e5b869" style={{ opacity: 0.7, flexShrink: 0 }} />
        </article>

        {/* Card 2: Next Serial (Blue Card) */}
        <article
          className="queue-kpi-card"
          style={{
            background: "linear-gradient(145deg, #091326 0%, #060c18 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: 14,
            padding: "16px 18px",
            position: "relative",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38bdf8",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.25)",
            }}
          >
            <Clock size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Next Serial
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "1px 0" }}>
              {kpis.nextToken}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kpis.nextName === "No patient waiting" ? "No patient waiting" : kpis.nextName}
            </div>
          </div>
          <ChevronRight size={16} color="#38bdf8" style={{ opacity: 0.7, flexShrink: 0 }} />
        </article>

        {/* Card 3: Total Waiting (Emerald/Teal Card) */}
        <article
          className="queue-kpi-card"
          style={{
            background: "linear-gradient(145deg, #06191c 0%, #030d10 100%)",
            border: "1px solid rgba(20, 184, 166, 0.3)",
            borderRadius: 14,
            padding: "16px 18px",
            position: "relative",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(20, 184, 166, 0.15)",
              border: "1px solid rgba(20, 184, 166, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#14b8a6",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(20, 184, 166, 0.25)",
            }}
          >
            <Users size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Waiting
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "1px 0" }}>
              {kpis.waiting.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Patients in queue
            </div>
          </div>
          <ChevronRight size={16} color="#14b8a6" style={{ opacity: 0.7, flexShrink: 0 }} />
        </article>

        {/* Card 4: Completed Today (Cyan/Green Card) */}
        <article
          className="queue-kpi-card"
          style={{
            background: "linear-gradient(145deg, #071620 0%, #040d14 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 14,
            padding: "16px 18px",
            position: "relative",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(16, 185, 129, 0.25)",
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Completed Today
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "1px 0" }}>
              {kpis.completed.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Services completed
            </div>
          </div>
          <ChevronRight size={16} color="#10b981" style={{ opacity: 0.7, flexShrink: 0 }} />
        </article>
      </section>

      {/* MAIN TWO-COLUMN LAYOUT: TABLE ON LEFT + QUEUE CONTROL PAD ON RIGHT */}
      <div className="queue-main-split">
        
        {/* LEFT COLUMN: LIVE QUEUE TABLE */}
        <div style={{ background: "#080f1e", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          {/* Table Card Topbar with Search & Filters */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Live Queue</h2>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 20, color: "#10b981", fontSize: 11, fontWeight: 700 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                  <span>Live</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-view-all-queue"
                onClick={() => {
                  setStatusFilter("");
                  setSearchQuery("");
                }}
                title="View All Queue Items"
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Selected-Date Control (DD-MM-YYYY) */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#050913",
                  border: "1px solid rgba(229, 184, 105, 0.4)",
                  borderRadius: 8,
                  padding: "2px 6px",
                  gap: 4,
                  boxShadow: "0 0 10px rgba(229, 184, 105, 0.08)",
                }}
              >
                {/* Previous Day Button */}
                <button
                  type="button"
                  onClick={handlePrevDay}
                  title="Previous Day"
                  aria-label="Previous Day"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px 3px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 4,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Calendar Icon + Clickable Date Picker trigger */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                  }}
                >
                  <Calendar size={13} color="#e5b869" />
                  <input
                    type="text"
                    value={displayInputVal}
                    onChange={handleDisplayInputChange}
                    placeholder="DD-MM-YYYY"
                    title="Queue Date (DD-MM-YYYY)"
                    aria-label="Queue Date"
                    style={{
                      width: 95,
                      background: "transparent",
                      border: "none",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      outline: "none",
                      textAlign: "center",
                      fontFamily: "monospace",
                    }}
                  />
                  {/* Native Hidden Date Picker input to allow clicking calendar */}
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDateKey}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (dateInputRef.current) {
                        if (typeof (dateInputRef.current as any).showPicker === "function") {
                          (dateInputRef.current as any).showPicker();
                        } else {
                          dateInputRef.current.focus();
                          dateInputRef.current.click();
                        }
                      }
                    }}
                    title="Open Calendar Picker"
                    aria-label="Open Calendar Picker"
                    style={{
                      background: "rgba(229, 184, 105, 0.12)",
                      border: "1px solid rgba(229, 184, 105, 0.25)",
                      borderRadius: 4,
                      color: "#e5b869",
                      padding: "2px 5px",
                      fontSize: 10,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    📅
                  </button>
                </div>

                {/* Next Day Button */}
                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Next Day"
                  aria-label="Next Day"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px 3px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 4,
                  }}
                >
                  <ChevronRight size={14} />
                </button>

                {/* Jump to Today Button (when viewing another date) */}
                {!isSelectedDateToday && (
                  <button
                    type="button"
                    onClick={handleResetToToday}
                    title={`Jump to Today (${formatIsoToDDMMYYYY(chamberTodayDateKey)})`}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: 5,
                      color: "#10b981",
                      padding: "2px 7px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Search */}
              <div style={{ position: "relative", width: 200 }}>
                <Search size={14} color="#64748b" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search token, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px 7px 30px", background: "#050913", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, color: "#ffffff", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Chamber Filter */}
              <select
                value={selectedChamberId}
                onChange={(e) => setSelectedChamberId(e.target.value)}
                style={{ padding: "7px 10px", background: "#050913", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, color: "#ffffff", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                <option value="">All Services ({chambers.length})</option>
                {chambers.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.facilityName || ch.name || "Chamber"}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "7px 10px", background: "#050913", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, color: "#ffffff", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                <option value="All Status">All Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting">Waiting</option>
                <option value="Completed">Completed</option>
                <option value="Skipped">Skipped (Absent)</option>
              </select>
            </div>
          </div>

          {/* Table Element */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <th style={{ padding: "12px 16px", width: 40 }}>#</th>
                  <th style={{ padding: "12px 16px" }}>TOKEN NUMBER</th>
                  <th style={{ padding: "12px 16px" }}>PATIENT NAME</th>
                  <th style={{ padding: "12px 16px" }}>QUEUE STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length > 0 ? (
                  filteredQueue.map((item, index) => {
                    const isNowServing = item.status === "Serving";
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          background: isNowServing ? "rgba(229, 184, 105, 0.05)" : "transparent",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {/* Index */}
                        <td style={{ padding: "14px 16px", color: "#64748b" }}>
                          {index + 1}
                        </td>

                        {/* Token Pill */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: isNowServing ? "linear-gradient(135deg, rgba(229, 184, 105, 0.2) 0%, rgba(184, 134, 40, 0.2) 100%)" : "rgba(255, 255, 255, 0.05)", border: isNowServing ? "1px solid rgba(229, 184, 105, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isNowServing ? "#e5b869" : "#ffffff" }}>
                              {item.ticketNumber}
                            </span>
                            {isNowServing && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#070d18", background: "#e5b869", padding: "1px 5px", borderRadius: 4 }}>
                                Now Serving
                              </span>
                            )}
                            {item.status === "Next" && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#ffffff", background: "#2563eb", padding: "1px 5px", borderRadius: 4 }}>
                                Next
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Patient Name + Avatar */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: getAvatarGradient(index),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              {item.clientName.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700, color: "#ffffff" }}>
                              {item.clientName}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isNowServing
                                ? "rgba(16, 185, 129, 0.2)"
                                : item.status === "Completed"
                                ? "rgba(16, 185, 129, 0.15)"
                                : item.status === "Skipped"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(37, 99, 235, 0.15)",
                              color: isNowServing
                                ? "#10b981"
                                : item.status === "Completed"
                                ? "#34d399"
                                : item.status === "Skipped"
                                ? "#f87171"
                                : "#60a5fa",
                              border: isNowServing
                                ? "1px solid rgba(16, 185, 129, 0.45)"
                                : item.status === "Completed"
                                ? "1px solid rgba(16, 185, 129, 0.35)"
                                : item.status === "Skipped"
                                ? "1px solid rgba(239, 68, 68, 0.35)"
                                : "1px solid rgba(37, 99, 235, 0.35)",
                            }}
                          >
                            {isNowServing ? "In Progress" : item.status === "Skipped" ? "Skipped (Absent)" : item.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            {item.status === "Completed" ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 12px",
                                    borderRadius: 6,
                                    background: "rgba(16, 185, 129, 0.1)",
                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                    color: "#34d399",
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  <CheckCircle2 size={13} color="#34d399" />
                                  Completed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCallSpecificTicket(item.id)}
                                  title="Recall patient if required"
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    background: "rgba(255, 255, 255, 0.04)",
                                    color: "#94a3b8",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Recall
                                </button>
                              </div>
                            ) : item.status === "Skipped" ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    color: "#f87171",
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  Absent
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCallSpecificTicket(item.id)}
                                  title="Recall absent patient back to consultation"
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(229, 184, 105, 0.4)",
                                    background: "linear-gradient(135deg, rgba(229, 184, 105, 0.2) 0%, rgba(184, 134, 40, 0.2) 100%)",
                                    color: "#e5b869",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Recall
                                </button>
                              </div>
                            ) : isNowServing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleNext()}
                                  style={{
                                    padding: "7px 16px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                                    color: "#070d18",
                                    fontWeight: 800,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 10px rgba(229, 184, 105, 0.35)",
                                  }}
                                >
                                  Next
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSkipSpecificTicket(item.id)}
                                  style={{
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "#ffffff",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Skip
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCallSpecificTicket(item.id)}
                                  style={{
                                    padding: "7px 16px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                                    color: "#070d18",
                                    fontWeight: 800,
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  Call
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSkipSpecificTicket(item.id)}
                                  style={{
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "#ffffff",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Skip
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                      <Users2 size={32} color="#e5b869" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                        {queue.length === 0 ? "No Patients in Live Queue" : "No patients matching filter."}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                        {queue.length === 0
                          ? "Click 'Next' or 'Check In' on the Queue Control panel to issue an OPD ticket."
                          : "Try adjusting your search query or status filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: QUEUE CONTROL PANEL (Circled in user reference image) */}
        <aside
          style={{
            background: "linear-gradient(155deg, #091224 0%, #060c16 100%)",
            border: "1px solid rgba(229, 184, 105, 0.35)",
            borderRadius: 16,
            padding: "20px 18px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.6), 0 0 25px rgba(229, 184, 105, 0.08)",
          }}
        >
          {/* Panel Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Sliders size={18} color="#e5b869" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
              Queue Control
            </h2>
          </div>
          {/* Queue Control: KEEP ONLY NEXT & SKIP */}
          <div className="queue-control-actions-grid">
            {/* 1. Next (Primary Gold Luxury Card) */}
            <button
              type="button"
              onClick={handleNext}
              className="queue-control-btn queue-control-btn-next"
            >
              <div className="queue-control-btn-icon">
                <Users size={22} color="#f5c270" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "0.01em" }}>
                    Next
                  </span>
                  <span
                    style={{
                      background: "rgba(229, 184, 105, 0.2)",
                      border: "1px solid rgba(229, 184, 105, 0.4)",
                      color: "#f5c270",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Primary
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#f3c87a", lineHeight: 1.35 }}>
                  Complete running patient &amp; call next into chamber
                </p>
              </div>
              <ChevronRight size={18} color="#f5c270" className="queue-control-chevron" />
            </button>

            {/* 2. Skip (Secondary Cyan/Blue Luxury Card) */}
            <button
              type="button"
              onClick={handleSkip}
              className="queue-control-btn queue-control-btn-skip"
            >
              <div className="queue-control-btn-icon queue-control-btn-icon-skip">
                <SkipForward size={22} color="#38bdf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#ffffff" }}>Skip</span>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#94a3b8", lineHeight: 1.35 }}>
                  Skip absent patient &amp; call next into chamber
                </p>
              </div>
              <ChevronRight size={18} color="#38bdf8" className="queue-control-chevron" />
            </button>
          </div>
        </aside>

      </div>

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
