"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Calendar,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Menu,
  X,
  Globe,
  RotateCcw,
} from "lucide-react";
import { getStoredPortalUser, getStoredAccountType, getAdminMe } from "@/lib/api/admin-client";
import {
  getStoredPortalDate,
  setStoredPortalDate,
  formatPortalDateInfo,
} from "@/lib/utils/portal-date";
import { shiftDateIso, getChamberBusinessDate } from "@/lib/utils/timezone";

import type { PortalAccountType } from "./portal-sidebar";

export interface PortalTopBarProps {
  readonly accountType?: PortalAccountType;
  readonly currentUser?: any;
  readonly isMobileSidebarOpen?: boolean;
  readonly onToggleMobileSidebar?: () => void;
}

export function PortalTopBar({
  accountType: propAccountType,
  currentUser: propUser,
  isMobileSidebarOpen = false,
  onToggleMobileSidebar,
}: PortalTopBarProps = {}) {
  const [searchValue, setSearchValue] = useState("");
  const [userProfile, setUserProfile] = useState<{
    name: string;
    role: string;
    email?: string;
    avatar?: string;
  }>({
    name: "Doctor Practice",
    role: "Licensed Physician",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
  });

  useEffect(() => {
    if (propUser) {
      setUserProfile({
        name:
          propUser.name ||
          propUser.fullName ||
          propUser.institutionName ||
          (propUser.role === "HOSPITAL" ? "Hospital Facility" : "Doctor Practice"),
        role:
          propUser.role === "HOSPITAL"
            ? "Hospital / Clinical Facility"
            : propUser.role === "STAFF"
            ? "Staff & Receptionist"
            : "Licensed Physician",
        email: propUser.email,
        avatar: propUser.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
      });
      return;
    }

    const stored = getStoredPortalUser();
    const accountType = propAccountType || getStoredAccountType();

    if (stored) {
      setUserProfile({
        name: stored.name || stored.fullName || stored.institutionName || "Dr. Rashid Al Mamun",
        role:
          stored.role === "HOSPITAL"
            ? "Hospital / Clinical Facility"
            : stored.role === "STAFF"
            ? "Staff & Receptionist"
            : "Licensed Physician",
        email: stored.email,
        avatar: stored.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
      });
    } else {
      setUserProfile({
        name: accountType === "HOSPITAL" ? "Clinical Facility" : "Dr. Rashid Al Mamun",
        role: accountType === "HOSPITAL" ? "Hospital & Clinic" : "Licensed Physician",
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
      });
    }

    getAdminMe()
      .then((res) => {
        if (res?.user) {
          setUserProfile({
            name:
              res.user.name ||
              res.user.fullName ||
              res.user.institutionName ||
              (res.user.role === "HOSPITAL" ? "Hospital Facility" : "Dr. Rashid Al Mamun"),
            role:
              res.user.role === "HOSPITAL"
                ? "Hospital / Clinical Facility"
                : res.user.role === "STAFF"
                ? "Staff & Receptionist"
                : "Licensed Physician",
            email: res.user.email,
            avatar: res.user.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
          });
        }
      })
      .catch(() => {
        // Retain initial profile
      });
  }, [propUser, propAccountType]);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getStoredPortalDate());
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDateChange = (e: any) => {
      if (e?.detail && typeof e.detail === "string" && e.detail !== selectedDateKey) {
        setSelectedDateKey(e.detail);
      }
    };
    window.addEventListener("portal_date_change", onDateChange);
    return () => window.removeEventListener("portal_date_change", onDateChange);
  }, [selectedDateKey]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };
    if (isDateDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDateDropdownOpen]);

  const dateInfo = formatPortalDateInfo(selectedDateKey);
  const todayKey = getChamberBusinessDate();
  const tomorrowKey = shiftDateIso(todayKey, 1);
  const dayAfterTomorrowKey = shiftDateIso(todayKey, 2);

  const handlePrevDay = () => {
    const prev = shiftDateIso(selectedDateKey, -1);
    setSelectedDateKey(prev);
    setStoredPortalDate(prev);
  };

  const handleNextDay = () => {
    const next = shiftDateIso(selectedDateKey, 1);
    setSelectedDateKey(next);
    setStoredPortalDate(next);
  };

  const handleSelectDate = (dateVal: string) => {
    if (!dateVal) return;
    setSelectedDateKey(dateVal);
    setStoredPortalDate(dateVal);
    setIsDateDropdownOpen(false);
  };

  const handleResetToday = () => {
    setSelectedDateKey(todayKey);
    setStoredPortalDate(todayKey);
    setIsDateDropdownOpen(false);
  };

  return (
    <header className="portal-topbar">
      {/* Mobile Top Row (Visible on <= 768px as shown in mobile design) */}
      <div className="topbar-mobile-row">
        <button
          type="button"
          className="portal-mobile-toggle-btn"
          onClick={onToggleMobileSidebar}
          aria-label={isMobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileSidebarOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5b869" strokeWidth="2.4" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="topbar-mobile-brand">
          <div className="topbar-mobile-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e5b869" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3.5" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="13" x2="12" y2="17" strokeWidth="2.4" />
              <line x1="10" y1="15" x2="14" y2="15" strokeWidth="2.4" />
            </svg>
          </div>
          <div className="topbar-mobile-brand-text">
            <span className="topbar-mobile-brand-title">
              GLOBAL <span style={{ color: "#e5b869" }}>BOOKING</span>
            </span>
            <span className="topbar-mobile-brand-sub">Healthcare Practice Suite</span>
          </div>
        </div>

        <button type="button" className="topbar-mobile-lang-pill" aria-label="Change language">
          <Globe size={14} style={{ color: "#e5b869" }} />
          <span>EN</span>
          <ChevronDown size={13} style={{ color: "#94a3b8" }} />
        </button>
      </div>

      {/* Search Input Box */}
      <div className="topbar-search-container">
        <Search className="topbar-search-icon" size={17} />
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search patients, appointments, schedules..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Right Control Actions */}
      <div className="topbar-actions-container">
        {/* Date Filter Widget with Dropdown Popover */}
        <div ref={dateDropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="topbar-date-picker-button"
            aria-label="Select date filter"
            onClick={() => setIsDateDropdownOpen((prev) => !prev)}
            style={{
              borderColor: isDateDropdownOpen ? "rgba(229, 184, 105, 0.7)" : undefined,
              boxShadow: isDateDropdownOpen
                ? "0 0 16px rgba(229, 184, 105, 0.3)"
                : undefined,
            }}
          >
            {/* Custom Luxury Gold Calendar Icon with Day Number */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="topbar-calendar-icon"
              style={{ flexShrink: 0 }}
            >
              <rect x="3" y="4" width="18" height="18" rx="3.5" stroke="#f59e0b" strokeWidth="1.8" />
              <line x1="16" y1="2" x2="16" y2="6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" stroke="#f59e0b" strokeWidth="1.5" />
              <text
                x="12"
                y="18"
                textAnchor="middle"
                fill="#f59e0b"
                fontSize="7.5"
                fontWeight="800"
                fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              >
                {dateInfo.dayNum}
              </text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.18 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff", letterSpacing: "0.01em" }}>
                {dateInfo.formattedDate}
              </span>
              <span style={{ fontSize: 10.5, color: dateInfo.isToday ? "#94a3b8" : "#e5b869", fontWeight: dateInfo.isToday ? 400 : 700 }}>
                {dateInfo.dayOfWeek} {!dateInfo.isToday && "(Selected)"}
              </span>
            </div>
            <ChevronDown
              size={13}
              style={{
                color: "#e5b869",
                marginLeft: 2,
                transform: isDateDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* Luxury Date Picker Dropdown Popover */}
          {isDateDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 99999,
                width: 310,
                background: "linear-gradient(145deg, #0d1728 0%, #060b14 100%)",
                border: "1.5px solid rgba(229, 184, 105, 0.4)",
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: "0 18px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(229, 184, 105, 0.15)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxSizing: "border-box",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#e5b869",
                  }}
                >
                  Select Clinical Date
                </span>
                {!dateInfo.isToday && (
                  <button
                    type="button"
                    onClick={handleResetToday}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(229, 184, 105, 0.15)",
                      border: "1px solid rgba(229, 184, 105, 0.4)",
                      color: "#e5b869",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>Reset to Today</span>
                  </button>
                )}
              </div>

              {/* Prev / Next Day Stepper Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "6px 8px",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevDay}
                  title="Previous Day"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>
                    {dateInfo.formattedDate}
                  </div>
                  <div style={{ fontSize: 11, color: "#e5b869", fontWeight: 600 }}>
                    {dateInfo.dayOfWeek} {dateInfo.isToday ? "• Today" : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Next Day"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(229, 184, 105, 0.15)",
                    border: "1px solid rgba(229, 184, 105, 0.4)",
                    color: "#e5b869",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Calendar Date Input Picker */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  Jump to specific date:
                </label>
                <input
                  type="date"
                  value={selectedDateKey}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#080e1b",
                    border: "1px solid rgba(229, 184, 105, 0.35)",
                    borderRadius: 10,
                    color: "#ffffff",
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    outline: "none",
                    cursor: "pointer",
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleResetToday}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: dateInfo.isToday
                      ? "linear-gradient(135deg, #e5b869 0%, #b88628 100%)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: dateInfo.isToday ? "#060b13" : "#cbd5e1",
                    border: dateInfo.isToday ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDate(tomorrowKey)}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: selectedDateKey === tomorrowKey
                      ? "linear-gradient(135deg, #e5b869 0%, #b88628 100%)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: selectedDateKey === tomorrowKey ? "#060b13" : "#cbd5e1",
                    border: selectedDateKey === tomorrowKey ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDate(dayAfterTomorrowKey)}
                  style={{
                    flex: 1,
                    minWidth: 70,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: selectedDateKey === dayAfterTomorrowKey
                      ? "linear-gradient(135deg, #e5b869 0%, #b88628 100%)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: selectedDateKey === dayAfterTomorrowKey ? "#060b13" : "#cbd5e1",
                    border: selectedDateKey === dayAfterTomorrowKey ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Next Day (+2)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell with Badge */}
        <button
          type="button"
          className="topbar-notification-button"
          aria-label="Notifications"
          title="3 unread notifications"
        >
          <Bell size={18} strokeWidth={2} />
          <span className="notification-badge-dot">3</span>
        </button>

        {/* User Profile Info */}
        <div className="topbar-user-profile">
          <div className="topbar-user-avatar-wrapper">
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="topbar-user-avatar-img"
            />
          </div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">{userProfile.name}</span>
            <span className="topbar-user-role">{userProfile.role}</span>
          </div>
          <ChevronDown size={14} className="topbar-chevron-icon" />
        </div>
      </div>
    </header>
  );
}
