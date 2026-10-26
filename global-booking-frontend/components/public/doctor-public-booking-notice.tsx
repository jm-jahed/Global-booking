"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Ticket,
  RefreshCw,
  ArrowRight,
  Printer,
  AlertCircle,
  Check,
  Building2,
  Share2,
  Search,
  Copy,
  X,
  ArrowLeft,
  Activity,
  ShieldCheck,
  Crown,
  Moon,
  Sun,
} from "lucide-react";
import type {
  PublicDoctorProfile,
  PublicDoctorQueueStatus,
  PublicAppointmentRecord,
  PublicAppointmentSummary,
} from "@/lib/api/doctor-public-client";
import {
  getPublicDoctorProfile,
  createGuestDoctorAppointment,
  recoverGuestDoctorAppointment,
  getDoctorPublicQueueStatus,
} from "@/lib/api/doctor-public-client";
import {
  getDayOfWeekFromDate,
  getNextDateForDayOfWeek,
  getWeeklyRosterList,
} from "@/lib/utils/schedule-formatter";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { formatLocaleNumber } from "@/lib/i18n/formatters";

export interface DoctorPublicBookingNoticeProps {
  readonly slug: string;
}

// Helper to get local date in YYYY-MM-DD format (avoids UTC timezone shift)
const getTodayLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to format Voucher ID as ID-DDMMYYYY
export const formatVoucherId = (dateStr: string): string => {
  const parts = (dateStr || "").split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `ID-${parts[2].padStart(2, "0")}${parts[1].padStart(2, "0")}${parts[0]}`;
  }
  const clean = (dateStr || "").replace(/\D/g, "");
  if (clean.length >= 8) {
    return `ID-${clean.slice(6, 8)}${clean.slice(4, 6)}${clean.slice(0, 4)}`;
  }
  return `ID-${clean}`;
};

// Helper to format date display as DD-MM-YYYY
export const formatDateDDMMYYYY = (dateStr: string): string => {
  const parts = (dateStr || "").split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
  }
  return dateStr;
};

export function DoctorPublicBookingNotice({ slug }: DoctorPublicBookingNoticeProps) {
  const { t: tAppointments, locale, isRtl } = useTranslation("appointments");
  const { t: tCommon } = useTranslation("common");

  // Theme State: Defaults to "dark" (matching /live-queue aesthetic) while allowing light theme toggle
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("gb_booking_theme");
        if (saved === "light" || saved === "dark") {
          setTheme(saved);
        } else {
          setTheme("dark");
        }
      } catch {
        setTheme("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("gb_booking_theme", next);
        } catch {}
      }
      return next;
    });
  };

  const isDark = theme === "dark";

  // Unified Theme Design Tokens
  const th = {
    pageBg: isDark ? "#060b13" : "#f8faff",
    ambientGradient: isDark
      ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.22), transparent 70%), radial-gradient(circle at 100% 100%, rgba(56, 189, 248, 0.08), transparent 40%)"
      : "radial-gradient(ellipse at 70% 20%, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.3) 40%, rgba(248, 250, 255, 0) 75%)",
    headerBg: isDark ? "rgba(11, 19, 37, 0.92)" : "rgba(255, 255, 255, 0.9)",
    headerBorder: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(224, 231, 255, 0.8)",
    cardBg: isDark ? "#0b1325" : "#ffffff",
    cardBorder: isDark ? "1.5px solid rgba(255, 255, 255, 0.08)" : "1.5px solid #e0e7ff",
    cardShadow: isDark ? "0 20px 50px rgba(0, 0, 0, 0.55)" : "0 10px 30px rgba(99, 102, 241, 0.06)",
    innerBg: isDark ? "#080e1a" : "#f8faff",
    innerBorder: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e0e7ff",
    inputBg: isDark ? "#080e1a" : "#f8faff",
    inputBorder: isDark ? "1.5px solid rgba(255, 255, 255, 0.12)" : "1.5px solid #e0e7ff",
    inputFocusBorder: isDark ? "#818cf8" : "#6366f1",
    inputText: isDark ? "#ffffff" : "#1e1b4b",
    textPrimary: isDark ? "#ffffff" : "#1e1b4b",
    textSecondary: isDark ? "#cbd5e1" : "#475569",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    divider: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
    btnSecondaryBg: isDark ? "#111c35" : "#f1f5f9",
    btnSecondaryBorder: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
    btnSecondaryText: isDark ? "#e2e8f0" : "#475569",
    kpiServing: {
      bg: isDark
        ? "radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.16) 0%, rgba(11, 19, 37, 0.85) 100%), #0b1325"
        : "linear-gradient(145deg, #ffffff 0%, #fefcf3 100%)",
      border: isDark ? "1.5px solid rgba(245, 158, 11, 0.45)" : "1.5px solid #fef3c7",
      shadow: isDark ? "0 0 25px rgba(245, 158, 11, 0.16)" : "0 8px 24px rgba(245, 158, 11, 0.08)",
      iconBg: isDark
        ? "radial-gradient(circle at 50% 30%, rgba(229, 184, 105, 0.25) 0%, rgba(229, 184, 105, 0.08) 100%), rgba(11, 20, 38, 0.8)"
        : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
      iconBorder: isDark ? "1.5px solid rgba(229, 184, 105, 0.5)" : "1px solid rgba(245, 158, 11, 0.3)",
      iconColor: isDark ? "#e5b869" : "#b45309",
      labelColor: isDark ? "#e5b869" : "#b45309",
      numberColor: isDark ? "#fbbf24" : "#1e1b4b",
      subTextColor: isDark ? "#e2e8f0" : "#64748b",
    },
    kpiNext: {
      bg: isDark
        ? "radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.16) 0%, rgba(11, 19, 37, 0.85) 100%), #0b1325"
        : "linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)",
      border: isDark ? "1.5px solid rgba(16, 185, 129, 0.45)" : "1.5px solid #dcfce7",
      shadow: isDark ? "0 0 25px rgba(16, 185, 129, 0.16)" : "0 8px 24px rgba(16, 185, 129, 0.08)",
      iconBg: isDark
        ? "radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.08) 100%), rgba(11, 20, 38, 0.8)"
        : "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
      iconBorder: isDark ? "1.5px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(16, 185, 129, 0.3)",
      iconColor: isDark ? "#34d399" : "#059669",
      labelColor: isDark ? "#34d399" : "#059669",
      numberColor: isDark ? "#34d399" : "#1e1b4b",
      subTextColor: isDark ? "#e2e8f0" : "#64748b",
    },
    kpiToken: {
      bg: isDark
        ? "radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.2) 0%, rgba(11, 19, 37, 0.85) 100%), #0b1325"
        : "linear-gradient(145deg, #ffffff 0%, #eef2ff 100%)",
      border: isDark ? "1.5px solid rgba(99, 102, 241, 0.5)" : "2px solid #6366f1",
      shadow: isDark ? "0 0 25px rgba(99, 102, 241, 0.18)" : "0 10px 30px rgba(99, 102, 241, 0.18)",
      iconBg: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
      iconBorder: isDark ? "1.5px solid rgba(129, 140, 248, 0.4)" : "none",
      iconColor: "#ffffff",
      labelColor: isDark ? "#a5b4fc" : "#4338ca",
      numberColor: isDark ? "#a5b4fc" : "#4338ca",
      subTextColor: isDark ? "#e2e8f0" : "#64748b",
    },
  };

  const [profile, setProfile] = useState<PublicDoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundState, setNotFoundState] = useState<boolean>(false);

  // Live Queue Status from real MongoDB database
  const [queueStatus, setQueueStatus] = useState<PublicDoctorQueueStatus | null>(null);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState<boolean>(false);

  // Booking Form State
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [selectedChamberId, setSelectedChamberId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayLocalDate());
  const datePickerInputRef = useRef<HTMLInputElement>(null);

  // Persistent Appointment Confirmation State (Stored in MongoDB appointments collection)
  const [bookedAppointment, setBookedAppointment] = useState<
    PublicAppointmentRecord | PublicAppointmentSummary | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Recovery Modal State
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverReference, setRecoverReference] = useState("");
  const [recoverPhone, setRecoverPhone] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Prefill reference from sessionStorage/URL and hydrate bookedAppointment from localStorage across page refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.scrollTo(0, 0);
        const urlParams = new URLSearchParams(window.location.search);
        const urlRef = urlParams.get("ref");
        const storedRef = sessionStorage.getItem("gb_guest_booking_ref");
        const refToUse = urlRef || storedRef;
        if (refToUse) {
          setRecoverReference(refToUse);
        }

        const storedBooking = localStorage.getItem(`gb_guest_booking_${slug}`);
        if (storedBooking) {
          const parsed = JSON.parse(storedBooking);
          if (parsed && (parsed.referenceNumber || parsed.bookingNumber)) {
            setBookedAppointment(parsed);
          }
        }
      } catch {}
    }
  }, [slug]);

  // Load live queue status from MongoDB
  const refreshQueueStatus = useCallback(
    async (chamberId?: string, silent = false) => {
      if (!silent) setIsRefreshingQueue(true);
      try {
        const data = await getDoctorPublicQueueStatus(slug, chamberId);
        if (data) {
          setQueueStatus(data);
        }
      } catch (err) {
        console.error("Queue sync error:", err);
      } finally {
        if (!silent) setIsRefreshingQueue(false);
      }
    },
    [slug]
  );

  // Fetch Doctor Profile on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getPublicDoctorProfile(slug)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProfile(data);
          setNotFoundState(false);

          const defaultChamber = data.chambers?.[0]?.id || "";
          setSelectedChamberId(defaultChamber);

          const defaultService = data.services?.[0]?.title || `${data.specialty} Consultation`;
          setSelectedService(defaultService);

          // Fetch real queue status for this doctor
          refreshQueueStatus(defaultChamber, true);
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
  }, [slug, refreshQueueStatus]);

  // Polling for live queue updates every 2.5 seconds + cross-tab instant sync
  useEffect(() => {
    refreshQueueStatus(selectedChamberId, true);

    const handleUpdate = () => {
      refreshQueueStatus(selectedChamberId, true);
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("global-booking-updated", handleUpdate);

    const interval = setInterval(() => {
      refreshQueueStatus(selectedChamberId, true);
    }, 2500);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("global-booking-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [refreshQueueStatus, selectedChamberId]);

  // Handle Chamber switch
  const handleChamberChange = (chamberId: string) => {
    setSelectedChamberId(chamberId);
    refreshQueueStatus(chamberId, false);
  };

  // Submit Booking directly to MongoDB persistent appointments collection
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    const trimmedName = patientName.trim();
    const trimmedPhone = patientPhone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setBookingError(tAppointments("errNameMinLength", undefined, "Please enter your full patient name (at least 2 characters)."));
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 5) {
      setBookingError(tAppointments("errPhoneInvalid", undefined, "Please enter a valid contact phone number."));
      return;
    }

    const currentChamber =
      profile?.chambers?.find((c) => c.id === selectedChamberId) || profile?.chambers?.[0];
    const dayName = getDayOfWeekFromDate(selectedDate);
    const daySched = dayName && currentChamber?.weeklySchedule ? currentChamber.weeklySchedule[dayName] : undefined;
    if (daySched && !daySched.isOpen) {
      setBookingError(
        tAppointments("errDoctorOffDay", {
          doctor: profile?.fullName || "The doctor",
          day: dayName,
          date: formatDateDDMMYYYY(selectedDate),
          chamber: currentChamber?.facilityName || "this chamber",
        }, `Dr. ${profile?.fullName || "The doctor"} is not practicing on ${dayName}s (${formatDateDDMMYYYY(selectedDate)}) at ${currentChamber?.facilityName || "this chamber"}. Please choose an open practicing day.`)
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const idempotencyKey = `GUEST-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const res = await createGuestDoctorAppointment(slug, {
        patientName: trimmedName,
        patientPhone: trimmedPhone,
        chamberId: selectedChamberId || undefined,
        service: selectedService || undefined,
        appointmentDate: selectedDate,
        appointmentTime: selectedChamber?.visitingSchedule || undefined,
        idempotencyKey,
      });

      if (!res.success || !res.appointment) {
        setBookingError(res.error || tAppointments("errBookingGeneral", undefined, "Could not complete booking. Please try again."));
        setIsSubmitting(false);
        return;
      }

      // Success! Real appointment saved permanently in MongoDB and local storage for refresh persistence
      setBookedAppointment(res.appointment);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("gb_guest_booking_ref", res.appointment.referenceNumber);
          localStorage.setItem(`gb_guest_booking_${slug}`, JSON.stringify(res.appointment));
        } catch {}
      }

      const vId =
        "voucherId" in res.appointment && res.appointment.voucherId
          ? res.appointment.voucherId
          : formatVoucherId(res.appointment.appointmentDate);
      const displayNum =
        res.appointment.bookingNumberDisplay ||
        `#${String(res.appointment.bookingNumber || 1).padStart(2, "0")}`;
      showToast(tAppointments("toastBookingSuccess", { voucherId: vId, serial: displayNum }, `Appointment confirmed! Voucher ID: ${vId} | Serial No.: ${displayNum}`));

      // Trigger cross-tab event so doctor portal updates immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("global-booking-updated"));
        try {
          localStorage.setItem("global-booking-last-sync", Date.now().toString());
        } catch {}
      }
    } catch (err: any) {
      setBookingError(err?.message || tAppointments("errBookingUnexpected", undefined, "An unexpected error occurred while booking."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError(null);

    const cleanRef = recoverReference.trim().toUpperCase();
    const cleanPhone = recoverPhone.trim();

    if (!cleanRef || !cleanPhone) {
      setRecoverError(tAppointments("errProvideBothRefAndPhone", undefined, "Please provide both your booking reference and registered contact phone."));
      return;
    }

    setIsRecovering(true);

    try {
      const res = await recoverGuestDoctorAppointment({
        referenceNumber: cleanRef,
        patientPhone: cleanPhone,
      });

      if (!res.success || !res.appointment) {
        setRecoverError(res.error || tAppointments("errInvalidRefOrDetails", undefined, "Invalid booking reference or verification details."));
        return;
      }

      setBookedAppointment(res.appointment);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("gb_guest_booking_ref", res.appointment.referenceNumber);
          localStorage.setItem(`gb_guest_booking_${slug}`, JSON.stringify(res.appointment));
        } catch {}
      }
      setIsRecoverModalOpen(false);
      showToast(tAppointments("toastVoucherRetrieved", undefined, "Appointment successfully retrieved from database!"));
    } catch (err: any) {
      setRecoverError(err?.message || tAppointments("errRecoverGeneral", undefined, "Failed to recover appointment. Please check your credentials."));
    } finally {
      setIsRecovering(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
      showToast(tAppointments("toastRefCopied", undefined, "Booking reference copied to clipboard!"));
    }
  };

  const handleShareVoucher = async () => {
    if (!bookedAppointment) return;
    const serialNo =
      bookedAppointment.bookingNumberDisplay ||
      `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`;
    const facility =
      "chamberName" in bookedAppointment
        ? bookedAppointment.chamberName
        : bookedAppointment.facilityName || selectedChamber?.facilityName || "Main Chamber";
    const shareText = `Appointment Voucher: ${serialNo}\nDoctor: ${bookedAppointment.doctorName || profile?.fullName}\nDate: ${formatDateDDMMYYYY(bookedAppointment.appointmentDate)}\nChamber: ${facility}\nRef: ${bookedAppointment.referenceNumber}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Appointment Slip: ${serialNo}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast(tAppointments("toastVoucherCopied", undefined, "Voucher details copied to clipboard!"));
    }
  };

  // Loading State
  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: th.pageBg,
          color: th.textPrimary,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
          gap: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)",
            border: isDark ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(99, 102, 241, 0.3)",
            display: "grid",
            placeItems: "center",
            color: isDark ? "#818cf8" : "#4f46e5",
            animation: "pulse 2s infinite",
          }}
        >
          <Activity size={26} className="spin-slow" />
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 18, color: th.textPrimary, margin: "0 0 6px", fontWeight: 700 }}>
            {tAppointments("connectingQueueSystem", undefined, "Connecting to Doctor Live Queue System...")}
          </h2>
          <p style={{ color: th.textMuted, fontSize: 13, margin: 0 }}>
            {tAppointments("syncingQueueSchedules", undefined, "Syncing chamber schedules and real-time consultation serials.")}
          </p>
        </div>
      </main>
    );
  }

  // Not Found State
  if (notFoundState || !profile) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: th.pageBg,
          color: th.textPrimary,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: th.cardBg,
            borderRadius: 24,
            padding: "44px 32px",
            border: isDark ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(239, 68, 68, 0.25)",
            boxShadow: th.cardShadow,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "#ef4444",
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: th.textPrimary, margin: "0 0 8px" }}>
            {tCommon("notFound", undefined, "Doctor Not Found")}
          </h1>
          <p style={{ fontSize: 14, color: th.textMuted, margin: "0 0 24px", lineHeight: 1.6 }}>
            The requested doctor booking portal is unpublished or currently unavailable in the GLOBAL BOOKING directory.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(79, 70, 229, 0.25)",
            }}
          >
            {tAppointments("backToAppointments", undefined, "Return to Directory")}
          </Link>
        </div>
      </main>
    );
  }

  const selectedChamber =
    profile.chambers?.find((c) => c.id === selectedChamberId) || profile.chambers?.[0];

  const selectedDayName = getDayOfWeekFromDate(selectedDate);
  const chamberWeeklySchedule = selectedChamber?.weeklySchedule;
  const selectedDaySchedule =
    selectedDayName && chamberWeeklySchedule ? chamberWeeklySchedule[selectedDayName] : undefined;
  const isDayOff = selectedDaySchedule !== undefined ? !selectedDaySchedule.isOpen : false;
  const weeklyRoster = chamberWeeklySchedule ? getWeeklyRosterList(chamberWeeklySchedule) : [];

  // Global fee: numeric amount only, formatted with locale
  const rawFeeAmount =
    typeof profile.consultationFee?.amount === "number" && profile.consultationFee.amount > 0
      ? profile.consultationFee.amount
      : typeof profile.consultationFee?.amountInFils === "number" && profile.consultationFee.amountInFils > 0
        ? profile.consultationFee.amountInFils / 100
        : null;

  const consultationFeeFormatted = rawFeeAmount
    ? `${formatLocaleNumber(rawFeeAmount, locale)} ${profile.consultationFee?.currency || tCommon("currency", undefined, "AED")}`
    : null;

  const doctorInitials =
    (profile.fullName || "")
      .replace(/^Dr\.?\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  return (
    <div
      className="booking-page-root"
      style={{
        minHeight: "100vh",
        background: th.pageBg,
        color: th.textPrimary,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflowX: "hidden",
        paddingBottom: 70,
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Ambient background mesh gradients */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 600,
          background: th.ambientGradient,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: isDark ? "#0b1325" : "#ffffff",
            border: "1.5px solid #10b981",
            padding: "12px 20px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: isDark ? "0 12px 36px rgba(0, 0, 0, 0.6)" : "0 12px 36px rgba(15, 23, 42, 0.15)",
            animation: "slideDown 0.25s ease-out",
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#ffffff" : "#0f172a" }}>
            {toastMessage}
          </span>
        </div>
      )}

      {/* =========================================================================
          01. TOP LUXURY NAVBAR (Matching Portfolio Topbar & Live Queue)
          ========================================================================= */}
      <header
        style={{
          borderBottom: `1px solid ${th.headerBorder}`,
          background: th.headerBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 60,
          boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.4)" : "0 2px 12px rgba(99, 102, 241, 0.04)",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
          className="booking-header-inner"
        >
          {/* Left: Back to Doctor Portfolio & Live Status Pill */}
          <div className="booking-header-left" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/${profile.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                color: isDark ? "#a5b4fc" : "#4338ca",
                fontSize: 13,
                fontWeight: 700,
                background: isDark ? "rgba(99, 102, 241, 0.16)" : "rgba(99, 102, 241, 0.08)",
                padding: "8px 14px",
                borderRadius: 10,
                border: isDark ? "1px solid rgba(99, 102, 241, 0.35)" : "1px solid rgba(99, 102, 241, 0.2)",
                transition: "all 0.15s ease",
              }}
              className="back-btn"
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span className="back-btn-text-full">{tAppointments("doctorPortfolioBtn", undefined, "Doctor Portfolio")}</span>
              <span className="back-btn-text-short">{tAppointments("profileBtnShort", undefined, "Profile")}</span>
            </Link>

            <div
              className="live-badge-wrap"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isDark
                  ? "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 78, 59, 0.28) 100%), rgba(4, 30, 24, 0.7)"
                  : "rgba(16, 185, 129, 0.1)",
                border: isDark ? "1px solid rgba(20, 184, 166, 0.5)" : "1px solid rgba(16, 185, 129, 0.3)",
                padding: "6px 12px",
                borderRadius: 999,
                boxShadow: isDark ? "0 0 16px rgba(16, 185, 129, 0.2)" : "none",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block",
                  animation: "pulseDot 1.6s infinite",
                  flexShrink: 0,
                }}
              />
              <span
                className="live-badge-full"
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: isDark ? "#34d399" : "#059669",
                  letterSpacing: "0.04em",
                }}
              >
                {tAppointments("liveQueueActiveBadge", undefined, "LIVE QUEUE ACTIVE")}
              </span>
              <span
                className="live-badge-short"
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: isDark ? "#34d399" : "#059669",
                  letterSpacing: "0.04em",
                }}
              >
                {tAppointments("liveBadgeShort", undefined, "LIVE")}
              </span>
            </div>
          </div>

          {/* Right Controls: Language Selector, Theme Switcher, Sync Live & Retrieve Booking */}
          <div className="booking-header-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LanguageSelector variant="header" />

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isDark ? "#111c35" : "#f1f5f9",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid #e2e8f0",
                color: isDark ? "#fbbf24" : "#4338ca",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              className="theme-toggle-btn"
              title={isDark ? tAppointments("themeToggleLight", undefined, "Light Mode") : tAppointments("themeToggleDark", undefined, "Dark Mode")}
              aria-label={isDark ? tAppointments("themeToggleLight", undefined, "Light Mode") : tAppointments("themeToggleDark", undefined, "Dark Mode")}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              type="button"
              onClick={() => refreshQueueStatus(selectedChamberId, false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                background: th.btnSecondaryBg,
                border: th.btnSecondaryBorder,
                color: th.btnSecondaryText,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className="sync-btn"
              title={tAppointments("refreshLiveQueueTooltip", undefined, "Refresh live queue status")}
            >
              <RefreshCw size={13} className={isRefreshingQueue ? "spin-animation" : ""} />
              <span className="sync-btn-text">{tAppointments("syncLiveBtn", undefined, "Sync Live")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecoverModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                background: isDark ? "rgba(99, 102, 241, 0.16)" : "rgba(99, 102, 241, 0.08)",
                border: isDark ? "1px solid rgba(99, 102, 241, 0.35)" : "1px solid rgba(99, 102, 241, 0.25)",
                color: isDark ? "#a5b4fc" : "#4338ca",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className="find-btn"
              title={tAppointments("findAppointmentVoucherTooltip", undefined, "Find my appointment voucher")}
            >
              <Search size={13} />
              <span className="find-btn-text">{tAppointments("findBookingBtn", undefined, "Find Booking")}</span>
            </button>

            {consultationFeeFormatted && (
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                }}
                className="fee-pill-top"
              >
                {tAppointments("consultationFee", undefined, "Fee")}: {consultationFeeFormatted}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          02. DOCTOR IDENTITY HERO CARD
          ========================================================================= */}
      <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 20px" }} className="booking-content-wrap">
        <div
          style={{
            background: th.cardBg,
            border: th.cardBorder,
            borderRadius: 22,
            padding: "24px 28px",
            boxShadow: th.cardShadow,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
            transition: "all 0.3s ease",
          }}
          className="doctor-summary-card"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }} className="doctor-avatar-wrap">
            <div
              className="doctor-avatar-box"
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                overflow: "hidden",
                border: isDark ? "2px solid #818cf8" : "2px solid #818cf8",
                boxShadow: isDark ? "0 8px 24px rgba(0, 0, 0, 0.5)" : "0 8px 24px rgba(99, 102, 241, 0.2)",
                position: "relative",
                flexShrink: 0,
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.fullName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 24,
                  }}
                >
                  {doctorInitials}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="doctor-name-heading" style={{ fontSize: 22, fontWeight: 850, color: th.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>
                  {profile.fullName}
                </h1>
                <span
                  className="specialist-badge"
                  style={{
                    background: isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.12)",
                    border: isDark ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(16, 185, 129, 0.3)",
                    color: isDark ? "#34d399" : "#059669",
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>{tAppointments("confirmed", undefined, "Verified Specialist")}</span>
                </span>
              </div>
              <p className="doctor-specialty-text" style={{ margin: "4px 0 0", fontSize: 14, color: isDark ? "#818cf8" : "#4f46e5", fontWeight: 700 }}>
                {profile.specialty}
              </p>
              <div
                className="doctor-meta-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 6,
                  fontSize: 12.5,
                  color: th.textMuted,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Building2 size={14} color={isDark ? "#818cf8" : "#4f46e5"} />
                  <strong style={{ color: th.textSecondary }}>
                    {selectedChamber?.facilityName || profile.chamberLocationsSummary || "Main Chamber"}
                  </strong>
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={14} color={isDark ? "#818cf8" : "#4f46e5"} />
                  <span>{selectedChamber?.visitingSchedule || "Today Open (6:00 PM - 10:00 PM)"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats or Booking Hint */}
          <div className="doctor-card-right-stats">
            <div
              style={{
                background: th.innerBg,
                border: th.innerBorder,
                borderRadius: 14,
                padding: "10px 18px",
                textAlign: isRtl ? "left" : "right",
              }}
            >
              <div style={{ fontSize: 11, color: th.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
                {tAppointments("queueAllocationLabel", undefined, "Queue Allocation")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: th.textPrimary, marginTop: 2 }}>
                {tAppointments("instantSerialToken", undefined, "Instant Serial Token")}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            03. TOP 3 LIVE QUEUE METRIC CARDS (Exact Match to /live-queue Luxury Style)
            ========================================================================= */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            margin: "20px 0 24px",
          }}
          className="queue-metrics-grid"
          aria-label={tAppointments("doctorLiveQueueMetricsAria", undefined, "Doctor Live Queue Metrics")}
        >
          {/* Card 1: Running (Now Serving) */}
          <article
            style={{
              background: th.kpiServing.bg,
              border: th.kpiServing.border,
              borderRadius: 18,
              padding: "20px 22px",
              boxShadow: th.kpiServing.shadow,
              display: "flex",
              alignItems: "center",
              gap: 16,
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease",
            }}
            className="kpi-card kpi-now-serving"
          >
            <div
              className="kpi-icon-wrap"
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: th.kpiServing.iconBg,
                border: th.kpiServing.iconBorder,
                display: "grid",
                placeItems: "center",
                color: th.kpiServing.iconColor,
                flexShrink: 0,
                boxShadow: "0 6px 16px rgba(245, 158, 11, 0.2)",
              }}
            >
              <Crown size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "inherit" }}>
                <span
                  className="kpi-title-label"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: th.kpiServing.labelColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {tAppointments("nowServingKpi", undefined, "NOW SERVING")}
                </span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#f59e0b",
                    animation: "pulseDot 1.4s infinite",
                    flexShrink: 0,
                  }}
                />
              </div>
              <div
                className="kpi-number-display"
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: th.kpiServing.numberColor,
                  letterSpacing: "-0.02em",
                  margin: "2px 0",
                  fontFamily: "monospace",
                }}
              >
                {queueStatus?.servingTicket?.ticketNumber || "—"}
              </div>
              <div
                className="kpi-sub-text"
                style={{
                  fontSize: 12,
                  color: th.kpiServing.subTextColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {queueStatus?.servingTicket?.patientName ? (
                  <span style={{ fontWeight: 700, color: th.textPrimary }}>
                    {queueStatus.servingTicket.patientName}
                  </span>
                ) : (
                  <span style={{ color: isDark ? "#34d399" : "#059669", fontWeight: 600 }}>
                    ● {tAppointments("chamberReadyStatus", undefined, "Chamber Ready")}
                  </span>
                )}
              </div>
            </div>
          </article>

          {/* Card 2: Next (Next Serial in line) */}
          <article
            style={{
              background: th.kpiNext.bg,
              border: th.kpiNext.border,
              borderRadius: 18,
              padding: "20px 22px",
              boxShadow: th.kpiNext.shadow,
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.3s ease",
            }}
            className="kpi-card kpi-next-serial"
          >
            <div
              className="kpi-icon-wrap"
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: th.kpiNext.iconBg,
                border: th.kpiNext.iconBorder,
                display: "grid",
                placeItems: "center",
                color: th.kpiNext.iconColor,
                flexShrink: 0,
                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.2)",
              }}
            >
              <Clock size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                className="kpi-title-label"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: th.kpiNext.labelColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {tAppointments("nextSerialKpi", undefined, "NEXT SERIAL")}
              </span>
              <div
                className="kpi-number-display"
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: th.kpiNext.numberColor,
                  letterSpacing: "-0.02em",
                  margin: "2px 0",
                  fontFamily: "monospace",
                }}
              >
                {queueStatus?.nextTicket?.ticketNumber ||
                  queueStatus?.tickets?.find((t) => t.status === "WAITING")?.ticketNumber ||
                  "—"}
              </div>
              <div
                className="kpi-sub-text"
                style={{
                  fontSize: 12,
                  color: th.kpiNext.subTextColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {queueStatus?.nextTicket?.patientName ||
                queueStatus?.tickets?.find((t) => t.status === "WAITING")?.patientName ? (
                  <span style={{ fontWeight: 700, color: th.textPrimary }}>
                    {queueStatus?.nextTicket?.patientName ||
                      queueStatus?.tickets?.find((t) => t.status === "WAITING")?.patientName}
                  </span>
                ) : (
                  <span style={{ color: th.textMuted }}>
                    {tAppointments("nextPatientStatus", undefined, "Next patient")}
                  </span>
                )}
              </div>
            </div>
          </article>

          {/* Card 3: Your Live Token / Booking */}
          <article
            style={{
              background: th.kpiToken.bg,
              border: th.kpiToken.border,
              borderRadius: 18,
              padding: "20px 22px",
              boxShadow: th.kpiToken.shadow,
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.3s ease",
            }}
            className="kpi-card kpi-your-token"
          >
            <div
              className="kpi-icon-wrap"
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: th.kpiToken.iconBg,
                border: th.kpiToken.iconBorder,
                display: "grid",
                placeItems: "center",
                color: th.kpiToken.iconColor,
                flexShrink: 0,
                boxShadow: bookedAppointment ? "0 6px 18px rgba(79, 70, 229, 0.35)" : "none",
              }}
            >
              <Ticket size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                className="kpi-title-label"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: th.kpiToken.labelColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {tAppointments("yourBookingKpi", undefined, "YOUR BOOKING")}
              </span>
              <div
                className="kpi-number-display"
                style={{
                  fontSize: bookedAppointment ? 28 : 26,
                  fontWeight: 900,
                  color: th.kpiToken.numberColor,
                  letterSpacing: "-0.01em",
                  margin: "2px 0",
                  fontFamily: bookedAppointment ? "monospace" : "inherit",
                }}
              >
                {bookedAppointment
                  ? bookedAppointment.bookingNumberDisplay ||
                    `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`
                  : tAppointments("notBookedStatus", undefined, "Not Booked")}
              </div>
              <div className="kpi-sub-text" style={{ fontSize: 12, color: th.kpiToken.subTextColor }}>
                {bookedAppointment ? (
                  <span style={{ color: isDark ? "#34d399" : "#059669", fontWeight: 700 }}>
                    ● {tAppointments("confirmedStatus", undefined, "Confirmed")}
                  </span>
                ) : (
                  <span>{tAppointments("submitFormBelowHint", undefined, "Submit form below")}</span>
                )}
              </div>
            </div>
          </article>
        </section>

        {/* =========================================================================
            04. MAIN CONTENT: BOOKING FORM & CHAMBER GUIDELINES
            ========================================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: bookedAppointment ? "1fr 1fr" : "3fr 2fr",
            gap: 24,
            alignItems: "start",
          }}
          className="booking-main-grid"
        >
          {/* LEFT: BOOKING FORM */}
          <div
            style={{
              background: th.cardBg,
              border: th.cardBorder,
              borderRadius: 22,
              padding: "32px 30px",
              boxShadow: th.cardShadow,
              transition: "all 0.3s ease",
            }}
            className="booking-form-box"
          >
            <div
              className="booking-form-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                paddingBottom: 18,
                borderBottom: `1px solid ${th.divider}`,
              }}
            >
              <div>
                <h2 className="booking-form-title" style={{ fontSize: 19, fontWeight: 850, margin: 0, color: th.textPrimary }}>
                  {tAppointments("patientBookingHeading", undefined, "Patient Appointment Booking")}
                </h2>
                <p className="booking-form-sub" style={{ margin: "4px 0 0", fontSize: 13, color: th.textMuted }}>
                  {tAppointments("guaranteedSerialSub", undefined, "Guaranteed consultation serial saved permanently in database")}
                </p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.35)" : "1px solid rgba(99, 102, 241, 0.2)",
                  display: "grid",
                  placeItems: "center",
                  color: isDark ? "#818cf8" : "#4f46e5",
                }}
              >
                <Ticket size={20} />
              </div>
            </div>

            {bookingError && (
              <div
                style={{
                  background: isDark ? "#2a1215" : "#fef2f2",
                  border: isDark ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid #fecaca",
                  color: isDark ? "#fca5a5" : "#dc2626",
                  padding: "14px 16px",
                  borderRadius: 12,
                  fontSize: 13,
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* 1. Chamber Selection */}
              {profile.chambers && profile.chambers.length > 1 && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: th.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {tAppointments("selectChamberBranchLabel", undefined, "Select Chamber / Hospital Branch")} <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedChamberId}
                      onChange={(e) => handleChamberChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        background: th.inputBg,
                        border: th.inputBorder,
                        borderRadius: 12,
                        color: th.inputText,
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {profile.chambers.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: isDark ? "#0b1325" : "#ffffff", color: isDark ? "#ffffff" : "#1e1b4b" }}>
                          {c.facilityName} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 2. Patient Name & Mobile Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="form-fields-row">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: th.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {tAppointments("patientFullNameLabel", undefined, "Patient Full Name")} <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      required
                      placeholder={tAppointments("patientFullNamePlaceholder", undefined, "e.g. John Smith")}
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        background: th.inputBg,
                        border: th.inputBorder,
                        borderRadius: 12,
                        color: th.inputText,
                        fontSize: 14,
                        fontWeight: 500,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s ease",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = th.inputFocusBorder)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e0e7ff")}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: th.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {tAppointments("contactMobileLabel", undefined, "Contact Mobile Number")} <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="tel"
                      required
                      placeholder={tAppointments("contactMobilePlaceholder", undefined, "e.g. +1 234 567 8900")}
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        background: th.inputBg,
                        border: th.inputBorder,
                        borderRadius: 12,
                        color: th.inputText,
                        fontSize: 14,
                        fontWeight: 500,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s ease",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = th.inputFocusBorder)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e0e7ff")}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Date & Visiting Schedule */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="form-fields-row">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: th.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {tAppointments("appointmentDateLabel", undefined, "Appointment Date")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <div
                      onClick={() => {
                        try {
                          datePickerInputRef.current?.showPicker();
                        } catch {
                          datePickerInputRef.current?.focus();
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        background: th.inputBg,
                        border: th.inputBorder,
                        borderRadius: 12,
                        color: th.inputText,
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        letterSpacing: "0.03em",
                        outline: "none",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        userSelect: "none",
                      }}
                    >
                      <span>{formatDateDDMMYYYY(selectedDate)}</span>
                      <Calendar size={17} color={isDark ? "#818cf8" : "#4f46e5"} />
                    </div>

                    <input
                      ref={datePickerInputRef}
                      type="date"
                      value={selectedDate}
                      min={getTodayLocalDate()}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        pointerEvents: "auto",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: th.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {tAppointments("chamberScheduleTimeLabel", undefined, "Chamber Schedule & Time")}
                  </label>
                  <div
                    style={{
                      width: "100%",
                      padding: "13px 16px",
                      background: isDayOff
                        ? isDark ? "#2a1215" : "#fef2f2"
                        : selectedDaySchedule
                          ? isDark ? "#09241b" : "#f0fdf4"
                          : th.inputBg,
                      border: isDayOff
                        ? isDark ? "1.5px solid rgba(239, 68, 68, 0.45)" : "1.5px solid #fecaca"
                        : selectedDaySchedule
                          ? isDark ? "1.5px solid rgba(16, 185, 129, 0.45)" : "1.5px solid #bbf7d0"
                          : th.inputBorder,
                      borderRadius: 12,
                      color: isDayOff
                        ? isDark ? "#fca5a5" : "#b91c1c"
                        : selectedDaySchedule
                          ? isDark ? "#34d399" : "#15803d"
                          : isDark ? "#818cf8" : "#4338ca",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxSizing: "border-box",
                      minHeight: 48,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isDayOff ? (
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                    ) : (
                      <Clock size={16} color={selectedDaySchedule ? (isDark ? "#34d399" : "#16a34a") : (isDark ? "#818cf8" : "#4f46e5")} style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isDayOff
                        ? `${selectedDayName}: ${tAppointments("closedOffDayStatus", undefined, "Closed (Off-Day)")}`
                        : selectedDaySchedule
                          ? `${selectedDayName}: ${selectedDaySchedule.start} – ${selectedDaySchedule.end}`
                          : selectedChamber?.visitingSchedule || "Daily 05:00 PM – 09:00 PM"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Off-Day Alert Notice Banner with Quick-Select Options */}
              {isDayOff && (
                <div
                  style={{
                    padding: "13px 16px",
                    background: isDark ? "#2a1215" : "#fef2f2",
                    border: isDark ? "1.5px solid rgba(239, 68, 68, 0.4)" : "1.5px solid #fecaca",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
                  }}
                >
                  <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5, color: isDark ? "#fca5a5" : "#991b1b", display: "block" }}>
                      {tAppointments("doctorNotPracticingHeading", { day: selectedDayName }, `Doctor is Not Practicing on ${selectedDayName}s`)}
                    </strong>
                    <p style={{ margin: "3px 0 8px", color: isDark ? "#f87171" : "#b91c1c", fontSize: 12.5, lineHeight: 1.45 }}>
                      {tAppointments("doctorNotPracticingNotice", {
                        doctor: profile.fullName,
                        day: selectedDayName,
                        chamber: selectedChamber?.facilityName || "this chamber",
                      }, `Dr. ${profile.fullName} has marked ${selectedDayName} as an OFF-DAY at ${selectedChamber?.facilityName || "this chamber"}. Consultation appointments cannot be booked on off-duty days.`)}
                    </p>
                    {chamberWeeklySchedule && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: isDark ? "#fca5a5" : "#7f1d1d" }}>
                          {tAppointments("chooseNextOpenDayLabel", undefined, "Choose Next Open Day:")}
                        </span>
                        {Object.entries(chamberWeeklySchedule)
                          .filter(([_, s]) => s.isOpen)
                          .map(([openDay, s]) => (
                            <button
                              key={openDay}
                              type="button"
                              onClick={() => {
                                const nextDate = getNextDateForDayOfWeek(openDay, selectedDate);
                                if (nextDate) setSelectedDate(nextDate);
                              }}
                              style={{
                                background: isDark ? "#111c35" : "#ffffff",
                                border: isDark ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid #f87171",
                                color: isDark ? "#fca5a5" : "#b91c1c",
                                padding: "4px 10px",
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                boxShadow: "0 1px 3px rgba(239, 68, 68, 0.1)",
                              }}
                            >
                              <span>👉 {openDay}</span>
                              <span style={{ fontSize: 10, color: th.textMuted }}>({s.start} - {s.end})</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || isDayOff}
                style={{
                  marginTop: 6,
                  padding: "15px 24px",
                  borderRadius: 14,
                  background: isSubmitting || isDayOff
                    ? isDark ? "#334155" : "#94a3b8"
                    : "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "0.01em",
                  cursor: isSubmitting || isDayOff ? "not-allowed" : "pointer",
                  boxShadow: isSubmitting || isDayOff ? "none" : "0 10px 25px rgba(79, 70, 229, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                }}
                className="submit-book-btn"
              >
                {isSubmitting ? (
                  <>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span>{tAppointments("allocatingSerialBtn", undefined, "Allocating Serial in Database...")}</span>
                  </>
                ) : (
                  <>
                    <Ticket size={18} strokeWidth={2.4} />
                    <span>{tAppointments("confirmBookAppointmentBtn", undefined, "Confirm & Book Appointment")}</span>
                  </>
                )}
              </button>

              {/* Recovery link */}
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setIsRecoverModalOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: isDark ? "#818cf8" : "#4f46e5",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {tAppointments("alreadyBookedRetrieveLink", undefined, "Already booked? Retrieve your appointment voucher slip")}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: CONFIRMATION TICKET VOUCHER OR CHAMBER INFO CARD */}
          {bookedAppointment ? (
            <div
              style={{
                background: th.cardBg,
                border: isDark ? "2px solid rgba(99, 102, 241, 0.6)" : "2px solid #6366f1",
                borderRadius: 22,
                padding: "30px 28px",
                boxShadow: isDark ? "0 16px 50px rgba(0, 0, 0, 0.6)" : "0 14px 40px rgba(99, 102, 241, 0.15)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                transition: "all 0.3s ease",
              }}
              className="voucher-card"
            >
              <div
                style={{
                  textAlign: "center",
                  borderBottom: isDark ? "1.5px dashed rgba(255, 255, 255, 0.15)" : "1.5px dashed #cbd5e1",
                  paddingBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.12)",
                    border: isDark ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(16, 185, 129, 0.3)",
                    color: isDark ? "#34d399" : "#059669",
                    padding: "4px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{tAppointments("confirmedSavedDbBadge", undefined, "CONFIRMED & SAVED TO DATABASE")}</span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: th.textMuted,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {tAppointments("clinicalVoucherSub", undefined, "GLOBAL BOOKING • CLINICAL VOUCHER")}
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: th.textPrimary }}>
                  {tAppointments("serialTokenHeading", undefined, "Appointment Serial Token")}
                </h3>
                <div
                  className="voucher-token-number"
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    color: isDark ? "#818cf8" : "#4338ca",
                    letterSpacing: "0.04em",
                    margin: "12px 0 6px",
                    fontFamily: "monospace",
                  }}
                >
                  {bookedAppointment.bookingNumberDisplay ||
                    `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: th.textSecondary }}>
                  {tAppointments("patientNameLabel", undefined, "Patient:")}{" "}
                  <strong style={{ color: th.textPrimary }}>
                    {"patientName" in bookedAppointment
                      ? bookedAppointment.patientName
                      : bookedAppointment.patientNameMasked}
                  </strong>
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: th.innerBg,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: th.innerBorder,
                  }}
                >
                  <span style={{ fontWeight: 700, color: th.textMuted }}>{tAppointments("appointmentDateLabelVoucher", undefined, "Appointment Date:")}</span>
                  <strong style={{ color: isDark ? "#818cf8" : "#4338ca", fontFamily: "monospace", fontSize: 15 }}>
                    {formatDateDDMMYYYY(bookedAppointment.appointmentDate)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: th.innerBg,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: th.innerBorder,
                  }}
                >
                  <span style={{ fontWeight: 700, color: th.textMuted }}>{tAppointments("serialNoLabelVoucher", undefined, "Serial No.:")}</span>
                  <strong style={{ color: isDark ? "#818cf8" : "#4338ca", fontFamily: "monospace", fontSize: 15 }}>
                    {bookedAppointment.bookingNumberDisplay ||
                      `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: th.textSecondary }}>
                  <span>{tAppointments("specialistDoctorLabel", undefined, "Specialist Doctor:")}</span>
                  <strong style={{ color: th.textPrimary }}>
                    {bookedAppointment.doctorName || profile.fullName}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: th.textSecondary }}>
                  <span>{tAppointments("facilityChamberLabel", undefined, "Facility / Chamber:")}</span>
                  <strong style={{ color: th.textPrimary }}>
                    {"chamberName" in bookedAppointment
                      ? bookedAppointment.chamberName
                      : bookedAppointment.facilityName ||
                      selectedChamber?.facilityName ||
                      "Main Chamber"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: th.textSecondary }}>
                  <span>{tAppointments("timeLabelVoucher", undefined, "Time:")}</span>
                  <strong style={{ color: th.textPrimary }}>
                    {("appointmentTime" in bookedAppointment && bookedAppointment.appointmentTime) ||
                      selectedChamber?.visitingSchedule ||
                      "Daily 05:00 PM – 09:00 PM"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: th.textSecondary }}>
                  <span>{tAppointments("statusLabelVoucher", undefined, "Status:")}</span>
                  <span style={{ color: isDark ? "#34d399" : "#059669", fontWeight: 700 }}>
                    ● {bookedAppointment.status || "CONFIRMED"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: th.textMuted,
                    fontSize: 11.5,
                    paddingTop: 6,
                    borderTop: `1px solid ${th.divider}`,
                  }}
                >
                  <span>{tAppointments("trackingReferenceLabel", undefined, "Tracking Reference:")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: th.textPrimary }}>
                      {bookedAppointment.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyReference(bookedAppointment.referenceNumber)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isDark ? "#818cf8" : "#6366f1",
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 4px",
                        borderRadius: 4,
                      }}
                      title={tAppointments("copyRefTooltip", undefined, "Copy reference number")}
                    >
                      {copiedRef ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: isDark ? "rgba(99, 102, 241, 0.14)" : "rgba(99, 102, 241, 0.08)",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 12.5,
                  color: isDark ? "#a5b4fc" : "#4338ca",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Clock size={16} color={isDark ? "#818cf8" : "#4f46e5"} style={{ flexShrink: 0 }} />
                <span>
                  {tAppointments("voucherSyncNotice", undefined, "Your appointment is confirmed and synced to the chamber live queue. Please present this serial number upon arrival.")}
                </span>
              </div>

              <div className="voucher-actions-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 6px 18px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  <Printer size={16} />
                  <span>{tAppointments("printSlipBtn", undefined, "Print Slip")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareVoucher}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: isDark ? "rgba(99, 102, 241, 0.16)" : "rgba(99, 102, 241, 0.08)",
                    border: isDark ? "1px solid rgba(99, 102, 241, 0.35)" : "1px solid rgba(99, 102, 241, 0.25)",
                    color: isDark ? "#a5b4fc" : "#4338ca",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  title={tAppointments("shareVoucherTooltip", undefined, "Share or copy booking voucher")}
                >
                  <Share2 size={15} />
                  <span>{tAppointments("shareVoucherBtn", undefined, "Share")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      try {
                        localStorage.removeItem(`gb_guest_booking_${slug}`);
                        sessionStorage.removeItem("gb_guest_booking_ref");
                      } catch {}
                    }
                    setBookedAppointment(null);
                  }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: th.btnSecondaryBg,
                    border: th.btnSecondaryBorder,
                    color: th.btnSecondaryText,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tAppointments("bookAnotherBtn", undefined, "Book Another")}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: th.cardBg,
                border: th.cardBorder,
                borderRadius: 22,
                padding: "30px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                boxShadow: th.cardShadow,
                transition: "all 0.3s ease",
              }}
              className="guidelines-card"
            >
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: th.textPrimary }}>
                  {tAppointments("chamberGuidelinesHeading", undefined, "Chamber Guidelines & Hours")}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: th.textMuted }}>
                  {tAppointments("zeroWaitSub", undefined, "Automated live queue booking ensures zero physical wait time.")}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    background: th.innerBg,
                    border: th.innerBorder,
                    padding: "14px 16px",
                    borderRadius: 14,
                  }}
                >
                  <Clock size={20} color={isDark ? "#818cf8" : "#4f46e5"} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: 13.5, color: th.textPrimary, display: "block" }}>
                      {tAppointments("visitingScheduleHeading", undefined, "Visiting Schedule")}
                    </strong>
                    <span style={{ fontSize: 12.5, color: th.textMuted, marginTop: 2, display: "block" }}>
                      {selectedChamber?.visitingSchedule ||
                        "Daily Evening 6:00 PM - 10:00 PM (Except Friday)"}
                    </span>
                    {weeklyRoster.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: 4,
                        }}
                      >
                        {weeklyRoster.map((item) => (
                          <div
                            key={item.day}
                            title={`${item.day}: ${item.hours}`}
                            style={{
                              textAlign: "center",
                              padding: "4px 2px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              background: item.isOpen
                                ? isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.12)"
                                : isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                              color: item.isOpen
                                ? isDark ? "#34d399" : "#059669"
                                : isDark ? "#64748b" : "#94a3b8",
                              border: item.isOpen
                                ? isDark ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(16, 185, 129, 0.3)"
                                : isDark ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(239, 68, 68, 0.15)",
                            }}
                          >
                            <div>{item.abbr}</div>
                            <div style={{ fontSize: 8.5, marginTop: 1 }}>{item.isOpen ? tAppointments("openStatusBadge", undefined, "OPEN") : tAppointments("offStatusBadge", undefined, "OFF")}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    background: th.innerBg,
                    border: th.innerBorder,
                    padding: "14px 16px",
                    borderRadius: 14,
                  }}
                >
                  <MapPin size={20} color={isDark ? "#818cf8" : "#4f46e5"} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: 13.5, color: th.textPrimary, display: "block" }}>
                      {tAppointments("locationRoomHeading", undefined, "Location & Room")}
                    </strong>
                    <span style={{ fontSize: 12.5, color: th.textMuted, marginTop: 2, display: "block" }}>
                      {selectedChamber?.facilityName || "Main Specialized Chamber"}
                      {selectedChamber?.city ? `, ${selectedChamber.city}` : ""}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    background: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)",
                    border: isDark ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
                    padding: "14px 16px",
                    borderRadius: 14,
                  }}
                >
                  <ShieldCheck size={20} color={isDark ? "#34d399" : "#059669"} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: 13.5, color: isDark ? "#34d399" : "#065f46", display: "block" }}>
                      {tAppointments("directDbQueueHeading", undefined, "Direct Database Queue")}
                    </strong>
                    <span style={{ fontSize: 12.5, color: isDark ? "#a7f3d0" : "#047857", marginTop: 2, display: "block" }}>
                      {tAppointments("directDbQueueDesc", undefined, "Bookings are atomically allocated a chamber serial number and immediately broadcast to the doctor's live screen.")}
                    </span>
                  </div>
                </div>
              </div>

              {consultationFeeFormatted && (
                <div
                  style={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0.04) 100%)"
                      : "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)",
                    border: isDark ? "1.5px solid rgba(99, 102, 241, 0.35)" : "1.5px solid #c7d2fe",
                    borderRadius: 14,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: isDark ? "#818cf8" : "#4338ca", fontWeight: 700 }}>
                      {tAppointments("consultationFee", undefined, "Consultation Fee:")}
                    </span>
                    <strong style={{ fontSize: 18, color: th.textPrimary }}>
                      {consultationFeeFormatted}
                    </strong>
                  </div>
                  <span style={{ fontSize: 12, color: th.textMuted, display: "block", marginTop: 4 }}>
                    {tAppointments("payableAtReceptionHint", undefined, "Payable at chamber reception during visit or via card.")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          05. RECOVERY MODAL
          ========================================================================= */}
      {isRecoverModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(3, 7, 18, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={() => setIsRecoverModalOpen(false)}
        >
          <div
            className="recover-modal-box"
            style={{
              background: th.cardBg,
              borderRadius: 22,
              padding: "28px 26px",
              maxWidth: 440,
              width: "100%",
              boxShadow: isDark ? "0 25px 70px rgba(0, 0, 0, 0.75)" : "0 20px 60px rgba(15, 23, 42, 0.2)",
              border: th.cardBorder,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.textPrimary }}>
                {tAppointments("findYourAppointmentHeading", undefined, "Find Your Appointment")}
              </h3>
              <button
                type="button"
                onClick={() => setIsRecoverModalOpen(false)}
                style={{
                  background: th.btnSecondaryBg,
                  border: "none",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: th.textMuted,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: th.textMuted, margin: "0 0 20px", lineHeight: 1.5 }}>
              {tAppointments("findYourAppointmentSub", undefined, "Enter your booking reference and contact phone to retrieve your confirmed appointment slip.")}
            </p>

            {recoverError && (
              <div
                style={{
                  background: isDark ? "#2a1215" : "#fef2f2",
                  border: isDark ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid #fecaca",
                  color: isDark ? "#fca5a5" : "#dc2626",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                {recoverError}
              </div>
            )}

            <form onSubmit={handleRecoverBooking} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: th.textPrimary, marginBottom: 6 }}>
                  {tAppointments("bookingReferenceInputLabel", undefined, "Booking Reference Number")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tAppointments("bookingReferencePlaceholder", undefined, "e.g. GB-XXXXXX")}
                  value={recoverReference}
                  onChange={(e) => setRecoverReference(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: th.inputBg,
                    border: th.inputBorder,
                    borderRadius: 10,
                    fontSize: 14,
                    color: th.inputText,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = th.inputFocusBorder)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e0e7ff")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: th.textPrimary, marginBottom: 6 }}>
                  {tAppointments("registeredPhoneInputLabel", undefined, "Registered Contact Phone")}
                </label>
                <input
                  type="tel"
                  required
                  placeholder={tAppointments("registeredPhonePlaceholder", undefined, "Enter phone number used at booking")}
                  value={recoverPhone}
                  onChange={(e) => setRecoverPhone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: th.inputBg,
                    border: th.inputBorder,
                    borderRadius: 10,
                    fontSize: 14,
                    color: th.inputText,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = th.inputFocusBorder)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e0e7ff")}
                />
              </div>

              <button
                type="submit"
                disabled={isRecovering}
                style={{
                  marginTop: 8,
                  padding: "13px 20px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: isRecovering ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 6px 18px rgba(79, 70, 229, 0.3)",
                }}
              >
                {isRecovering ? (
                  <span>{tAppointments("checkingDbBtn", undefined, "Checking database...")}</span>
                ) : (
                  <>
                    <Search size={15} />
                    <span>{tAppointments("retrieveAppointmentBtn", undefined, "Retrieve Appointment")}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS for animations and mobile responsive layout */}
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pulseDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
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
        .spin-animation {
          animation: spin 0.8s linear infinite;
        }
        .spin-slow {
          animation: spin 3s linear infinite;
        }

        /* Default desktop state */
        .back-btn-text-short {
          display: none;
        }
        .live-badge-short {
          display: none;
        }

        @media (max-width: 900px) {
          .booking-main-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 640px) {
          .booking-page-root {
            padding-bottom: 50px !important;
          }

          /* Header / Navbar on Mobile */
          .booking-header-inner {
            padding: 10px 12px !important;
            gap: 8px !important;
            flex-wrap: nowrap !important;
          }
          .booking-header-left {
            gap: 8px !important;
            flex-shrink: 1 !important;
            min-width: 0 !important;
          }
          .booking-header-right {
            gap: 6px !important;
            flex-shrink: 0 !important;
          }
          .back-btn {
            padding: 7px 10px !important;
            font-size: 12px !important;
            border-radius: 8px !important;
          }
          .back-btn-text-full {
            display: none !important;
          }
          .back-btn-text-short {
            display: inline !important;
          }
          .live-badge-wrap {
            padding: 5px 8px !important;
          }
          .live-badge-full {
            display: none !important;
          }
          .live-badge-short {
            display: inline !important;
            font-size: 10px !important;
          }
          .sync-btn span, .find-btn span {
            display: none !important;
          }
          .sync-btn, .find-btn {
            padding: 8px 10px !important;
            border-radius: 8px !important;
          }
          .fee-pill-top {
            display: none !important;
          }

          /* Content Wrapper */
          .booking-content-wrap {
            padding: 0 12px !important;
            margin-top: 14px !important;
          }

          /* Doctor Hero Card on Mobile */
          .doctor-summary-card {
            padding: 16px 14px !important;
            border-radius: 18px !important;
            gap: 12px !important;
          }
          .doctor-avatar-wrap {
            gap: 12px !important;
            width: 100% !important;
          }
          .doctor-avatar-box {
            width: 58px !important;
            height: 58px !important;
            border-radius: 14px !important;
          }
          .doctor-avatar-box img {
            width: 58px !important;
            height: 58px !important;
          }
          .doctor-name-heading {
            font-size: 18px !important;
            line-height: 1.25 !important;
          }
          .specialist-badge {
            font-size: 10px !important;
            padding: 2px 7px !important;
          }
          .doctor-specialty-text {
            font-size: 13px !important;
            margin-top: 2px !important;
          }
          .doctor-meta-row {
            font-size: 11.5px !important;
            gap: 8px !important;
            margin-top: 4px !important;
          }
          .doctor-card-right-stats {
            width: 100% !important;
            margin-top: 4px !important;
          }
          .doctor-card-right-stats > div {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 8px 12px !important;
            border-radius: 10px !important;
            text-align: left !important;
          }
          .doctor-card-right-stats div:first-child {
            font-size: 10.5px !important;
          }
          .doctor-card-right-stats div:last-child {
            font-size: 13.5px !important;
            margin-top: 0 !important;
          }

          /* 3-Column Mobile Live Queue Status Strip */
          .queue-metrics-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            margin: 12px 0 16px !important;
          }
          .kpi-card {
            padding: 10px 6px !important;
            border-radius: 14px !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 4px !important;
          }
          .kpi-card .kpi-icon-wrap {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .kpi-card .kpi-icon-wrap svg {
            width: 15px !important;
            height: 15px !important;
          }
          .kpi-card .kpi-title-label {
            font-size: 9px !important;
            letter-spacing: 0.02em !important;
          }
          .kpi-card .kpi-number-display {
            font-size: 20px !important;
            line-height: 1.15 !important;
            margin: 1px 0 !important;
          }
          .kpi-card .kpi-sub-text {
            font-size: 9.5px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }

          /* Booking Form Box */
          .booking-form-box {
            padding: 20px 14px !important;
            border-radius: 18px !important;
          }
          .booking-form-header {
            margin-bottom: 18px !important;
            padding-bottom: 14px !important;
          }
          .booking-form-title {
            font-size: 17px !important;
          }
          .booking-form-sub {
            font-size: 12px !important;
          }
          .form-fields-row {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .booking-form-box input,
          .booking-form-box select {
            font-size: 16px !important; /* Prevents auto zoom in iOS Safari */
            padding: 12px 14px !important;
            height: 48px !important;
            border-radius: 10px !important;
          }
          .submit-book-btn {
            height: 50px !important;
            font-size: 15px !important;
            border-radius: 12px !important;
          }
          .submit-book-btn:active {
            transform: scale(0.98) !important;
          }

          /* Guidelines Card */
          .guidelines-card {
            padding: 20px 14px !important;
            border-radius: 18px !important;
          }

          /* Voucher Card */
          .voucher-card {
            padding: 20px 14px !important;
            border-radius: 18px !important;
          }
          .voucher-token-number {
            font-size: 34px !important;
            margin: 8px 0 4px !important;
          }
          .voucher-actions-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .voucher-actions-row button {
            width: 100% !important;
            min-width: unset !important;
            height: 46px !important;
          }

          /* Recover Modal */
          .recover-modal-box {
            padding: 20px 16px !important;
            border-radius: 18px !important;
            margin: 12px !important;
            max-width: calc(100vw - 24px) !important;
          }
          .recover-modal-box input {
            font-size: 16px !important;
            height: 48px !important;
          }
        }

        @media (max-width: 360px) {
          .kpi-card .kpi-number-display {
            font-size: 18px !important;
          }
          .kpi-card .kpi-title-label {
            font-size: 8.5px !important;
          }
          .kpi-card {
            padding: 8px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
