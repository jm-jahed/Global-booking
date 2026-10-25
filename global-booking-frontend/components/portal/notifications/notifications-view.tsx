"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Search,
  Settings,
  Calendar,
  Activity,
  User,
  Shield,
  CreditCard,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Volume2,
  Building2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  type NotificationCategory,
  type NotificationItem,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./notification-types";
import { NotificationPreferencesModal } from "./notification-preferences-modal";
import { playNotificationChime } from "./notification-sound";
import {
  getStoredPortalUser,
  getDoctorProfile,
  getDoctorNotifications,
  updateNotificationReadStatus,
  markAllNotificationsAsRead,
  deleteDoctorNotification,
  clearAllReadNotifications,
  getDoctorNotificationPreferences,
  updateDoctorNotificationPreferences,
  type DoctorChamberDetail,
  type BackendNotificationItem,
} from "@/lib/api/admin-client";

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedChamber, setSelectedChamber] = useState("All Chambers");
  const [selectedPriority, setSelectedPriority] = useState<"All" | "urgent" | "normal">("All");

  const [doctorName, setDoctorName] = useState("Dr. Jahedul Islam");
  const [doctorSpecialty, setDoctorSpecialty] = useState("Cardiologist & Electrophysiologist");
  const [chambers, setChambers] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isStaffUser, setIsStaffUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [totalCount, setTotalCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Initial Doctor Info & Preferences
  useEffect(() => {
    try {
      const user = getStoredPortalUser();
      if (user) {
        if (user.role === "STAFF") {
          setIsStaffUser(true);
        }
        if (user.fullName || user.name) setDoctorName(user.fullName || user.name);
        if (user.specialty) setDoctorSpecialty(user.specialty);
      }
    } catch {}

    // Load Doctor Profile for chambers
    getDoctorProfile()
      .then((res) => {
        if (res?.doctor) {
          if (res.doctor.fullName) setDoctorName(res.doctor.fullName);
          if (res.doctor.specialty) setDoctorSpecialty(res.doctor.specialty);
          if (Array.isArray(res.doctor.chambers) && res.doctor.chambers.length > 0) {
            const chamberNames = res.doctor.chambers
              .map((c: DoctorChamberDetail) => c.facilityName || c.address || "")
              .filter(Boolean);
            if (chamberNames.length > 0) {
              setChambers(chamberNames);
            }
          }
        }
      })
      .catch(() => {});

    // Load Backend Preferences
    getDoctorNotificationPreferences()
      .then((res) => {
        if (res?.preferences) {
          setPreferences({
            soundAlerts: res.preferences.soundAlerts ?? true,
            browserPush: res.preferences.browserPush ?? true,
            queueAlerts: res.preferences.queueAlerts ?? true,
            appointmentAlerts: res.preferences.appointmentAlerts ?? true,
            whatsappAlerts: res.preferences.whatsappAlerts ?? true,
            smsAlerts: res.preferences.smsAlerts ?? true,
            emailDigest: res.preferences.emailDigest ?? false,
            securityAlerts: res.preferences.securityAlerts ?? true,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Notifications from Real Backend API
  const fetchNotifications = useCallback(
    async (pageToFetch: number = 1) => {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await getDoctorNotifications({
          page: pageToFetch,
          limit: pageSize,
          category: activeCategory !== "all" ? activeCategory : undefined,
          chamber: selectedChamber !== "All Chambers" ? selectedChamber : undefined,
          priority: selectedPriority !== "All" ? selectedPriority : undefined,
          search: debouncedSearch || undefined,
        });

        const items: NotificationItem[] = (res.notifications || []).map((item: BackendNotificationItem) => ({
          id: item.id,
          type: item.type,
          priority: item.priority,
          title: item.title,
          message: item.message,
          timestamp: item.timestamp,
          relativeTime: item.relativeTime,
          dateGroup: item.dateGroup,
          read: item.read,
          chamber: item.chamber,
          patientName: item.patientName,
          patientPhone: item.patientPhone,
          tokenNumber: item.tokenNumber,
          actionLink: item.actionLink,
          actionLabel: item.actionLabel,
        }));

        setNotifications(items);
        if (res.pagination) {
          setTotalCount(res.pagination.total ?? items.length);
          setUnreadCount(res.pagination.unreadCount ?? items.filter((n) => !n.read).length);
          setTotalPages(Math.max(1, res.pagination.totalPages ?? 1));
          setCurrentPage(res.pagination.page ?? pageToFetch);

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("gb_notifications_updated", {
                detail: { unreadCount: res.pagination.unreadCount },
              })
            );
          }
        }
      } catch (err: any) {
        setApiError(err?.message || "Failed to load notifications from database. Please check your network connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, activeCategory, selectedChamber, selectedPriority, debouncedSearch]
  );

  // Re-fetch when filters or debounced search change
  useEffect(() => {
    fetchNotifications(currentPage);
  }, [fetchNotifications, currentPage]);

  // Short Polling (every 45s) compatible with existing architecture
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(currentPage);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications, currentPage]);

  // Handle Save Preferences to MongoDB
  const handleSavePreferences = async (updated: NotificationPreferences) => {
    if (isStaffUser) {
      setToastMessage("Only supervising Doctors can update practice preferences.");
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    setIsSavingPreferences(true);
    try {
      const res = await updateDoctorNotificationPreferences(updated);
      if (res.preferences) {
        setPreferences({
          soundAlerts: res.preferences.soundAlerts ?? true,
          browserPush: res.preferences.browserPush ?? true,
          queueAlerts: res.preferences.queueAlerts ?? true,
          appointmentAlerts: res.preferences.appointmentAlerts ?? true,
          whatsappAlerts: res.preferences.whatsappAlerts ?? true,
          smsAlerts: res.preferences.smsAlerts ?? true,
          emailDigest: res.preferences.emailDigest ?? false,
          securityAlerts: res.preferences.securityAlerts ?? true,
        });
      }
      setToastMessage("Practice notification preferences saved to database.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to save preferences to database.");
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Toggle single item read status on backend
  const handleToggleRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const nextRead = !target.read;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: nextRead } : n))
    );
    const newUnread = Math.max(0, unreadCount + (nextRead ? -1 : 1));
    setUnreadCount(newUnread);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gb_notifications_updated", { detail: { unreadCount: newUnread } })
      );
    }

    if (nextRead && preferences.soundAlerts) {
      playNotificationChime("success");
    }

    try {
      await updateNotificationReadStatus(id, nextRead);
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: target.read } : n))
      );
      setUnreadCount(unreadCount);
      setToastMessage("Failed to update notification read status on server.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Mark all as read on backend
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    const prevItems = [...notifications];
    const prevUnread = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gb_notifications_updated", { detail: { unreadCount: 0 } })
      );
    }

    if (preferences.soundAlerts) {
      playNotificationChime("success");
    }

    try {
      const res = await markAllNotificationsAsRead();
      setToastMessage(`Marked ${res.modifiedCount ?? prevUnread} alerts as read.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setNotifications(prevItems);
      setUnreadCount(prevUnread);
      setToastMessage("Failed to mark all as read on server.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Dismiss single notification on backend
  const handleDismiss = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    const prevItems = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read) {
      const nextUnread = Math.max(0, unreadCount - 1);
      setUnreadCount(nextUnread);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("gb_notifications_updated", { detail: { unreadCount: nextUnread } })
        );
      }
    }
    setTotalCount((prev) => Math.max(0, prev - 1));

    try {
      await deleteDoctorNotification(id);
      setToastMessage("Notification dismissed.");
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      setNotifications(prevItems);
      setToastMessage("Failed to dismiss notification on server.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Clear all read notifications on backend
  const handleClearRead = async () => {
    const readCount = notifications.filter((n) => n.read).length;
    if (readCount === 0) {
      setToastMessage("No read notifications to clear.");
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    try {
      const res = await clearAllReadNotifications();
      setToastMessage(`Cleared ${res.deletedCount ?? readCount} read notifications.`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchNotifications(1);
    } catch {
      setToastMessage("Failed to clear read notifications on server.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Group current page notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationItem[] } = {
      Today: [],
      Yesterday: [],
      "Earlier This Week": [],
    };

    notifications.forEach((item) => {
      if (groups[item.dateGroup]) {
        groups[item.dateGroup].push(item);
      } else {
        groups["Earlier This Week"].push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [notifications]);

  // Category counts from current notifications (or indicators)
  const queueCount = notifications.filter((n) => n.type === "queue").length;
  const appointmentCount = notifications.filter((n) => n.type === "appointment").length;
  const patientCount = notifications.filter((n) => n.type === "patient").length;
  const systemCount = notifications.filter((n) => n.type === "system").length;
  const billingCount = notifications.filter((n) => n.type === "billing").length;

  // Icon selector
  const getCategoryIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "appointment":
        return <Calendar size={18} color="#10b981" />;
      case "queue":
        return <Activity size={18} color="#38bdf8" />;
      case "patient":
        return <User size={18} color="#a855f7" />;
      case "system":
        return <Shield size={18} color="#f59e0b" />;
      case "billing":
        return <CreditCard size={18} color="#e5b869" />;
      default:
        return <Bell size={18} color="#e5b869" />;
    }
  };

  const getCategoryTheme = (type: NotificationItem["type"]) => {
    switch (type) {
      case "appointment":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
          text: "#10b981",
          label: "Appointment",
        };
      case "queue":
        return {
          bg: "rgba(56, 189, 248, 0.12)",
          border: "rgba(56, 189, 248, 0.3)",
          text: "#38bdf8",
          label: "Live Queue",
        };
      case "patient":
        return {
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.3)",
          text: "#c084fc",
          label: "Patient",
        };
      case "system":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
          text: "#fbbf24",
          label: "Security & System",
        };
      case "billing":
        return {
          bg: "rgba(229, 184, 105, 0.14)",
          border: "rgba(229, 184, 105, 0.35)",
          text: "#e5b869",
          label: "Billing",
        };
    }
  };

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 16px 100px",
        color: "#ffffff",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* 1. TOP HEADER SECTION */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 50,
              height: 50,
              minWidth: 50,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(229,184,105,0.22) 0%, rgba(229,184,105,0.06) 100%)",
              border: "1px solid rgba(229,184,105,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              boxShadow: "0 4px 18px rgba(229,184,105,0.15)",
            }}
          >
            <Bell size={26} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#ffffff", letterSpacing: "-0.01em" }}>
                Practice Notifications
              </h1>
              {unreadCount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: "rgba(229,184,105,0.18)",
                    color: "#f3c87a",
                    border: "1px solid rgba(229,184,105,0.4)",
                    padding: "3px 10px",
                    borderRadius: 20,
                    boxShadow: "0 0 10px rgba(229,184,105,0.2)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#e5b869",
                      boxShadow: "0 0 8px #e5b869",
                    }}
                  />
                  {unreadCount} Unread
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(16,185,129,0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16,185,129,0.3)",
                    padding: "2px 8px",
                    borderRadius: 16,
                  }}
                >
                  <CheckCircle2 size={12} />
                  All Caught Up
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              {doctorName} • {doctorSpecialty} • Real-time clinical events & practice triggers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchNotifications(currentPage)}
            disabled={isLoading}
            title="Refresh notifications from server"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* Mark All Read */}
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              background: unreadCount > 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
              border: unreadCount > 0 ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid rgba(255, 255, 255, 0.06)",
              color: unreadCount > 0 ? "#ffffff" : "#64748b",
              cursor: unreadCount > 0 ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
          >
            <CheckCheck size={16} color={unreadCount > 0 ? "#10b981" : "#64748b"} />
            <span>Mark All as Read</span>
          </button>

          {/* Preferences Button */}
          <button
            type="button"
            onClick={() => setIsPreferencesOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              background: "linear-gradient(135deg, rgba(229,184,105,0.18) 0%, rgba(229,184,105,0.06) 100%)",
              border: "1px solid rgba(229,184,105,0.4)",
              color: "#e5b869",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Settings size={15} />
            <span>Channels & Preferences</span>
          </button>
        </div>
      </header>

      {/* TOAST NOTICE */}
      {toastMessage && (
        <div
          style={{
            background: "rgba(16,185,129,0.14)",
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#6ee7b7",
            padding: "10px 16px",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* API ERROR BANNER WITH RETRY */}
      {apiError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={20} color="#f87171" />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fca5a5" }}>
                Backend Connection Error
              </div>
              <div style={{ fontSize: 12, color: "#fecaca", marginTop: 2 }}>
                {apiError}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchNotifications(currentPage)}
            style={{
              background: "rgba(239, 68, 68, 0.25)",
              border: "1px solid rgba(239, 68, 68, 0.6)",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. KPI METRICS CARDS (4 CARDS) */}
      <section
        aria-label="Notification Overview"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Alerts */}
        <div
          style={{
            background: "#0b1325",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Alerts
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(229,184,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={15} color="#e5b869" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff" }}>
            {totalCount}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#10b981", fontWeight: 700 }}>● MongoDB Backed</span>
            <span>Across all practice rosters</span>
          </div>
        </div>

        {/* Card 2: Unread Messages */}
        <div
          style={{
            background: "#0b1325",
            border: unreadCount > 0 ? "1px solid rgba(229, 184, 105, 0.45)" : "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: unreadCount > 0 ? "0 4px 20px rgba(229,184,105,0.12)" : "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#e5b869", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Unread Alerts
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(229,184,105,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} color="#e5b869" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#e5b869" }}>
            {unreadCount}
          </div>
          <div style={{ fontSize: 11, color: "#f3c87a", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <span>{unreadCount > 0 ? "Requires practice attention" : "All clear & acknowledged"}</span>
          </div>
        </div>

        {/* Card 3: Live Queue & Tokens */}
        <div
          style={{
            background: "#0b1325",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Queue Events
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(56,189,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff" }}>
            {queueCount}
          </div>
          <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Token calls & chamber triggers</span>
          </div>
        </div>

        {/* Card 4: Appointments & Visits */}
        <div
          style={{
            background: "#0b1325",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Appointments
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={15} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff" }}>
            {appointmentCount}
          </div>
          <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Public bookings & slot requests</span>
          </div>
        </div>
      </section>

      {/* 3. FILTER TOOLBAR & CONTROLS */}
      <section
        style={{
          background: "#0b1325",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Row 1: Search + Chamber Selector + Priority Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by patient, token, keyword..."
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 10,
                padding: "9px 34px 9px 36px",
                color: "#ffffff",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <Search
              size={15}
              color="#94a3b8"
              style={{ position: "absolute", left: 12, top: 11 }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 9,
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Chamber Selector & Action Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {chambers.length > 0 && (
              <div style={{ position: "relative" }}>
                <select
                  value={selectedChamber}
                  onChange={(e) => {
                    setSelectedChamber(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    padding: "9px 32px 9px 12px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    outline: "none",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  <option value="All Chambers" style={{ background: "#0b1325", color: "#fff" }}>
                    All Chambers & Clinics
                  </option>
                  {chambers.map((chamber) => (
                    <option key={chamber} value={chamber} style={{ background: "#0b1325", color: "#fff" }}>
                      {chamber}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  color="#e5b869"
                  style={{ position: "absolute", right: 10, top: 12, pointerEvents: "none" }}
                />
              </div>
            )}

            {/* Priority Selector */}
            <div style={{ position: "relative" }}>
              <select
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value as "All" | "urgent" | "normal");
                  setCurrentPage(1);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  padding: "9px 32px 9px 12px",
                  color: "#ffffff",
                  fontSize: 12.5,
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="All" style={{ background: "#0b1325", color: "#fff" }}>
                  All Priorities
                </option>
                <option value="urgent" style={{ background: "#0b1325", color: "#f87171" }}>
                  Urgent Only
                </option>
                <option value="normal" style={{ background: "#0b1325", color: "#fff" }}>
                  Normal Priority
                </option>
              </select>
              <ChevronDown
                size={14}
                color="#e5b869"
                style={{ position: "absolute", right: 10, top: 12, pointerEvents: "none" }}
              />
            </div>

            {/* Clear Read Button */}
            <button
              type="button"
              onClick={handleClearRead}
              title="Clear all read alerts"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
              <span>Clear Read</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          {[
            { id: "all", label: "All Alerts" },
            { id: "unread", label: "Unread", badgeCount: unreadCount },
            { id: "queue", label: "Live Queue" },
            { id: "appointment", label: "Appointments" },
            { id: "patient", label: "Patients" },
            { id: "system", label: "Security & System" },
            { id: "billing", label: "Billing" },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id as NotificationCategory);
                  setCurrentPage(1);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? "linear-gradient(135deg, rgba(229,184,105,0.25) 0%, rgba(229,184,105,0.12) 100%)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isActive
                    ? "1px solid rgba(229,184,105,0.45)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                  color: isActive ? "#e5b869" : "#94a3b8",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: isActive ? "#e5b869" : "rgba(229,184,105,0.25)",
                      color: isActive ? "#060b13" : "#e5b869",
                    }}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. NOTIFICATIONS LIST SECTION */}
      <section aria-label="Notifications List">
        {isLoading && notifications.length === 0 ? (
          /* LOADING SKELETON */
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 16,
              padding: "48px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "3px solid rgba(229, 184, 105, 0.2)",
                borderTopColor: "#e5b869",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 600 }}>
              Loading practice notifications from database...
            </div>
          </div>
        ) : notifications.length === 0 ? (
          /* HONEST EMPTY STATE (ZERO FAKE RECORDS) */
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 16,
              padding: "54px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(229, 184, 105, 0.12)",
                border: "1px solid rgba(229, 184, 105, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
                marginBottom: 16,
              }}
            >
              <Bell size={28} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
              {activeCategory === "unread"
                ? "You're All Caught Up!"
                : activeCategory !== "all" || debouncedSearch || selectedChamber !== "All Chambers" || selectedPriority !== "All"
                ? "No Notifications Match Filter"
                : "No Practice Notifications Yet"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8", maxWidth: 440, lineHeight: 1.5 }}>
              {activeCategory === "unread"
                ? "There are no unread notifications for your practice. All current patient and chamber events have been acknowledged."
                : activeCategory !== "all" || debouncedSearch || selectedChamber !== "All Chambers" || selectedPriority !== "All"
                ? "No practice notifications match your current filter criteria. Try resetting filters or searching with another keyword."
                : "Real practice alerts will appear here when appointments are booked by patients, tickets are called in the live queue, or staff accounts are created."}
            </p>
            {(activeCategory !== "all" || debouncedSearch || selectedChamber !== "All Chambers" || selectedPriority !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                  setSelectedChamber("All Chambers");
                  setSelectedPriority("All");
                  setCurrentPage(1);
                }}
                style={{
                  background: "rgba(229, 184, 105, 0.15)",
                  border: "1px solid rgba(229, 184, 105, 0.4)",
                  color: "#e5b869",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          /* GROUPED NOTIFICATION CARDS */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {groupedNotifications.map(([dateGroup, items]) => (
              <div key={dateGroup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Date Group Heading */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#e5b869",
                    }}
                  >
                    {dateGroup}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: "rgba(255, 255, 255, 0.08)",
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {items.length} {items.length === 1 ? "alert" : "alerts"}
                  </span>
                </div>

                {/* Items in this group */}
                {items.map((item) => {
                  const theme = getCategoryTheme(item.type);
                  return (
                    <article
                      key={item.id}
                      onClick={() => handleToggleRead(item.id)}
                      style={{
                        background: item.read ? "#0b1325" : "linear-gradient(135deg, #0e1933 0%, #0b1325 100%)",
                        border: item.read
                          ? "1px solid rgba(255, 255, 255, 0.06)"
                          : "1px solid rgba(229, 184, 105, 0.35)",
                        borderRadius: 14,
                        padding: "16px 18px",
                        boxShadow: item.read
                          ? "0 3px 12px rgba(0,0,0,0.2)"
                          : "0 6px 24px rgba(229,184,105,0.08), 0 2px 10px rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        position: "relative",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Left Category Icon with Glowing Ring */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          minWidth: 40,
                          borderRadius: 12,
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {getCategoryIcon(item.type)}
                      </div>

                      {/* Main Details Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {/* Unread Glow Dot */}
                            {!item.read && (
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "#e5b869",
                                  boxShadow: "0 0 8px #e5b869",
                                  display: "inline-block",
                                }}
                                title="Unread alert"
                              />
                            )}

                            <h4
                              style={{
                                margin: 0,
                                fontSize: 14.5,
                                fontWeight: item.read ? 600 : 700,
                                color: item.read ? "#cbd5e1" : "#ffffff",
                              }}
                            >
                              {item.title}
                            </h4>

                            {/* Priority Badge */}
                            {item.priority === "urgent" && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "2px 7px",
                                  borderRadius: 8,
                                  background: "rgba(239, 68, 68, 0.16)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  textTransform: "uppercase",
                                }}
                              >
                                Urgent
                              </span>
                            )}

                            {/* Category Tag */}
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: "1px 8px",
                                borderRadius: 8,
                                background: theme.bg,
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              {theme.label}
                            </span>
                          </div>

                          {/* Relative Timestamp */}
                          <span
                            style={{
                              fontSize: 11.5,
                              color: item.read ? "#64748b" : "#e5b869",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontWeight: item.read ? 400 : 600,
                            }}
                          >
                            <Clock size={12} />
                            <span>{item.relativeTime}</span>
                          </span>
                        </div>

                        {/* Message Description */}
                        <p
                          style={{
                            margin: "0 0 10px",
                            fontSize: 13,
                            color: item.read ? "#94a3b8" : "#e2e8f0",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.message}
                        </p>

                        {/* Metadata Tags & Action Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          {/* Chamber & Patient Info */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "#94a3b8" }}>
                            {item.chamber && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Building2 size={12} color="#e5b869" />
                                <span>{item.chamber}</span>
                              </div>
                            )}

                            {item.tokenNumber && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#38bdf8", fontWeight: 700 }}>
                                <Activity size={12} />
                                <span>Token {item.tokenNumber}</span>
                              </div>
                            )}

                            {item.patientName && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#c084fc", fontWeight: 600 }}>
                                <User size={12} />
                                <span>{item.patientName}</span>
                              </div>
                            )}

                            {item.patientPhone && (
                              <span style={{ color: "#64748b" }}>{item.patientPhone}</span>
                            )}
                          </div>

                          {/* Quick Navigation Action & Dismiss */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.actionLink && (
                              <Link
                                href={item.actionLink}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "rgba(229, 184, 105, 0.12)",
                                  border: "1px solid rgba(229, 184, 105, 0.35)",
                                  color: "#e5b869",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <span>{item.actionLabel || "View"}</span>
                                <ExternalLink size={11} />
                              </Link>
                            )}

                            {/* Mark Read/Unread Icon Toggle */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleRead(item.id, e)}
                              title={item.read ? "Mark as unread" : "Mark as read"}
                              style={{
                                background: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                color: item.read ? "#64748b" : "#10b981",
                                padding: "4px 8px",
                                borderRadius: 8,
                                fontSize: 11,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>{item.read ? "Unread" : "Read"}</span>
                            </button>

                            {/* Dismiss / Delete */}
                            <button
                              type="button"
                              onClick={(e) => handleDismiss(item.id, e)}
                              title="Dismiss notification"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#64748b",
                                padding: "4px 6px",
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "#0b1325",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 14,
                  marginTop: 10,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  Showing Page <strong style={{ color: "#ffffff" }}>{currentPage}</strong> of{" "}
                  <strong style={{ color: "#ffffff" }}>{totalPages}</strong> ({totalCount} total alerts)
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: currentPage <= 1 ? "#64748b" : "#ffffff",
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: currentPage >= totalPages ? "#64748b" : "#ffffff",
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. PREFERENCES MODAL */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        isStaff={isStaffUser}
        isSaving={isSavingPreferences}
      />
    </div>
  );
}
