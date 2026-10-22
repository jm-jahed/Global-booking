"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Users,
  User,
  Headphones,
  QrCode,
  Bell,
  ArrowLeft,
  Sparkles,
  Zap,
  Check,
  LogOut,
  Stethoscope,
  X,
  Plus,
  ChevronDown,
  RotateCcw,
  Search,
  Hourglass,
  Phone,
  Mail,
  AlertCircle,
  Smartphone,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { PublicDoctorProfile } from "@/lib/api/doctor-public-client";
import { getPublicDoctorProfile } from "@/lib/api/doctor-public-client";
import { getNextDailySerialNumber } from "@/lib/services/doctor-appointments-service";

export interface DoctorPublicBookingNoticeProps {
  readonly slug: string;
}

interface PatientAccount {
  name: string;
  phone: string;
  email: string;
  isLoggedIn: boolean;
  patientId: string;
}

interface BookedAppointment {
  id: string;
  serviceTitle: string;
  doctorName: string;
  doctorSpecialty: string;
  facilityName: string;
  chamberRoom?: string;
  date: string;
  time: string;
  duration: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
  tokenNumber: string;
  fee: string;
}

interface QueuePatientItem {
  id: string;
  queueNo: string;
  customerName: string;
  serviceName: string;
  facilityName: string;
  status: "Now Serving" | "Next" | "In Queue" | "Completed";
  waitTime: string;
  isUser: boolean;
  avatarColor: string;
}

const DEFAULT_PATIENTS_DATABASE: Record<string, PatientAccount> = {};

export function DoctorPublicBookingNotice({ slug }: DoctorPublicBookingNoticeProps) {
  const [profile, setProfile] = useState<PublicDoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundState, setNotFoundState] = useState<boolean>(false);

  // Active navigation view in sidebar:
  // "dashboard" | "appointments" | "queue" | "profile" | "notifications" | "support"
  const [currentView, setCurrentView] = useState<
    "dashboard" | "appointments" | "queue" | "profile" | "notifications" | "support"
  >("dashboard");

  // Queue filter state
  const [queueFilter, setQueueFilter] = useState<"Live" | "Waiting" | "Completed">("Live");

  // Appointments filter state
  const [appointmentsFilter, setAppointmentsFilter] = useState<"All" | "UPCOMING" | "COMPLETED" | "CANCELLED">("All");

  // Patient database in memory/local storage
  const [patientsDb, setPatientsDb] = useState<Record<string, PatientAccount>>(DEFAULT_PATIENTS_DATABASE);

  // Active logged-in patient (starts logged out with zero demo data)
  const [patient, setPatient] = useState<PatientAccount>({
    name: "",
    phone: "",
    email: "",
    isLoggedIn: false,
    patientId: "",
  });
  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);

  // Modal controls
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginModalMode, setLoginModalMode] = useState<"login" | "register">("login");
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<string | null>(null);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState<boolean>(false);

  // Search input
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Mobile login & register inputs (NO OTP!)
  const [inputMobile, setInputMobile] = useState<string>("");
  const [inputFullName, setInputFullName] = useState<string>("");

  // Booking Flow State
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedChamber, setSelectedChamber] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("2026-04-24");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:30 AM");
  const [bookingSuccessToken, setBookingSuccessToken] = useState<string | null>(null);

  // Real Appointments list (zero demo data)
  const [appointments, setAppointments] = useState<BookedAppointment[]>([]);

  // Real Live Queue items (zero demo data)
  const [queueItems, setQueueItems] = useState<QueuePatientItem[]>([]);

  // Load real patient from localStorage if previously registered/logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Clear any old mock demo patient data if stored in browser
        const savedActivePhone = localStorage.getItem("global_booking_active_patient_phone");
        if (savedActivePhone && (savedActivePhone.includes("889 4432") || savedActivePhone.includes("8894432"))) {
          localStorage.removeItem("global_booking_active_patient_phone");
        }

        const savedDb = localStorage.getItem("global_booking_patients_db");
        let activePatientsDb: Record<string, PatientAccount> = {};
        if (savedDb) {
          const parsed = JSON.parse(savedDb);
          if (parsed && typeof parsed === "object") {
            delete parsed["+971508894432"];
            delete parsed["971508894432"];
            delete parsed["+971501234567"];
            delete parsed["971501234567"];
            activePatientsDb = parsed;
            setPatientsDb(parsed);
          }
        }

        const currentPhone = localStorage.getItem("global_booking_active_patient_phone");
        if (currentPhone) {
          const cleanKey = currentPhone.replace(/\D/g, "");
          const found = activePatientsDb[cleanKey] || activePatientsDb[`+${cleanKey}`] || activePatientsDb[currentPhone];
          if (found) {
            setPatient({ ...found, isLoggedIn: true });
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        setIsAuthLoaded(true);
      }
    } else {
      setIsAuthLoaded(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getPublicDoctorProfile(slug)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProfile(data);
          setNotFoundState(false);

          const primaryChamber = data.chambers?.[0]?.facilityName || "Chamber Desk";
          const primaryService = data.services?.[0]?.title || `${data.specialty} Consultation`;
          setSelectedService(primaryService);
          setSelectedChamber(primaryChamber);

          // Zero demo appointments: load genuine saved bookings for this doctor from localStorage
          let realApts: BookedAppointment[] = [];
          if (typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem(`global_booking_appointments_${slug}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                  // STRICT SANITIZATION: Eliminate any TK-77 / TK- tokens and convert to consecutive daily serials starting from #01
                  let counter = 6;
                  realApts = parsed.map((apt) => {
                    const tok = apt.tokenNumber || "";
                    if (tok.startsWith("TK-") || tok.startsWith("TK") || !tok.startsWith("#")) {
                      counter++;
                      const cleanToken = `#${counter.toString().padStart(2, "0")}`;
                      return { ...apt, tokenNumber: cleanToken, serialNumber: cleanToken };
                    }
                    return apt;
                  });
                  localStorage.setItem(`global_booking_appointments_${slug}`, JSON.stringify(realApts));
                }
              }
            } catch {
              // ignore
            }
          }
          setAppointments(realApts);

          // Zero demo queue items: construct only from genuine patient bookings
          const realQueue: QueuePatientItem[] = realApts.map((apt, idx) => ({
            id: `q-${apt.id}`,
            queueNo: apt.tokenNumber,
            customerName: `Patient (${apt.tokenNumber})`,
            serviceName: apt.serviceTitle,
            facilityName: apt.facilityName,
            status: idx === 0 ? "Now Serving" : idx === 1 ? "Next" : "In Queue",
            waitTime: idx === 0 ? "In Consultation" : `~ ${idx * 15} min`,
            isUser: true,
            avatarColor: idx === 0 ? "#10b981" : "#f59e0b",
          }));
          setQueueItems(realQueue);
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
  }, [slug]);

  const triggerToast = (msg: string) => {
    setShowNotificationToast(msg);
    setTimeout(() => {
      setShowNotificationToast(null);
    }, 3200);
  };

  const handleRefreshQueue = () => {
    setIsRefreshingQueue(true);
    setTimeout(() => {
      setIsRefreshingQueue(false);
      triggerToast(`Refreshed Dr. ${profile?.fullName || "Doctor"}'s live queue!`);
    }, 500);
  };

  // MOBILE LOGIN (NO OTP REQUIRED!)
  const handleMobileLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = inputMobile.trim();
    if (!cleanMobile) {
      triggerToast("Please enter your mobile number");
      return;
    }

    const key = cleanMobile.replace(/\D/g, "");
    const existing =
      patientsDb[cleanMobile] ||
      patientsDb[`+${key}`] ||
      patientsDb[key] ||
      Object.values(patientsDb).find((p) => p.phone.replace(/\D/g, "") === key);

    if (existing) {
      const activePatient = { ...existing, isLoggedIn: true };
      setPatient(activePatient);
      if (typeof window !== "undefined") {
        localStorage.setItem("global_booking_active_patient_phone", activePatient.phone);
      }
      setShowLoginModal(false);
      setInputMobile("");
      triggerToast(`Welcome back, ${existing.name}! Logged in with mobile (No OTP needed).`);

      // Update queue row with real patient name
      setQueueItems((prev) =>
        prev.map((q) => (q.isUser ? { ...q, customerName: `You (${existing.name})` } : q))
      );
    } else {
      // If mobile number not yet registered, prompt to complete instant 1-click registration
      setInputFullName("");
      setLoginModalMode("register");
      triggerToast("Mobile number not registered yet. Please enter your name to register (No OTP needed)!");
    }
  };

  // MOBILE REGISTRATION (NO OTP REQUIRED!)
  const handleMobileRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const name = inputFullName.trim();
    const mobile = inputMobile.trim();

    if (!name || !mobile) {
      triggerToast("Please enter your full name and mobile number");
      return;
    }

    const newPatientId = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAccount: PatientAccount = {
      name,
      phone: mobile,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@patient.ae`,
      isLoggedIn: true,
      patientId: newPatientId,
    };

    const key = mobile.replace(/\D/g, "");
    const updatedDb = { ...patientsDb, [key]: newAccount, [mobile]: newAccount };
    setPatientsDb(updatedDb);
    setPatient(newAccount);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("global_booking_patients_db", JSON.stringify(updatedDb));
        localStorage.setItem("global_booking_active_patient_phone", mobile);
      } catch {
        // ignore
      }
    }

    setShowLoginModal(false);
    setInputMobile("");
    setInputFullName("");
    triggerToast(`Registered & Logged in as ${name} (No OTP needed)!`);

    // Update queue row with real patient name
    setQueueItems((prev) =>
      prev.map((q) => (q.isUser ? { ...q, customerName: `You (${name})` } : q))
    );
  };

  const handleLogout = () => {
    const emptyPatient: PatientAccount = {
      name: "",
      phone: "",
      email: "",
      isLoggedIn: false,
      patientId: "",
    };
    setPatient(emptyPatient);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("global_booking_active_patient_phone");
      } catch {
        // ignore
      }
    }
    setShowLoginModal(false);
    triggerToast("Logged out of Patient Account");

    setQueueItems((prev) =>
      prev.map((q) => (q.isUser ? { ...q, customerName: `You (${q.queueNo})` } : q))
    );
  };

  const handleConfirmBooking = () => {
    if (!profile) return;
    
    // Sequential Chamber Serial starting from 1 (#01, #02, #03...) on daily base (NO TK-77)
    const newToken = getNextDailySerialNumber();
    const feeStr = profile.consultationFee
      ? `${profile.consultationFee.amount} ${profile.consultationFee.currency || "AED"}`
      : "500 AED";

    const bookingPatientName =
      patient.isLoggedIn && patient.name
        ? patient.name
        : inputFullName.trim() || "Online Patient";
    const bookingPatientPhone =
      patient.phone || inputMobile.trim() || "+971 50 123 4567";

    const newApt: any = {
      id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceTitle: selectedService || `${profile.specialty} Consultation`,
      doctorName: profile.fullName,
      doctorSpecialty: profile.specialty,
      facilityName: selectedChamber || profile.chambers?.[0]?.facilityName || "Main Cardiac Chamber",
      date: selectedDate,
      time: "Chamber Visit (Evening 06:00 PM)",
      channel: "In-Person Chamber",
      duration: "30 min",
      status: "UPCOMING",
      tokenNumber: newToken,
      serialNumber: newToken,
      fee: feeStr,
      patientName: bookingPatientName,
      patientPhone: bookingPatientPhone,
    };

    const newQueueEntry: QueuePatientItem = {
      id: `q-${Date.now()}`,
      queueNo: newToken,
      customerName: `You (${bookingPatientName})`,
      serviceName: newApt.serviceTitle,
      facilityName: newApt.facilityName,
      status: "In Queue",
      waitTime: "~ 20 min",
      isUser: true,
      avatarColor: "#f59e0b",
    };

    setAppointments((prev) => {
      const updated = [newApt, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`global_booking_appointments_${slug}`, JSON.stringify(updated));

          // Real-time synchronization directly into Doctor Dashboard
          const doctorAptsRaw = localStorage.getItem("global_booking_doctor_appointments");
          let doctorApts = [];
          if (doctorAptsRaw) {
            try {
              doctorApts = JSON.parse(doctorAptsRaw);
            } catch {}
          }
          if (Array.isArray(doctorApts)) {
            const syncedDoctorApt = {
              id: newApt.id,
              referenceNumber: `GB-ONL-${newApt.id.replace(/\D/g, "")}`,
              serialNumber: newToken,
              patientName: bookingPatientName,
              patientPhone: bookingPatientPhone,
              patientAgeGender: "Adult Patient",
              bloodGroup: "Pending",
              service: newApt.serviceTitle,
              serviceCategory: "Cardiology",
              doctorName: profile.fullName,
              doctorSpecialty: profile.specialty,
              chamberLocation: newApt.facilityName,
              date: selectedDate,
              time: selectedTimeSlot,
              duration: "30 min",
              status: "Confirmed",
              channel: "Online Web",
              paymentStatus: "Paid",
              price: feeStr,
              notes: "Instant Online Booking submitted via Doctor Public Website.",
              createdAt: new Date().toISOString(),
              isOnlineBooking: true,
            };
            const updatedDoctorApts = [syncedDoctorApt, ...doctorApts];
            localStorage.setItem("global_booking_doctor_appointments", JSON.stringify(updatedDoctorApts));
          }

          // Trigger live update across tabs / portal views
          window.dispatchEvent(new CustomEvent("global-booking-updated", { detail: newApt }));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    setQueueItems((prev) => [...prev, newQueueEntry]);
    setBookingSuccessToken(newToken);
    setBookingStep(2);
    triggerToast(`Appointment Confirmed with ${doctorDisplayName}! Queue Serial: ${newToken}`);
  };

  if (loading || !isAuthLoaded) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 20%, #0d1e38 0%, #07101f 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#f8fafc",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "rgba(245, 158, 11, 0.15)",
              border: "1.5px solid rgba(245, 158, 11, 0.4)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
              color: "#f59e0b",
              animation: "pulse 2s infinite",
            }}
          >
            <Calendar size={32} />
          </div>
          <h2 style={{ fontSize: 22, color: "#ffffff", margin: "0 0 8px", fontWeight: 800 }}>
            Loading Patient Portal...
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            Connecting to Dr. {slug}&apos;s verified practice directory.
          </p>
        </div>
      </main>
    );
  }

  if (notFoundState || !profile) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#07101f",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#ffffff",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#0d1b2e",
            borderRadius: 24,
            padding: "48px 36px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              color: "#f87171",
            }}
          >
            <AlertCircle size={30} />
          </div>
          <h1 style={{ fontSize: 24, color: "#ffffff", margin: "0 0 10px", fontWeight: 800 }}>
            Doctor Profile Unavailable
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
            The requested practitioner profile is currently private, unpublished, or does not exist.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#07101f",
              padding: "13px 28px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    );
  }

  const cleanDoctorName = profile.fullName.replace(/^Dr\.?\s+/i, "");
  const doctorDisplayName = `Dr. ${cleanDoctorName}`;
  const portfolioHref = `/${encodeURIComponent(profile.slug)}`;
  const upcomingCount = appointments.filter((a) => a.status === "UPCOMING").length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelledCount = appointments.filter((a) => a.status === "CANCELLED").length;

  // Filtered queue items
  const filteredQueue = queueItems.filter((item) => {
    if (queueFilter === "Live") return true;
    if (queueFilter === "Waiting") return item.status === "In Queue" || item.status === "Next";
    if (queueFilter === "Completed") return item.status === "Completed";
    return true;
  });

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    if (appointmentsFilter === "All") return true;
    return a.status === appointmentsFilter;
  });

  // "LOGIN CARA DASHBORD DEKBE NA" (Cannot see the dashboard without logging in!)
  if (!patient.isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050b14",
          backgroundImage: "radial-gradient(circle at 50% 0%, #0d223f 0%, #071223 55%, #040914 100%)",
          color: "#f8fafc",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Toast Notification */}
        {showNotificationToast && (
          <div
            style={{
              position: "fixed",
              top: 24,
              right: 24,
              zIndex: 9999,
              background: "linear-gradient(135deg, #0d233a 0%, #0a192a 100%)",
              border: "1.5px solid #f59e0b",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: 999,
              boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(245, 158, 11, 0.35)",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles size={16} color="#f59e0b" />
            <span>{showNotificationToast}</span>
          </div>
        )}

        {/* Top Header */}
        <header
          style={{
            height: 72,
            background: "#07111f",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
              }}
            >
              <Calendar size={20} color="#07101f" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1, display: "flex", gap: 4 }}>
                <span style={{ color: "#ffffff" }}>GLOBAL</span>
                <span style={{ color: "#f59e0b" }}>BOOKING</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                Patient Consultation &amp; Chamber Portal
              </div>
            </div>
          </div>

          <Link
            href={portfolioHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#0c1829",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#f59e0b",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
              padding: "8px 16px",
              borderRadius: 999,
              transition: "all 0.2s",
            }}
          >
            <ArrowLeft size={14} />
            <span>View {doctorDisplayName}&apos;s Profile</span>
          </Link>
        </header>

        {/* Center Card */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 20px",
          }}
        >
          {/* Doctor Brief Banner */}
          <div
            style={{
              background: "rgba(12, 27, 47, 0.7)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: 16,
              padding: "10px 20px",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1.5px solid #f59e0b",
                display: "grid",
                placeItems: "center",
                color: "#f59e0b",
              }}
            >
              <Stethoscope size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
              {doctorDisplayName}{" "}
              <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                • {profile.specialty} Practice
              </span>
            </div>
            {profile.chambers?.[0] && (
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {profile.chambers[0].facilityName}
              </span>
            )}
          </div>

          {/* Login / Register Card */}
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#0c1b2f",
              borderRadius: 24,
              padding: "34px 30px",
              border: "1.5px solid rgba(245, 158, 11, 0.4)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.15)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "2px solid #f59e0b",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                  color: "#f59e0b",
                  boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
                }}
              >
                <Smartphone size={28} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#ffffff" }}>
                {loginModalMode === "login" ? "Patient Mobile Sign-In" : "Patient Registration"}
              </h2>
              <p style={{ fontSize: 12, color: "#10b981", fontWeight: 700, margin: 0 }}>
                ⚡ NO OTP REQUIRED • DIRECT INSTANT ACCESS
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: "flex", background: "#071221", borderRadius: 12, padding: 4, marginBottom: 22 }}>
              <button
                type="button"
                onClick={() => setLoginModalMode("login")}
                style={{
                  flex: 1,
                  background: loginModalMode === "login" ? "#f59e0b" : "transparent",
                  color: loginModalMode === "login" ? "#07101f" : "#94a3b8",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 0",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <UserCheck size={14} />
                <span>Login with Mobile</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginModalMode("register")}
                style={{
                  flex: 1,
                  background: loginModalMode === "register" ? "#f59e0b" : "transparent",
                  color: loginModalMode === "register" ? "#07101f" : "#94a3b8",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 0",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <UserPlus size={14} />
                <span>Register with Mobile</span>
              </button>
            </div>

            {/* FORM: LOGIN WITH MOBILE (NO OTP) */}
            {loginModalMode === "login" ? (
              <form onSubmit={handleMobileLogin}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6, fontWeight: 700 }}>
                    Enter Your Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+971 50 123 4567 or 01712345678"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      background: "#071221",
                      border: "1.5px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 12,
                      padding: "13px 16px",
                      color: "#ffffff",
                      fontSize: 14,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    Direct login — No SMS / OTP code will be requested.
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px",
                    color: "#180e02",
                    fontSize: 14,
                    fontWeight: 850,
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.35)",
                  }}
                >
                  Sign In to Dashboard (No OTP)
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setLoginModalMode("register")}
                    style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
                  >
                    New patient? Register with Mobile in 1 Click →
                  </button>
                </div>
              </form>
            ) : (
              /* FORM: REGISTER NEW PATIENT WITH MOBILE (NO OTP) */
              <form onSubmit={handleMobileRegister}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6, fontWeight: 700 }}>
                    Full Patient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={inputFullName}
                    onChange={(e) => setInputFullName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      background: "#071221",
                      border: "1.5px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 12,
                      padding: "13px 16px",
                      color: "#ffffff",
                      fontSize: 14,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6, fontWeight: 700 }}>
                    Mobile Number (Used as your Patient ID)
                  </label>
                  <input
                    type="tel"
                    placeholder="+971 50 123 4567 or 01712345678"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      background: "#071221",
                      border: "1.5px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 12,
                      padding: "13px 16px",
                      color: "#ffffff",
                      fontSize: 14,
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 6, fontWeight: 600 }}>
                    Instant registration — No verification code or OTP needed.
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px",
                    color: "#180e02",
                    fontSize: 14,
                    fontWeight: 850,
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.35)",
                  }}
                >
                  Register &amp; Access Dashboard (No OTP)
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setLoginModalMode("login")}
                    style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
                  >
                    Already registered? Sign In with Mobile →
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3 Safety & Convenience Pills */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <Check size={14} color="#10b981" strokeWidth={3} />
              <span>Direct Doctor Queue Access</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <Check size={14} color="#10b981" strokeWidth={3} />
              <span>Real-Time Chamber Waiting Status</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <Check size={14} color="#10b981" strokeWidth={3} />
              <span>No Password or OTP Required</span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            padding: "18px 32px",
            textAlign: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: 12,
            color: "#64748b",
          }}
        >
          {doctorDisplayName} Practice Portal • Powered by GLOBAL BOOKING
        </footer>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050b14",
        backgroundImage: "radial-gradient(circle at 50% 0%, #0d223f 0%, #071223 55%, #040914 100%)",
        color: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      {/* Toast Notification */}
      {showNotificationToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "linear-gradient(135deg, #0d233a 0%, #0a192a 100%)",
            border: "1.5px solid #f59e0b",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: 999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(245, 158, 11, 0.35)",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Sparkles size={16} color="#f59e0b" />
          <span>{showNotificationToast}</span>
        </div>
      )}

      {/* =========================================================================
          LEFT SIDEBAR NAVIGATION (All 7 Sections Configured)
          ========================================================================= */}
      <aside
        style={{
          width: 250,
          background: "#07111f",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 16px 20px",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
          zIndex: 40,
        }}
      >
        <div>
          {/* Logo & Brand Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px 24px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                flexShrink: 0,
              }}
            >
              <Calendar size={22} color="#07101f" strokeWidth={2.5} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  display: "flex",
                  gap: 4,
                }}
              >
                <span style={{ color: "#ffffff" }}>GLOBAL</span>
                <span style={{ color: "#f59e0b" }}>BOOKING</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
                Book. Manage. Enjoy.
              </div>
            </div>
          </div>

          {/* Navigation Menu Items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* 1. Dashboard */}
            <button
              onClick={() => setCurrentView("dashboard")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "dashboard" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "dashboard" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "dashboard" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "dashboard" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={18} />
              <span>Dashboard</span>
            </button>

            {/* 2. My Appointments */}
            <button
              onClick={() => setCurrentView("appointments")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "appointments" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "appointments" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "appointments" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "appointments" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Clock size={18} />
              <span>My Appointments</span>
            </button>

            {/* 3. Live Queue (Same Doctor's Live Queue) */}
            <button
              onClick={() => setCurrentView("queue")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "queue" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "queue" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "queue" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "queue" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Users size={18} />
              <span>Live Queue</span>
            </button>

            {/* 4. My Profile */}
            <button
              onClick={() => setCurrentView("profile")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "profile" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "profile" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "profile" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "profile" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <User size={18} />
              <span>My Profile</span>
            </button>

            {/* 6. Notifications */}
            <button
              onClick={() => setCurrentView("notifications")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "notifications" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "notifications" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "notifications" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "notifications" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Bell size={18} />
                <span>Notifications</span>
              </div>
              {appointments.length > 0 && (
                <span
                  style={{
                    background: currentView === "notifications" ? "#07101f" : "#ef4444",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 900,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {appointments.length}
                </span>
              )}
            </button>

            {/* 7. Help & Support */}
            <button
              onClick={() => setCurrentView("support")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: currentView === "support" ? "linear-gradient(90deg, #d89b33 0%, #c58622 100%)" : "transparent",
                color: currentView === "support" ? "#07101f" : "#cbd5e1",
                border: "none",
                fontWeight: currentView === "support" ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: currentView === "support" ? "0 4px 14px rgba(216, 155, 51, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Headphones size={18} />
              <span>Help & Support</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Footer */}
        <div>
          <div
            style={{
              background: "linear-gradient(180deg, rgba(13, 27, 46, 0.9) 0%, rgba(9, 18, 32, 0.9) 100%)",
              borderRadius: 16,
              padding: "14px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              marginBottom: 16,
              position: "relative",
            }}
          >
            <div
              style={{
                height: 60,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#f59e0b",
              }}
            >
              <Stethoscope size={26} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>
              Relax While You Wait
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
              Your time matters. We keep you informed, always.
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 12,
              padding: "10px",
              color: "#f87171",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px", color: "#64748b", fontSize: 11 }}>
            <Calendar size={14} color="#f59e0b" />
            <span>GLOBAL BOOKING v2.8.0</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE
          ========================================================================= */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            height: 72,
            background: "#07111f",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            gap: 24,
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Search Box */}
          <div
            style={{
              flex: 1,
              maxWidth: 440,
              background: "#0c1829",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              padding: "9px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search services, appointments, or providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: 13,
                width: "100%",
              }}
            />
          </div>

          {/* Right Topbar Elements */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Return to Doctor Portfolio Link */}
            <Link
              href={portfolioHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#f59e0b",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                padding: "7px 14px",
                borderRadius: 999,
              }}
            >
              <ArrowLeft size={14} />
              <span>Dr. {profile.fullName.replace(/^Dr\.?\s+/i, "")}</span>
            </Link>

            {/* Date Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#0c1829",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                color: "#cbd5e1",
                fontWeight: 600,
              }}
            >
              <Calendar size={14} color="#f59e0b" />
              <span>Today</span>
              <ChevronDown size={14} color="#64748b" />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setCurrentView("notifications")}
              style={{
                position: "relative",
                background: "#0c1829",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                width: 38,
                height: 38,
                borderRadius: 10,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#cbd5e1",
              }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {appointments.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                    border: "2px solid #07111f",
                  }}
                >
                  {appointments.length}
                </span>
              )}
            </button>

            {/* Patient Profile & Log Out */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setCurrentView("profile")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#0c1829",
                  border: "1.5px solid rgba(245, 158, 11, 0.35)",
                  padding: "5px 14px 5px 6px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
                title="View Patient Profile"
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    display: "grid",
                    placeItems: "center",
                    color: "#07101f",
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
                    {patient.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#f59e0b" }}>
                    {patient.phone || "Verified Patient"}
                  </div>
                </div>
                <ChevronDown size={14} color="#64748b" />
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  color: "#f87171",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Log Out of Patient Account"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area Rendering the Selected View */}
        <main style={{ padding: "30px 32px 60px", display: "flex", flexDirection: "column", gap: 26 }}>
          {/* =====================================================================
              VIEW 1: DASHBOARD VIEW
              ===================================================================== */}
          {currentView === "dashboard" && (
            <>
              {/* Hero Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #0d2138 0%, #0a192b 100%)",
                  borderRadius: 24,
                  padding: "28px 32px",
                  border: "1.5px solid rgba(245, 158, 11, 0.3)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      border: "2.5px solid #f59e0b",
                      background: "rgba(245, 158, 11, 0.15)",
                      display: "grid",
                      placeItems: "center",
                      color: "#f59e0b",
                      boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    <User size={32} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Verified Patient Portal • {profile.specialty} Practice
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", margin: "0 0 6px" }}>
                      Welcome back, <span style={{ color: "#f59e0b" }}>{patient.name}</span>
                    </h1>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                      Direct consultation access &amp; live chamber status with {doctorDisplayName}.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBookingStep(1);
                    setShowBookingModal(true);
                  }}
                  style={{
                    background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 50%, #e29418 100%)",
                    border: "none",
                    borderRadius: 14,
                    padding: "15px 26px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    boxShadow: "0 10px 25px rgba(245, 158, 11, 0.35)",
                    color: "#180e02",
                    fontWeight: 850,
                    fontSize: 14,
                  }}
                >
                  <Calendar size={20} color="#180e02" strokeWidth={2.5} />
                  <span>Book New Appointment</span>
                  <ChevronRight size={18} color="#180e02" strokeWidth={3} />
                </button>
              </div>

              {/* 3 KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div
                  onClick={() => setCurrentView("appointments")}
                  style={{
                    background: "#0a1728",
                    borderRadius: 18,
                    padding: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff" }}>{upcomingCount}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Upcoming Consultations</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0284c7", display: "grid", placeItems: "center", color: "#ffffff" }}>
                    <Calendar size={22} />
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView("appointments")}
                  style={{
                    background: "#0a1728",
                    borderRadius: 18,
                    padding: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff" }}>{completedCount}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Completed Visits</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#10b981", display: "grid", placeItems: "center", color: "#ffffff" }}>
                    <CheckCircle2 size={22} />
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView("appointments")}
                  style={{
                    background: "#0a1728",
                    borderRadius: 18,
                    padding: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff" }}>{cancelledCount}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Cancelled Bookings</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ef4444", display: "grid", placeItems: "center", color: "#ffffff" }}>
                    <XCircle size={22} />
                  </div>
                </div>
              </div>

              {/* Two Column Dashboard Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 24, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Upcoming Appointment Card */}
                  <div style={{ background: "#0a1728", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Calendar size={20} color="#f59e0b" />
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#ffffff" }}>Your Active Consultation</span>
                      </div>
                      <button
                        onClick={() => setCurrentView("appointments")}
                        style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        View All
                      </button>
                    </div>

                    {appointments.length > 0 ? (
                      <div style={{ background: "#071221", borderRadius: 16, padding: "20px", border: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(245, 158, 11, 0.15)", border: "1.5px solid #f59e0b", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                            <Stethoscope size={28} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>{appointments[0].serviceTitle}</div>
                            <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 2 }}>{appointments[0].doctorName} • {appointments[0].doctorSpecialty}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <MapPin size={12} color="#10b981" />
                              <span>{appointments[0].facilityName} ({appointments[0].chamberRoom})</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{appointments[0].date}</div>
                          <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 2 }}>{appointments[0].time}</div>
                          <span style={{ display: "inline-block", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, marginTop: 6 }}>
                            Serial: {appointments[0].tokenNumber}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#071221", borderRadius: 16, padding: "28px 20px", border: "1px dashed rgba(255, 255, 255, 0.1)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid rgba(245, 158, 11, 0.3)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                          <Calendar size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>No Active Consultation Scheduled</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>You have no upcoming visits registered with {doctorDisplayName}.</div>
                        </div>
                        <button
                          onClick={() => {
                            setBookingStep(1);
                            setShowBookingModal(true);
                          }}
                          style={{
                            background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                            border: "none",
                            borderRadius: 10,
                            padding: "9px 18px",
                            color: "#180e02",
                            fontSize: 12,
                            fontWeight: 850,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          <Calendar size={14} />
                          <span>Book Consultation Now</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6 Quick Action Grid */}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 14 }}>Quick Practice Shortcuts</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <div onClick={() => setCurrentView("appointments")} style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <Calendar size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>My Appointments</div>
                      </div>
                      <div onClick={() => setCurrentView("queue")} style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <Users size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>Live Queue</div>
                      </div>
                      <div
                        onClick={() => {
                          setBookingStep(1);
                          setShowBookingModal(true);
                        }}
                        style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                      >
                        <Calendar size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>Book Appointment</div>
                      </div>
                      <div onClick={() => setCurrentView("profile")} style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <User size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>My Profile</div>
                      </div>
                      <div onClick={() => setCurrentView("support")} style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <Headphones size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>Help & Support</div>
                      </div>
                      <div onClick={() => setShowQrModal(true)} style={{ background: "#0a1728", borderRadius: 16, padding: "16px", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <QrCode size={22} color="#f59e0b" />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>QR Check-in</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Doctor Practice & Real Chambers */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "#0a1728", borderRadius: 20, padding: "22px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 4 }}>{doctorDisplayName}</div>
                    <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{profile.customTitle || `${profile.specialty} Practice`}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{profile.yearsOfExperience} Years Clinical Experience</div>

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: 14, paddingTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Visiting Chambers</div>
                      {profile.chambers?.map((ch) => (
                        <div
                          key={ch.id}
                          onClick={() => {
                            setSelectedChamber(ch.facilityName);
                            setBookingStep(1);
                            setShowBookingModal(true);
                          }}
                          style={{
                            background: "#071221",
                            borderRadius: 10,
                            padding: "10px 12px",
                            marginBottom: 8,
                            cursor: "pointer",
                            border: "1px solid rgba(245, 158, 11, 0.15)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{ch.facilityName}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{ch.city} • {ch.visitingSchedule}</div>
                          </div>
                          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>Select &rarr;</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: 14, paddingTop: 12, fontSize: 12, color: "#cbd5e1" }}>
                      <div>Desk: <strong>{profile.publicContact?.clinicPhone || "+971 4 435 9999"}</strong></div>
                      <div style={{ marginTop: 4 }}>WhatsApp: <strong style={{ color: "#34d399" }}>{profile.publicContact?.inquiryWhatsApp || "+971 50 123 4567"}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =====================================================================
              VIEW 2: LIVE QUEUE VIEW (Same Doctor's Real Live Queue)
              ===================================================================== */}
          {currentView === "queue" && (
            <>
              {/* Title Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                    <Users size={26} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: 0 }}>
                      {doctorDisplayName}&apos;s Live Chamber Queue
                    </h1>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                      Live patient queue for {profile.chambers?.[0]?.facilityName || "Main Chamber"} • Real-time consultation status.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ background: "linear-gradient(135deg, #0e1c2e 0%, #0a1727 100%)", borderRadius: 14, padding: "10px 18px", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(245, 158, 11, 0.2)", border: "1.5px solid #f59e0b", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>
                        {patient.isLoggedIn ? `Active Patient: ${patient.name}` : "Patient Not Logged In"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {patient.isLoggedIn
                          ? (appointments.length > 0 ? `Queue Serial: ${appointments[0].tokenNumber}` : "No active queue ticket")
                          : "Enter mobile number to view queue position"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRefreshQueue}
                    style={{ background: "transparent", border: "1.5px solid #f59e0b", borderRadius: 12, padding: "10px 18px", color: "#f59e0b", fontSize: 13, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <RotateCcw size={15} style={{ animation: isRefreshingQueue ? "spin 0.6s linear infinite" : "none" }} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <div style={{ background: "#0a1728", borderRadius: 18, padding: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Your Queue Number</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
                      {appointments[0]?.tokenNumber || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginTop: 2 }}>
                      {appointments.length > 0 ? "Waiting for your turn" : "No active queue ticket"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#0a1728", borderRadius: 18, padding: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(2, 132, 199, 0.15)", display: "grid", placeItems: "center", color: "#0284c7" }}>
                    <Hourglass size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Estimated Wait Time</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
                      {appointments.length > 0 ? "~ 15 min" : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {appointments.length > 0 ? `(${doctorDisplayName})` : "Chamber Ready"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#0a1728", borderRadius: 18, padding: "20px", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "grid", placeItems: "center", color: "#10b981" }}>
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Current Serving in Chamber</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981", lineHeight: 1.1 }}>
                      {queueItems.find((q) => q.status === "Now Serving")?.queueNo || (queueItems.length > 0 ? queueItems[0].queueNo : "Desk Open")}
                    </div>
                    <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginTop: 2 }}>
                      {queueItems.length > 0 ? "Now in room" : "Chamber Ready"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#0a1728", borderRadius: 18, padding: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139, 92, 246, 0.15)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Total in {doctorDisplayName}&apos;s Queue</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>{queueItems.length}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Patients registered</div>
                  </div>
                </div>
              </div>

              {/* Table + Right Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1.1fr", gap: 24, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "#0a1728", borderRadius: 20, border: "1px solid rgba(255, 255, 255, 0.08)", padding: "22px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Users size={20} color="#f59e0b" />
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>Live Chamber Queue Table</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{doctorDisplayName} • {profile.specialty} Services</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {(["Live", "Waiting", "Completed"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setQueueFilter(tab)}
                            style={{
                              background: queueFilter === tab ? "#f59e0b" : "#0c1b2f",
                              color: queueFilter === tab ? "#07101f" : "#94a3b8",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 12px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                          <th style={{ padding: "10px 12px" }}>#</th>
                          <th style={{ padding: "10px 12px" }}>Queue No.</th>
                          <th style={{ padding: "10px 12px" }}>Patient / Booking</th>
                          <th style={{ padding: "10px 12px" }}>Doctor Service</th>
                          <th style={{ padding: "10px 12px" }}>Status</th>
                          <th style={{ padding: "10px 12px" }}>Wait Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQueue.length > 0 ? (
                          filteredQueue.map((item, idx) => (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                background: item.isUser ? "rgba(245, 158, 11, 0.08)" : item.status === "Now Serving" ? "rgba(16, 185, 129, 0.06)" : "transparent",
                                border: item.isUser ? "1.5px solid rgba(245, 158, 11, 0.45)" : "none",
                                borderRadius: 10,
                              }}
                            >
                              <td style={{ padding: "14px 12px", fontSize: 13, color: "#94a3b8" }}>{idx + 1}</td>
                              <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{item.queueNo}</td>
                              <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: item.isUser ? 800 : 600, color: item.isUser ? "#f59e0b" : "#ffffff" }}>
                                {item.customerName}
                              </td>
                              <td style={{ padding: "14px 12px", fontSize: 13, color: "#cbd5e1" }}>{item.serviceName}</td>
                              <td style={{ padding: "14px 12px" }}>
                                <span
                                  style={{
                                    background: item.status === "Now Serving" ? "#10b981" : item.status === "Next" ? "#0284c7" : "rgba(255, 255, 255, 0.08)",
                                    color: item.status === "Now Serving" ? "#07101f" : "#ffffff",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    padding: "4px 12px",
                                    borderRadius: 999,
                                  }}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 12px", fontSize: 13, color: "#94a3b8" }}>{item.waitTime}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <Users size={28} color="#64748b" />
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                                  No Patients Currently in Queue
                                </div>
                                <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 360 }}>
                                  Live queue updates automatically in real-time as patients book appointments and check into {doctorDisplayName}&apos;s chamber.
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Stay Notified Card */}
                  <div style={{ background: "#0a1728", borderRadius: 18, padding: "18px 24px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                        <Bell size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Direct Mobile Notification</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>We&apos;ll notify your mobile number when {doctorDisplayName} is ready for your consultation.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerToast(`SMS notifications active for ${patient.phone || "your mobile number"}`)}
                      style={{ background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 10, padding: "9px 18px", color: "#180e02", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      Enable Notifications
                    </button>
                  </div>
                </div>

                {/* Right Column: Your Current Booking Card */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "#0a1728", borderRadius: 20, padding: "24px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Calendar size={18} color="#f59e0b" />
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>Your Current Booking</span>
                      </div>
                      {appointments.length > 0 && (
                        <button
                          onClick={() => setShowDetailsModal(true)}
                          style={{ background: "none", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: 8, padding: "5px 12px", color: "#f59e0b", fontSize: 11, fontWeight: 750, cursor: "pointer" }}
                        >
                          View Details
                        </button>
                      )}
                    </div>

                    {appointments.length > 0 ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                          <div style={{ background: "#071221", borderRadius: 14, padding: "16px", textAlign: "center", border: "1.5px solid rgba(245, 158, 11, 0.35)" }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff" }}>{appointments[0].tokenNumber}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Your Queue Number</div>
                          </div>
                          <div style={{ background: "#071221", borderRadius: 14, padding: "16px", textAlign: "center", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff" }}>~ 15 min</div>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Estimated Wait Time</div>
                          </div>
                        </div>

                        <div style={{ padding: "14px 0", borderTop: "1px solid rgba(255, 255, 255, 0.06)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: 18 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{appointments[0].serviceTitle}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Doctor: <strong style={{ color: "#ffffff" }}>{doctorDisplayName}</strong></div>
                          <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>{appointments[0].date} • {appointments[0].time}</div>
                        </div>

                        {/* Stepper */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: 8 }}>
                            <div style={{ position: "absolute", top: 6, left: 10, right: 10, height: 2, background: "rgba(255, 255, 255, 0.12)" }} />
                            <div style={{ position: "absolute", top: 6, left: 10, width: "15%", height: 2, background: "#f59e0b" }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#f59e0b", position: "relative", zIndex: 2 }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#334155", position: "relative", zIndex: 2 }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#334155", position: "relative", zIndex: 2 }} />
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#334155", position: "relative", zIndex: 2 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600 }}>
                            <span style={{ color: "#f59e0b" }}>In Queue</span>
                            <span style={{ color: "#64748b" }}>Consultation</span>
                            <span style={{ color: "#64748b" }}>Service</span>
                            <span style={{ color: "#64748b" }}>Completed</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "16px 8px" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid rgba(245, 158, 11, 0.3)", display: "grid", placeItems: "center", color: "#f59e0b", margin: "0 auto 12px" }}>
                          <Calendar size={20} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>No Active Booking</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 16 }}>
                          You have no registered consultation with {doctorDisplayName} in today&apos;s queue.
                        </div>
                        <button
                          onClick={() => {
                            setBookingStep(1);
                            setShowBookingModal(true);
                          }}
                          style={{
                            width: "100%",
                            background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                            border: "none",
                            borderRadius: 12,
                            padding: "12px",
                            color: "#180e02",
                            fontSize: 13,
                            fontWeight: 850,
                            cursor: "pointer",
                          }}
                        >
                          Book Consultation Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =====================================================================
              VIEW 3: MY APPOINTMENTS VIEW
              ===================================================================== */}
          {currentView === "appointments" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: 0 }}>My Appointments</h1>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                    Manage and review clinical consultations with Dr. {profile.fullName}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBookingStep(1);
                    setShowBookingModal(true);
                  }}
                  style={{
                    background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 20px",
                    color: "#180e02",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  <span>Book Appointment</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {(["All", "UPCOMING", "COMPLETED", "CANCELLED"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAppointmentsFilter(tab)}
                    style={{
                      background: appointmentsFilter === tab ? "#f59e0b" : "#0c1b2f",
                      color: appointmentsFilter === tab ? "#07101f" : "#cbd5e1",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 18px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {tab === "All" ? `All (${appointments.length})` : tab}
                  </button>
                ))}
              </div>

              {/* List */}
              <div style={{ display: "grid", gap: 14 }}>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      style={{
                        background: "#0a1728",
                        borderRadius: 20,
                        padding: "24px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245, 158, 11, 0.15)", border: "1.5px solid #f59e0b", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                          <Stethoscope size={26} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{apt.serviceTitle}</span>
                            <span style={{ background: apt.status === "UPCOMING" ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.08)", color: apt.status === "UPCOMING" ? "#10b981" : "#94a3b8", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>
                              {apt.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "#f59e0b", marginTop: 2, fontWeight: 700 }}>{apt.doctorName} ({apt.doctorSpecialty})</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{apt.facilityName} • {apt.chamberRoom || "Consultation Chamber"}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{apt.date} • {apt.time}</div>
                        <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, marginTop: 4 }}>Fee: {apt.fee && !apt.fee.includes("undefined") ? apt.fee : "500 AED"}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Serial: <strong>{apt.tokenNumber}</strong></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: "#0a1728", borderRadius: 20, padding: "48px 24px", border: "1px dashed rgba(255, 255, 255, 0.12)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid rgba(245, 158, 11, 0.3)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                      <Calendar size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff" }}>No Appointments Booked Yet</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>You have no {appointmentsFilter.toLowerCase()} consultations on record with {doctorDisplayName}.</div>
                    </div>
                    <button
                      onClick={() => {
                        setBookingStep(1);
                        setShowBookingModal(true);
                      }}
                      style={{
                        background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                        border: "none",
                        borderRadius: 12,
                        padding: "12px 24px",
                        color: "#180e02",
                        fontSize: 13,
                        fontWeight: 850,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Calendar size={16} />
                      <span>Book New Appointment</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 4: MY PROFILE VIEW
              ===================================================================== */}
          {currentView === "profile" && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: "0 0 6px" }}>Patient Profile & Identity</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px" }}>
                Your clinical records and contact details for Dr. {profile.fullName}&apos;s chambers.
              </p>

              {patient.isLoggedIn ? (
                <div style={{ maxWidth: 600, background: "#0a1728", borderRadius: 20, padding: "28px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", display: "grid", placeItems: "center", color: "#07101f", fontWeight: 900, fontSize: 24 }}>
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>{patient.name}</div>
                      <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 2 }}>Patient ID: {patient.patientId}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Registered Mobile: {patient.phone}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ background: "#071221", borderRadius: 12, padding: "14px" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Full Name</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>{patient.name}</div>
                    </div>
                    <div style={{ background: "#071221", borderRadius: 12, padding: "14px" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Mobile Number (Used for Login - No OTP)</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>{patient.phone}</div>
                    </div>
                    {patient.email && (
                      <div style={{ background: "#071221", borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Email Address</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>{patient.email}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                    <button
                      onClick={() => {
                        setLoginModalMode("login");
                        setShowLoginModal(true);
                      }}
                      style={{ flex: 1, background: "rgba(245, 158, 11, 0.15)", border: "1.5px solid #f59e0b", borderRadius: 12, padding: "13px", color: "#f59e0b", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                    >
                      Switch Account
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{ flex: 1, background: "rgba(239, 68, 68, 0.15)", border: "1.5px solid rgba(239, 68, 68, 0.4)", borderRadius: 12, padding: "13px", color: "#f87171", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: 600, background: "#0a1728", borderRadius: 20, padding: "36px 28px", border: "1px dashed rgba(255, 255, 255, 0.12)", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", border: "1.5px solid #f59e0b", display: "grid", placeItems: "center", color: "#f59e0b", margin: "0 auto 16px" }}>
                    <User size={30} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", margin: "0 0 8px" }}>Patient Account Not Signed In</h3>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 22px", lineHeight: 1.5 }}>
                    Sign in with your mobile number to view personal appointment history, queue status, and clinic receipts. No OTP or password required.
                  </p>
                  <button
                    onClick={() => {
                      setLoginModalMode("login");
                      setShowLoginModal(true);
                    }}
                    style={{ background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "13px 26px", color: "#180e02", fontSize: 14, fontWeight: 850, cursor: "pointer" }}
                  >
                    Sign In with Mobile (No OTP)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 6: NOTIFICATIONS VIEW
              ===================================================================== */}
          {currentView === "notifications" && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: "0 0 6px" }}>Notifications & Queue Alerts</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px" }}>
                Real-time updates regarding your consultation queue with {doctorDisplayName}.
              </p>

              {appointments.length > 0 ? (
                <div style={{ maxWidth: 700, display: "grid", gap: 14 }}>
                  <div style={{ background: "#0a1728", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "grid", placeItems: "center", color: "#10b981", flexShrink: 0 }}>
                      <Check size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Live Queue Update: Serial {appointments[0].tokenNumber} Active</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3 }}>
                        Your consultation with {doctorDisplayName} for {appointments[0].serviceTitle} is active. Please arrive 10 minutes prior at {appointments[0].facilityName}.
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Active</div>
                    </div>
                  </div>

                  <div style={{ background: "#0a1728", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#f59e0b", flexShrink: 0 }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Appointment Confirmed: {appointments[0].date} at {appointments[0].time}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3 }}>
                        Serial {appointments[0].tokenNumber} booked at {appointments[0].facilityName}.
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Confirmed</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: 700, background: "#0a1728", borderRadius: 20, padding: "48px 24px", border: "1px dashed rgba(255, 255, 255, 0.12)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid rgba(245, 158, 11, 0.3)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                    <Bell size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>No New Notifications</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                      Real-time queue and appointment notifications will appear here once you book an appointment with {doctorDisplayName}.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 7: HELP & SUPPORT VIEW
              ===================================================================== */}
          {currentView === "support" && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: "0 0 6px" }}>Help & Clinical Support</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px" }}>
                Direct clinical and chamber inquiries for Dr. {profile.fullName}.
              </p>

              <div style={{ maxWidth: 650, display: "grid", gap: 14 }}>
                {profile.publicContact?.clinicPhone && (
                  <a
                    href={`tel:${profile.publicContact.clinicPhone}`}
                    style={{ background: "#0a1728", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                      <Phone size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Clinic Telephone Desk</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{profile.publicContact.clinicPhone}</div>
                    </div>
                  </a>
                )}

                {profile.publicContact?.inquiryWhatsApp && (
                  <a
                    href={`https://wa.me/${profile.publicContact.inquiryWhatsApp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "#0a1728", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", display: "grid", placeItems: "center", color: "#10b981" }}>
                      <Phone size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Patient WhatsApp Desk</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>{profile.publicContact.inquiryWhatsApp}</div>
                    </div>
                  </a>
                )}

                {profile.publicContact?.publicEmail && (
                  <a
                    href={`mailto:${profile.publicContact.publicEmail}`}
                    style={{ background: "#0a1728", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(56, 189, 248, 0.15)", display: "grid", placeItems: "center", color: "#38bdf8" }}>
                      <Mail size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Public Inquiries Email</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{profile.publicContact.publicEmail}</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          COMMON INTERACTIVE MODALS
          ========================================================================= */}

      {/* 1. MOBILE LOGIN / REGISTRATION MODAL (NO OTP REQUIRED!) */}
      {showLoginModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 440, background: "#0c1b2f", borderRadius: 24, padding: "32px 28px", border: "1.5px solid rgba(245, 158, 11, 0.4)", color: "#ffffff", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", border: "2px solid #f59e0b", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "#f59e0b" }}>
                <Smartphone size={28} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>
                {loginModalMode === "login" ? "Patient Mobile Sign-In" : "Register with Mobile"}
              </h3>
              <p style={{ fontSize: 12, color: "#10b981", fontWeight: 700, margin: 0 }}>
                ⚡ NO OTP REQUIRED • DIRECT INSTANT ACCESS
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: "flex", background: "#071221", borderRadius: 12, padding: 4, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setLoginModalMode("login")}
                style={{
                  flex: 1,
                  background: loginModalMode === "login" ? "#f59e0b" : "transparent",
                  color: loginModalMode === "login" ? "#07101f" : "#94a3b8",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 0",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <UserCheck size={14} />
                <span>Login with Mobile</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginModalMode("register")}
                style={{
                  flex: 1,
                  background: loginModalMode === "register" ? "#f59e0b" : "transparent",
                  color: loginModalMode === "register" ? "#07101f" : "#94a3b8",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 0",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <UserPlus size={14} />
                <span>Register with Mobile</span>
              </button>
            </div>

            {/* FORM: LOGIN WITH MOBILE (NO OTP) */}
            {loginModalMode === "login" ? (
              <form onSubmit={handleMobileLogin}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6 }}>
                    Enter Your Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+971 50 123 4567 or 01712345678"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    style={{ width: "100%", background: "#071221", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 12, padding: "12px 16px", color: "#ffffff", fontSize: 14, boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    Direct login — No SMS / OTP code will be requested.
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ width: "100%", background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "13px", color: "#180e02", fontSize: 14, fontWeight: 850, cursor: "pointer", marginBottom: 12 }}
                >
                  Sign In with Mobile (No OTP)
                </button>
              </form>
            ) : (
              /* FORM: REGISTER NEW PATIENT WITH MOBILE (NO OTP) */
              <form onSubmit={handleMobileRegister}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6 }}>
                    Full Patient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={inputFullName}
                    onChange={(e) => setInputFullName(e.target.value)}
                    style={{ width: "100%", background: "#071221", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 12, padding: "12px 16px", color: "#ffffff", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6 }}>
                    Mobile Number (Used as your Patient ID)
                  </label>
                  <input
                    type="tel"
                    placeholder="+971 50 123 4567 or 01712345678"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    style={{ width: "100%", background: "#071221", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 12, padding: "12px 16px", color: "#ffffff", fontSize: 14, boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, fontWeight: 600 }}>
                    Instant registration — No verification code or OTP needed.
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ width: "100%", background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "13px", color: "#180e02", fontSize: 14, fontWeight: 850, cursor: "pointer", marginBottom: 12 }}
                >
                  Register Instantly (No OTP)
                </button>
              </form>
            )}

            {patient.isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                style={{ width: "100%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: "11px", color: "#f87171", fontSize: 12, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <LogOut size={15} />
                <span>Log Out of Patient Device</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. BOOK NEW APPOINTMENT MODAL */}
      {showBookingModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}
          onClick={() => setShowBookingModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", background: "#0c1b2f", borderRadius: 24, padding: "28px 26px", border: "1.5px solid rgba(245, 158, 11, 0.4)", color: "#ffffff", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowBookingModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            {bookingStep === 1 && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Select Chambers</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 18px" }}>Consulting with {profile.fullName} ({profile.specialty})</p>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 8, fontWeight: 700 }}>Visiting Chamber</label>
                  <div style={{ display: "grid", gap: 10 }}>
                    {profile.chambers && profile.chambers.length > 0 ? (
                      profile.chambers.map((ch) => (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChamber(ch.facilityName)}
                          style={{
                            background: selectedChamber === ch.facilityName ? "rgba(245, 158, 11, 0.12)" : "#071221",
                            border: selectedChamber === ch.facilityName ? "1.5px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: 14,
                            padding: "16px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <MapPin size={16} color="#f59e0b" />
                              <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>{ch.facilityName}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4, fontWeight: 700 }}>{ch.city}</div>
                            {ch.visitingSchedule && (
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                                <Clock size={13} color="#94a3b8" />
                                <span>{ch.visitingSchedule}</span>
                              </div>
                            )}
                          </div>
                          {selectedChamber === ch.facilityName && <CheckCircle2 size={22} color="#f59e0b" />}
                        </div>
                      ))
                    ) : (
                      <div style={{ background: "#071221", borderRadius: 14, padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                        No chamber registered yet.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, color: "#cbd5e1", display: "block", marginBottom: 6, fontWeight: 700 }}>Consultation Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ width: "100%", background: "#071221", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 12, padding: "12px", color: "#ffffff", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                {/* Serial-Based Chamber Visit Notice (NO TIME SLOTS) */}
                <div style={{ marginBottom: 20, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.28)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Stethoscope size={16} color="#f59e0b" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        In-Person Chamber Visit
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, background: "#f59e0b", color: "#000", padding: "2px 8px", borderRadius: 6 }}>
                      SERIAL-BASED ONLY
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: "#ffffff", marginBottom: 3 }}>
                    Chamber Serial Consultation (No Time Slots)
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>
                    Patients are examined sequentially in Chamber by assigned Serial Token. Visiting hours: {profile.chambers?.find(c => c.facilityName === selectedChamber)?.visitingSchedule || "Daily 06:00 PM – 10:00 PM"}.
                  </div>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedChamber}
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px",
                    color: "#180e02",
                    fontSize: 14,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  Confirm &amp; Get Chamber Serial
                </button>
              </div>
            )}

            {bookingStep === 2 && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981", display: "grid", placeItems: "center", margin: "0 auto 18px", color: "#10b981" }}>
                  <Check size={36} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#ffffff" }}>Chamber Serial Confirmed!</h3>
                <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 22px" }}>Your in-person chamber consultation serial has been reserved.</p>

                <div style={{ background: "linear-gradient(135deg, #091a2e 0%, #061322 100%)", border: "2px dashed #f59e0b", borderRadius: 20, padding: "22px", marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", letterSpacing: "0.08em" }}>YOUR CHAMBER SERIAL NUMBER</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: "#ffffff", margin: "8px 0" }}>{bookingSuccessToken}</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>Chamber Consultation • {selectedDate}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Facility: {selectedChamber}</div>
                </div>

                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingStep(1);
                  }}
                  style={{ width: "100%", background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "14px", color: "#180e02", fontSize: 14, fontWeight: 850, cursor: "pointer" }}
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QR FAST CHECK-IN MODAL */}
      {showQrModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 400, background: "#0c1b2f", borderRadius: 24, padding: "28px", border: "1.5px solid rgba(245, 158, 11, 0.4)", color: "#ffffff", textAlign: "center", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Patient Fast Check-in QR</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>Present at clinic reception desk upon arrival.</p>

            {appointments.length > 0 ? (
              <>
                <div style={{ background: "#ffffff", borderRadius: 20, padding: "24px", display: "inline-block", marginBottom: 18 }}>
                  <div style={{ width: 180, height: 180, background: "#07101f", borderRadius: 14, display: "grid", placeItems: "center", color: "#f59e0b" }}>
                    <QrCode size={140} color="#f59e0b" />
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b" }}>{patient.name || "Verified Patient"}</div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>Serial: {appointments[0].tokenNumber} • {doctorDisplayName}</div>
              </>
            ) : (
              <div style={{ padding: "16px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid rgba(245, 158, 11, 0.3)", display: "grid", placeItems: "center", color: "#f59e0b", margin: "0 auto 14px" }}>
                  <QrCode size={26} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>No Active Appointment</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, marginBottom: 18 }}>
                  Book a consultation with {doctorDisplayName} to generate your clinical reception check-in QR pass.
                </div>
                <button
                  onClick={() => {
                    setShowQrModal(false);
                    setBookingStep(1);
                    setShowBookingModal(true);
                  }}
                  style={{ width: "100%", background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "12px", color: "#180e02", fontSize: 13, fontWeight: 850, cursor: "pointer" }}
                >
                  Book Appointment Now
                </button>
              </div>
            )}

            <button
              onClick={() => setShowQrModal(false)}
              style={{ marginTop: 20, width: "100%", background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: 12, padding: "13px", color: "#ffffff", fontSize: 14, fontWeight: 750, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW DETAILS MODAL */}
      {showDetailsModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 440, background: "#0c1b2f", borderRadius: 24, padding: "28px", border: "1.5px solid rgba(245, 158, 11, 0.4)", color: "#ffffff", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDetailsModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 16px" }}>Booking & Queue Details</h3>
            {appointments.length > 0 ? (
              <div style={{ background: "#071221", borderRadius: 16, padding: "18px", marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Queue Number</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{appointments[0].tokenNumber}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>Practitioner</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{doctorDisplayName} ({profile.specialty})</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>Scheduled Time</div>
                <div style={{ fontSize: 14, color: "#ffffff", marginTop: 2 }}>{appointments[0].date} • {appointments[0].time}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>Chamber Facility</div>
                <div style={{ fontSize: 14, color: "#ffffff", marginTop: 2 }}>{appointments[0].facilityName}</div>
              </div>
            ) : (
              <div style={{ background: "#071221", borderRadius: 16, padding: "24px 18px", textAlign: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>No Active Booking</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>You do not have any registered visits today.</div>
              </div>
            )}

            <button
              onClick={() => setShowDetailsModal(false)}
              style={{ width: "100%", background: "linear-gradient(90deg, #f7ce68 0%, #f5af3b 100%)", border: "none", borderRadius: 12, padding: "13px", color: "#180e02", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
