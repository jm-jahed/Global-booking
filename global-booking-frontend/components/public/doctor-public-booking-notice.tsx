"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  User,
  Sparkles,
  Radio,
  Crown,
  Ticket,
  RefreshCw,
  Phone,
  Shield,
  ArrowRight,
  Printer,
  Stethoscope,
  AlertCircle,
  Check,
  CreditCard,
  Building2,
  ChevronRight,
  Share2,
  Search,
  Copy,
  X,
} from "lucide-react";
import type {
  PublicDoctorProfile,
  PublicQueueTicket,
  PublicDoctorQueueStatus,
  PublicAppointmentRecord,
  PublicAppointmentSummary,
} from "@/lib/api/doctor-public-client";
import {
  getPublicDoctorProfile,
  bookDoctorPublicAppointment,
  createGuestDoctorAppointment,
  recoverGuestDoctorAppointment,
  getDoctorPublicQueueStatus,
} from "@/lib/api/doctor-public-client";

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

  // Submission State
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
      setBookingError("Please enter your full patient name (at least 2 characters).");
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 5) {
      setBookingError("Please enter a valid contact phone number.");
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
        setBookingError(res.error || "Could not complete booking. Please try again.");
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

      const vId = ("voucherId" in res.appointment && res.appointment.voucherId) ? res.appointment.voucherId : formatVoucherId(res.appointment.appointmentDate);
      const displayNum = res.appointment.bookingNumberDisplay || `#${String(res.appointment.bookingNumber || 1).padStart(2, "0")}`;
      showToast(`Appointment confirmed! Voucher ID: ${vId} | Serial No.: ${displayNum}`);

      // Trigger cross-tab event so doctor portal updates immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("global-booking-updated"));
        try {
          localStorage.setItem("global-booking-last-sync", Date.now().toString());
        } catch {}
      }
    } catch (err: any) {
      setBookingError(err?.message || "An unexpected error occurred while booking.");
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
      setRecoverError("Please provide both your booking reference and registered contact phone.");
      return;
    }

    setIsRecovering(true);

    try {
      const res = await recoverGuestDoctorAppointment({
        referenceNumber: cleanRef,
        patientPhone: cleanPhone,
      });

      if (!res.success || !res.appointment) {
        setRecoverError(res.error || "Invalid booking reference or verification details.");
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
      showToast("Appointment successfully retrieved from database!");
    } catch (err: any) {
      setRecoverError(err?.message || "Failed to recover appointment. Please check your credentials.");
    } finally {
      setIsRecovering(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
      showToast("Booking reference copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050b14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: "3px solid rgba(229, 184, 105, 0.2)",
            borderTopColor: "#e5b869",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
          Connecting to Doctor Live Queue System...
        </p>
      </div>
    );
  }

  if (notFoundState || !profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050b14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f87171",
            marginBottom: 16,
          }}
        >
          <AlertCircle size={30} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Doctor Not Found</h1>
        <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 440, margin: "0 0 24px" }}>
          The requested doctor portfolio or booking portal is not published or currently unavailable.
        </p>
        <Link
          href="/"
          style={{
            padding: "10px 22px",
            background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
            color: "#070d18",
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          Return to Global Directory
        </Link>
      </div>
    );
  }

  const selectedChamber =
    profile.chambers?.find((c) => c.id === selectedChamberId) || profile.chambers?.[0];

  // Global fee: numeric amount only, no currency suffix (AED). Only shown if doctor configured an amount > 0.
  const rawFeeAmount =
    typeof profile.consultationFee?.amount === "number" && profile.consultationFee.amount > 0
      ? profile.consultationFee.amount
      : typeof profile.consultationFee?.amountInFils === "number" && profile.consultationFee.amountInFils > 0
      ? profile.consultationFee.amountInFils / 100
      : null;

  const consultationFeeFormatted = rawFeeAmount ? `${rawFeeAmount}` : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050b14",
        color: "#ffffff",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        paddingBottom: 60,
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
            background: "#0c172a",
            border: "1px solid #e5b869",
            padding: "12px 20px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
          }}
        >
          <CheckCircle2 size={16} color="#e5b869" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>{toastMessage}</span>
        </div>
      )}

      {/* TOP LUXURY NAVBAR */}
      <header
        style={{
          borderBottom: "1px solid rgba(229, 184, 105, 0.15)",
          background: "rgba(5, 11, 20, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href={`/${profile.slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "#e5b869",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span>← Official Doctor Profile</span>
            </Link>
            <span style={{ color: "#334155" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 10px #10b981",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", letterSpacing: "0.03em" }}>
                LIVE QUEUE ACTIVE
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => refreshQueueStatus(selectedChamberId, false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Refresh live queue status"
            >
              <RefreshCw size={12} className={isRefreshingQueue ? "spin-animation" : ""} />
              <span>Sync Live</span>
            </button>

            {consultationFeeFormatted && (
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "rgba(229, 184, 105, 0.1)",
                  border: "1px solid rgba(229, 184, 105, 0.3)",
                  color: "#e5b869",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Fee: {consultationFeeFormatted}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO / DOCTOR PROFILE CARD */}
      <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 20px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(9, 15, 28, 0.95) 100%)",
            border: "1px solid rgba(229, 184, 105, 0.25)",
            borderRadius: 16,
            padding: "24px 28px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 18,
                overflow: "hidden",
                border: "2px solid #e5b869",
                boxShadow: "0 0 20px rgba(229, 184, 105, 0.25)",
                position: "relative",
                flexShrink: 0,
                background: "#091326",
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
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e5b869",
                    fontWeight: 800,
                    fontSize: 24,
                  }}
                >
                  {profile.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", margin: 0 }}>
                  {profile.fullName}
                </h1>
                <span
                  style={{
                    background: "rgba(229, 184, 105, 0.15)",
                    border: "1px solid rgba(229, 184, 105, 0.4)",
                    color: "#e5b869",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Verified Specialist
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#38bdf8", fontWeight: 600 }}>
                {profile.specialty}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 6,
                  fontSize: 12,
                  color: "#94a3b8",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Building2 size={13} color="#e5b869" />
                  {selectedChamber?.facilityName || profile.chamberLocationsSummary || "Main Chamber"}
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} color="#38bdf8" />
                  {selectedChamber?.visitingSchedule || "Today Open (6:00 PM - 10:00 PM)"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* TOP 3 LUXURY KPI METRIC CARDS (Running, Next, Your Live Token) */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            margin: "20px 0 24px",
          }}
          aria-label="Doctor Live Queue Metrics"
        >
          {/* Card 1: Running (Now Serving) */}
          <article
            style={{
              background: "linear-gradient(145deg, rgba(229, 184, 105, 0.14) 0%, rgba(184, 134, 40, 0.05) 100%)",
              border: "1px solid rgba(229, 184, 105, 0.4)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(229, 184, 105, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
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
              <Crown size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e5b869", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Running (Now Serving)
              </span>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "2px 0" }}>
                {queueStatus?.servingTicket?.ticketNumber || "—"}
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {queueStatus?.servingTicket?.patientName ? (
                  <span style={{ fontWeight: 600, color: "#e2e8f0" }}>
                    {queueStatus.servingTicket.patientName}
                  </span>
                ) : (
                  <span style={{ color: "#64748b" }}>Consultation Chamber Ready</span>
                )}
              </div>
            </div>
          </article>

          {/* Card 2: Next (Next Serial in line) */}
          <article
            style={{
              background: "linear-gradient(145deg, #091326 0%, #060c18 100%)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
                flexShrink: 0,
              }}
            >
              <Clock size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Next Serial
              </span>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.01em", margin: "2px 0" }}>
                {queueStatus?.nextTicket?.ticketNumber || (queueStatus?.tickets?.find((t) => t.status === "WAITING")?.ticketNumber) || "—"}
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {queueStatus?.nextTicket?.patientName || (queueStatus?.tickets?.find((t) => t.status === "WAITING")?.patientName) ? (
                  <span style={{ fontWeight: 600, color: "#e2e8f0" }}>
                    {queueStatus?.nextTicket?.patientName || queueStatus?.tickets?.find((t) => t.status === "WAITING")?.patientName}
                  </span>
                ) : (
                  <span style={{ color: "#64748b" }}>Next patient to be called</span>
                )}
              </div>
            </div>
          </article>

          {/* Card 3: Your Live Token */}
          <article
            style={{
              background: bookedAppointment
                ? "linear-gradient(145deg, rgba(229, 184, 105, 0.18) 0%, rgba(184, 134, 40, 0.08) 100%)"
                : "linear-gradient(145deg, #091326 0%, #060c18 100%)",
              border: bookedAppointment ? "1px solid rgba(229, 184, 105, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: bookedAppointment ? "rgba(229, 184, 105, 0.2)" : "rgba(255, 255, 255, 0.06)",
                border: bookedAppointment ? "1px solid rgba(229, 184, 105, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: bookedAppointment ? "#e5b869" : "#94a3b8",
                flexShrink: 0,
              }}
            >
              <Ticket size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: bookedAppointment ? "#e5b869" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Your Booking
              </span>
              <div style={{ fontSize: bookedAppointment ? 22 : 28, fontWeight: 900, color: bookedAppointment ? "#e5b869" : "#64748b", letterSpacing: "-0.01em", margin: "2px 0", fontFamily: bookedAppointment ? "monospace" : "inherit" }}>
                {bookedAppointment ? (bookedAppointment.bookingNumberDisplay || `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`) : "Not Booked"}
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                {bookedAppointment ? (
                  <span style={{ color: "#10b981", fontWeight: 700 }}>● Confirmed in System</span>
                ) : (
                  <span>Submit form below</span>
                )}
              </div>
            </div>
          </article>
        </section>

        {/* MAIN BODY CONTENT: BOOKING FORM */}
        <div
            style={{
              display: "grid",
              gridTemplateColumns: bookedAppointment ? "1fr 1fr" : "3fr 2fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* BOOKING FORM */}
            <div
              style={{
                background: "linear-gradient(145deg, #091326 0%, #050b14 100%)",
                border: "1px solid rgba(229, 184, 105, 0.25)",
                borderRadius: 16,
                padding: "28px 30px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#ffffff" }}>
                    Patient Appointment Booking
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                    Guaranteed appointment saved permanently in database
                  </p>
                </div>
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
                  <Ticket size={18} />
                </div>
              </div>

              {bookingError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    padding: "12px 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <AlertCircle size={16} color="#ef4444" />
                  <span>{bookingError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBooking} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* 1. Chamber Selection */}
                {profile.chambers && profile.chambers.length > 1 && (
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      Select Chamber / Hospital Branch <span style={{ color: "#e5b869" }}>*</span>
                    </label>
                    <select
                      value={selectedChamberId}
                      onChange={(e) => handleChamberChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "#0c172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 8,
                        color: "#ffffff",
                        fontSize: 13.5,
                        outline: "none",
                      }}
                    >
                      {profile.chambers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.facilityName} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Patient Name & Mobile Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      Patient Full Name <span style={{ color: "#e5b869" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter patient full name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "#0c172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 8,
                        color: "#ffffff",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      Contact Mobile Number <span style={{ color: "#e5b869" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter contact mobile number"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "#0c172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 8,
                        color: "#ffffff",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* 4. Date & Time */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      Appointment Date
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
                          padding: "11px 14px",
                          background: "#0c172a",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          borderRadius: 8,
                          color: "#ffffff",
                          fontSize: 13.5,
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
                        <Calendar size={16} color="#e5b869" style={{ opacity: 0.9 }} />
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
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                      Chamber Visiting Schedule & Time
                    </label>
                    <div
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(229, 184, 105, 0.35)",
                        borderRadius: 8,
                        color: "#e5b869",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxSizing: "border-box",
                        minHeight: 44,
                      }}
                    >
                      <Clock size={15} color="#e5b869" style={{ flexShrink: 0 }} />
                      <span>{selectedChamber?.visitingSchedule || "Daily 05:00 PM – 09:00 PM"}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: 6,
                    padding: "14px 24px",
                    borderRadius: 10,
                    background: isSubmitting
                      ? "rgba(229, 184, 105, 0.5)"
                      : "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                    border: "none",
                    color: "#070d18",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "0.01em",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 6px 20px rgba(229, 184, 105, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: "2px solid #070d18",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span>Confirming & Saving Appointment in Database...</span>
                    </>
                  ) : (
                    <>
                      <Ticket size={18} strokeWidth={2.4} />
                      <span>Confirm & Book Appointment</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* CONFIRMATION TICKET VOUCHER OR CHAMBER INFO CARD */}
            {bookedAppointment ? (
              <div
                style={{
                  background: "linear-gradient(145deg, rgba(229, 184, 105, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)",
                  border: "2px solid #e5b869",
                  borderRadius: 16,
                  padding: "28px 26px",
                  boxShadow: "0 10px 40px rgba(229, 184, 105, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div style={{ textAlign: "center", borderBottom: "1px dashed rgba(229, 184, 105, 0.3)", paddingBottom: 18 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      color: "#10b981",
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>CONFIRMED & SAVED TO DATABASE</span>
                  </div>
                <div style={{ textAlign: "center", borderBottom: "1px dashed rgba(229, 184, 105, 0.3)", paddingBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    GLOBAL BOOKING
                  </div>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#ffffff" }}>
                    Appointment Booking Voucher
                  </h3>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      color: "#e5b869",
                      letterSpacing: "0.04em",
                      margin: "10px 0 6px",
                      fontFamily: "monospace",
                      textShadow: "0 0 25px rgba(229, 184, 105, 0.4)",
                    }}
                  >
                    {bookedAppointment.bookingNumberDisplay || `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                    Patient: <strong style={{ color: "#ffffff" }}>{"patientName" in bookedAppointment ? bookedAppointment.patientName : bookedAppointment.patientNameMasked}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", background: "rgba(229, 184, 105, 0.08)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(229, 184, 105, 0.25)" }}>
                    <span style={{ fontWeight: 700, color: "#cbd5e1" }}>Appointment Date:</span>
                    <strong style={{ color: "#e5b869", fontFamily: "monospace", fontSize: 16, letterSpacing: "0.02em" }}>
                      {formatDateDDMMYYYY(bookedAppointment.appointmentDate)}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", background: "rgba(229, 184, 105, 0.08)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(229, 184, 105, 0.25)" }}>
                    <span style={{ fontWeight: 700, color: "#cbd5e1" }}>Serial No.:</span>
                    <strong style={{ color: "#e5b869", fontFamily: "monospace", fontSize: 16 }}>
                      {bookedAppointment.bookingNumberDisplay || `#${String(bookedAppointment.bookingNumber || 1).padStart(2, "0")}`}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>Specialist Doctor:</span>
                    <strong style={{ color: "#ffffff" }}>{bookedAppointment.doctorName || profile.fullName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>Facility / Chamber:</span>
                    <strong style={{ color: "#ffffff" }}>
                      {"chamberName" in bookedAppointment ? bookedAppointment.chamberName : (bookedAppointment.facilityName || selectedChamber?.facilityName || "Main Chamber")}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>Time:</span>
                    <strong style={{ color: "#ffffff" }}>
                      {("appointmentTime" in bookedAppointment && bookedAppointment.appointmentTime) || selectedChamber?.visitingSchedule || "Daily 05:00 PM – 09:00 PM"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>Status:</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>● {bookedAppointment.status || "CONFIRMED"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 11.5, paddingTop: 4, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <span>Internal Tracking Reference:</span>
                    <span style={{ fontFamily: "monospace" }}>{bookedAppointment.referenceNumber}</span>
                  </div>
                </div>
                </div>

                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.08)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 12.5,
                    color: "#93c5fd",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Clock size={16} color="#38bdf8" />
                  <span>
                    Your appointment is securely confirmed and saved in the database. Please present your booking serial when arriving at the chamber.
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: "11px 18px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                      border: "none",
                      color: "#070d18",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 15px rgba(229, 184, 105, 0.3)",
                    }}
                  >
                    <Printer size={15} />
                    <span>Print Appointment Voucher Slip</span>
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
                      padding: "11px 16px",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#94a3b8",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Book Another Patient
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "linear-gradient(145deg, #091326 0%, #050b14 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  padding: "26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                    Chamber Guidelines & Hours
                  </h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
                    Automated live queue booking ensures zero physical wait time.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "12px 14px",
                      borderRadius: 10,
                    }}
                  >
                    <Clock size={18} color="#e5b869" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>
                        Visiting Schedule
                      </strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {selectedChamber?.visitingSchedule || "Daily Evening 6:00 PM - 10:00 PM (Except Friday)"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "12px 14px",
                      borderRadius: 10,
                    }}
                  >
                    <MapPin size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>
                        Location & Room
                      </strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {selectedChamber?.facilityName || "Main Specialized Chamber"}
                        {selectedChamber?.city ? `, ${selectedChamber.city}` : ""}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "12px 14px",
                      borderRadius: 10,
                    }}
                  >
                    <Shield size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>
                        Direct Database Queue
                      </strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Bookings are atomically allocated a chamber serial number and immediately broadcast to the doctor&apos;s screen.
                      </span>
                    </div>
                  </div>
                </div>

                {consultationFeeFormatted && (
                  <div
                    style={{
                      background: "rgba(229, 184, 105, 0.08)",
                      border: "1px solid rgba(229, 184, 105, 0.25)",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#e5b869", fontWeight: 700 }}>
                        Consultation Fee:
                      </span>
                      <strong style={{ fontSize: 16, color: "#ffffff" }}>
                        {consultationFeeFormatted}
                      </strong>
                    </div>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", display: "block", marginTop: 4 }}>
                      Payable at chamber reception during visit or via card.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .spin-animation {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
