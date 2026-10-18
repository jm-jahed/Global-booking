"use client";

import Image from "next/image";
import { Search, Calendar, Bell, ChevronDown } from "lucide-react";
import { useState } from "react";

export function PortalTopBar() {
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="portal-topbar">
      {/* Search Input Box */}
      <div className="topbar-search-container">
        <Search className="topbar-search-icon" size={17} />
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search anything... (clients, services, staff, etc.)"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Right Control Actions */}
      <div className="topbar-actions-container">
        {/* Date Filter Dropdown */}
        <button
          type="button"
          className="topbar-date-picker-button"
          aria-label="Select date filter"
        >
          <Calendar size={15} className="topbar-calendar-icon" />
          <span className="topbar-date-text">Apr 15, 2025</span>
          <ChevronDown size={14} className="topbar-chevron-icon" />
        </button>

        {/* Notification Bell with Badge */}
        <button
          type="button"
          className="topbar-notification-button"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="notification-badge-dot">3</span>
        </button>

        {/* User Profile Info */}
        <div className="topbar-user-profile">
          <div className="topbar-user-avatar-wrapper">
            <Image
              src="/avatars/alex-johnson.jpg"
              alt="Alex Johnson"
              width={40}
              height={40}
              className="topbar-user-avatar-img"
            />
          </div>
          <div className="topbar-user-details">
            <span className="topbar-user-name">Alex Johnson</span>
            <span className="topbar-user-role">Business Owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
