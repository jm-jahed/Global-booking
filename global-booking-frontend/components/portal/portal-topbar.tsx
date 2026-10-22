"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Bell, ChevronDown, UserCircle } from "lucide-react";
import { getStoredPortalUser, getStoredAccountType, getAdminMe } from "@/lib/api/admin-client";

import type { PortalAccountType } from "./portal-sidebar";

export interface PortalTopBarProps {
  readonly accountType?: PortalAccountType;
  readonly currentUser?: any;
}

export function PortalTopBar({ accountType: propAccountType, currentUser: propUser }: PortalTopBarProps = {}) {
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

  const now = new Date();
  const dayNum = now.getDate();
  const todayFormatted = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <header className="portal-topbar">
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
        {/* Date Filter Widget */}
        <button
          type="button"
          className="topbar-date-picker-button"
          aria-label="Select date filter"
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
              {dayNum}
            </text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.18 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff", letterSpacing: "0.01em" }}>
              {todayFormatted}
            </span>
            <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 400 }}>
              {dayOfWeek}
            </span>
          </div>
        </button>

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
