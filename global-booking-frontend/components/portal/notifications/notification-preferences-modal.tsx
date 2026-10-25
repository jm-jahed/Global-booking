"use client";

import { useEffect, useState } from "react";
import {
  X,
  Volume2,
  Bell,
  MessageSquare,
  Mail,
  Shield,
  Activity,
  Calendar,
  Smartphone,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./notification-types";
import { playNotificationChime } from "./notification-sound";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSavePreferences: (updated: NotificationPreferences) => void;
  isStaff?: boolean;
  isSaving?: boolean;
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
  preferences: initialPreferences,
  onSavePreferences,
  isStaff = false,
  isSaving = false,
}: NotificationPreferencesModalProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setPrefs(initialPreferences);
  }, [initialPreferences, isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestChime = () => {
    setIsPlayingTestSound(true);
    playNotificationChime("urgent");
    setTimeout(() => setIsPlayingTestSound(false), 600);
  };

  const handleSave = () => {
    onSavePreferences(prefs);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(4, 7, 14, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "linear-gradient(145deg, #0d1527 0%, #060a14 100%)",
          border: "1.5px solid rgba(229, 184, 105, 0.35)",
          borderRadius: "18px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(229, 184, 105, 0.12)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          color: "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(229, 184, 105, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
                border: "1px solid rgba(229,184,105,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <Bell size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#ffffff" }}>
                Notification Channels & Preferences
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Control live sound alerts, patient communication, and digest reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Phase 1 Integration Scope Banner */}
          <div
            style={{
              background: isStaff ? "rgba(245, 158, 11, 0.12)" : "rgba(56, 189, 248, 0.08)",
              border: isStaff ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 12,
              lineHeight: 1.5,
              color: isStaff ? "#fcd34d" : "#bae6fd",
            }}
          >
            {isStaff ? (
              <div>
                <strong>Staff Permission Notice:</strong> You are logged in as a Staff member. Practice notification routing preferences can only be modified by the supervising Doctor. Viewing in read-only mode.
              </div>
            ) : (
              <div>
                <strong>Phase 1 Integration Notice:</strong> Preferences establish practice notification routing rules and are saved directly to your MongoDB doctor profile. Outbound SMS, WhatsApp, and Push carrier delivery gateways remain deferred in Phase 1; live sound chimes and in-portal alerts are active.
              </div>
            )}
          </div>

          {/* Section 1: Audio & Sound Alerts */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#e5b869",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Sound & Audio Feedback</span>
              <button
                type="button"
                onClick={handleTestChime}
                style={{
                  background: isPlayingTestSound
                    ? "rgba(229, 184, 105, 0.3)"
                    : "rgba(229, 184, 105, 0.12)",
                  border: "1px solid rgba(229, 184, 105, 0.4)",
                  color: "#e5b869",
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s ease",
                }}
              >
                <Volume2 size={13} />
                <span>{isPlayingTestSound ? "Playing..." : "Test Chime"}</span>
              </button>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Volume2 size={20} color={prefs.soundAlerts ? "#e5b869" : "#64748b"} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                    Chamber & Queue Call Chimes
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Plays a crisp dual-tone acoustic chime when next token is called or high-priority alert arrives.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle("soundAlerts")}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: prefs.soundAlerts
                    ? "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)"
                    : "rgba(255, 255, 255, 0.12)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: prefs.soundAlerts ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#060b13",
                    transition: "left 0.2s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Clinical Practice Alert Triggers */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#e5b869",
                marginBottom: 10,
              }}
            >
              Practice Trigger Rules
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Queue Alerts */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Activity size={18} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      Live Queue & Serial Token Updates
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Instant banners when patients arrive, check-in, or complete their visit.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("queueAlerts")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.queueAlerts ? "#38bdf8" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.queueAlerts ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>

              {/* Appointment Alerts */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Calendar size={18} color="#10b981" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      New Appointments & Reschedules
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Alerts for incoming public bookings, chamber slot selections, and cancellations.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("appointmentAlerts")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.appointmentAlerts ? "#10b981" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.appointmentAlerts ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>

              {/* Security Alerts */}
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Shield size={18} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      Staff & Security Alerts
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Alerts for new staff logins, permission modifications, or password resets.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("securityAlerts")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.securityAlerts ? "#f59e0b" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.securityAlerts ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Patient Communication Outbound Dispatch */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#e5b869",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span>Outbound Patient Channels</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#94a3b8",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textTransform: "none",
                  letterSpacing: "normal",
                }}
              >
                Routing Policy • Gateway Delivery Deferred in Phase 1
              </span>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* WhatsApp */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <MessageSquare size={18} color="#22c55e" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      WhatsApp Instant Receipts & Live Token Links
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Sends patient real-time queue tracker link when token is booked.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("whatsappAlerts")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.whatsappAlerts ? "#22c55e" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.whatsappAlerts ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>

              {/* SMS Gateway */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Smartphone size={18} color="#a855f7" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      SMS Gateway Delivery
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Standard SMS reminders sent 2 hours prior to scheduled consultation.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("smsAlerts")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.smsAlerts ? "#a855f7" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.smsAlerts ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>

              {/* Email Digest */}
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Mail size={18} color="#e5b869" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>
                      Daily End-of-Day Practice Summary
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      Consolidated PDF summary of completed patient visits and revenue.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("emailDigest")}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: prefs.emailDigest ? "#e5b869" : "rgba(255, 255, 255, 0.12)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: prefs.emailDigest ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#060b13",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={13} />
            <span>Restore Defaults</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isStaff || isSaving}
              style={{
                background: isStaff
                  ? "rgba(255, 255, 255, 0.08)"
                  : "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                border: "none",
                color: isStaff ? "#64748b" : "#060b13",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: isStaff || isSaving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isStaff ? "none" : "0 4px 14px rgba(229, 184, 105, 0.25)",
                opacity: isStaff ? 0.6 : 1,
              }}
              title={isStaff ? "Only Doctors can update practice preferences" : undefined}
            >
              {savedNotice ? <Check size={16} strokeWidth={2.8} /> : null}
              <span>
                {isStaff
                  ? "Doctor Account Only"
                  : isSaving
                  ? "Saving..."
                  : savedNotice
                  ? "Preferences Saved!"
                  : "Save Preferences"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
