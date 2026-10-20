"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Bell, ChevronDown, ShieldCheck, X } from "lucide-react";
import { MOCK_SUPER_ADMIN_USERS } from "@/lib/data/mock-admin-data";

export interface AdminTopbarProps {
  readonly onToggleSidebar: () => void;
  readonly isSidebarOpen?: boolean;
}

/**
 * Maps the current pathname to an accurate page title.
 */
function getPageTitle(pathname: string): { eyebrow: string; title: string } {
  if (pathname === "/admin" || pathname.startsWith("/admin/registrations")) {
    return { eyebrow: "Super Admin Platform", title: "New Registration Requests" };
  }
  if (pathname.startsWith("/admin/doctors")) {
    return { eyebrow: "Super Admin Platform", title: "Doctors & Specialists" };
  }
  if (pathname.startsWith("/admin/hospitals")) {
    return { eyebrow: "Super Admin Platform", title: "Hospitals & Clinics" };
  }
  if (pathname.startsWith("/admin/audit-logs")) {
    return { eyebrow: "Super Admin Platform", title: "Security & Audit Logs" };
  }
  if (pathname.startsWith("/admin/users")) {
    return { eyebrow: "Super Admin Platform", title: "Admin Users & Permissions" };
  }
  if (pathname.startsWith("/admin/settings")) {
    return { eyebrow: "Super Admin Platform", title: "Platform Settings" };
  }
  if (pathname.startsWith("/admin/businesses")) {
    return { eyebrow: "Super Admin Platform", title: "Businesses Overview" };
  }
  if (pathname.startsWith("/admin/appointments")) {
    return { eyebrow: "Super Admin Platform", title: "Appointment Oversight" };
  }
  if (pathname.startsWith("/admin/reports")) {
    return { eyebrow: "Super Admin Platform", title: "Reports & Analytics" };
  }
  if (pathname.startsWith("/admin/industries")) {
    return { eyebrow: "Super Admin Platform", title: "Industry Configuration" };
  }
  return { eyebrow: "Super Admin Platform", title: "Administration" };
}

export function AdminTopbar({ onToggleSidebar, isSidebarOpen = false }: AdminTopbarProps) {
  const pathname = usePathname();
  const { eyebrow, title } = getPageTitle(pathname ?? "");
  const currentAdmin = MOCK_SUPER_ADMIN_USERS[0];

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="admin-topbar" aria-label="Super Admin Topbar">
      {/* Left: Mobile Toggle & Page Titles */}
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-mobile-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isSidebarOpen}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="admin-topbar-titles">
          <span className="admin-topbar-eyebrow">{eyebrow}</span>
          <h1 className="admin-topbar-page-title">{title}</h1>
        </div>
      </div>

      {/* Right: Info Badges, Mock Notifications & Admin Profile */}
      <div className="admin-topbar-right">
        {/* Currency & Environment Indicator */}
        <div
          className="admin-topbar-info-pill"
          title="Default system currency is AED; values represented safely in integer fils"
        >
          <span>Currency:</span>
          <span className="admin-info-highlight">AED</span>
          <span>•</span>
          <span>Mock State</span>
        </div>

        {/* Notifications Button & Popover (Explicitly Mock UI) */}
        <div className="admin-topbar-action-container" ref={notificationRef}>
          <button
            type="button"
            className={`admin-notification-btn ${isNotificationsOpen ? "active" : ""}`}
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            aria-label="View notifications (Mock fixture UI)"
            aria-expanded={isNotificationsOpen}
            title="Mock Notification Center"
          >
            <Bell size={18} aria-hidden="true" />
            <span className="admin-notification-badge" aria-hidden="true">
              3
            </span>
          </button>

          {isNotificationsOpen && (
            <div
              className="admin-mock-popover"
              role="dialog"
              aria-label="Mock Notifications"
            >
              <div className="admin-popover-header">
                <h3 className="admin-popover-title">Notifications</h3>
                <span className="admin-popover-badge">MOCK FIXTURE</span>
              </div>
              <p className="admin-popover-disclaimer">
                This is a non-functional mock UI for layout preview only. No live notification service or webhooks are connected.
              </p>
              <div className="admin-popover-list">
                <div className="admin-popover-item">
                  <span className="admin-popover-item-title">
                    Dr. Laila Mansoor submitted registration application
                  </span>
                  <span className="admin-popover-item-time">Pending review • Mock fixture</span>
                </div>
                <div className="admin-popover-item">
                  <span className="admin-popover-item-title">
                    Emirates Specialized Medical Center accreditation uploaded
                  </span>
                  <span className="admin-popover-item-time">Awaiting verification • Mock fixture</span>
                </div>
                <div className="admin-popover-item">
                  <span className="admin-popover-item-title">
                    Subscription SUB-DOC-701 renewed for 6 months
                  </span>
                  <span className="admin-popover-item-time">AED 1,890.00 • Mock fixture</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown Menu (Fictional Fixture Data) */}
        <div className="admin-topbar-action-container" ref={profileRef}>
          <button
            type="button"
            className={`admin-profile-btn ${isProfileOpen ? "active" : ""}`}
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            aria-label="Administrator profile menu"
            aria-expanded={isProfileOpen}
          >
            <Image
              src={currentAdmin.avatar}
              alt={currentAdmin.name}
              width={32}
              height={32}
              className="admin-profile-avatar"
            />
            <div className="admin-profile-meta">
              <span className="admin-profile-name">{currentAdmin.name}</span>
              <span className="admin-profile-role">Super Admin</span>
            </div>
            <ChevronDown size={14} className="admin-profile-chevron" aria-hidden="true" />
          </button>

          {isProfileOpen && (
            <div
              className="admin-profile-popover"
              role="dialog"
              aria-label="Admin Profile Details"
            >
              <div className="admin-profile-header">
                <span className="admin-profile-full-name">{currentAdmin.name}</span>
                <span className="admin-profile-full-email">{currentAdmin.email}</span>
              </div>

              <div className="admin-profile-details-grid">
                <div className="admin-profile-stat-box">
                  <span className="admin-profile-stat-label">Admin ID</span>
                  <span className="admin-profile-stat-value">{currentAdmin.id}</span>
                </div>
                <div className="admin-profile-stat-box">
                  <span className="admin-profile-stat-label">Permissions</span>
                  <span className="admin-profile-stat-value">
                    {currentAdmin.permissions.length} Active
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  padding: "8px 0 4px",
                }}
              >
                <ShieldCheck size={14} color="#e5b869" aria-hidden="true" />
                <span>Mock identity — no backend session active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
