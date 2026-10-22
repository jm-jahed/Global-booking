"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, ChevronDown, ShieldCheck, LogOut } from "lucide-react";
import { getAdminMe, adminLogout } from "@/lib/api/admin-client";

export interface AdminTopbarProps {
  readonly onToggleSidebar: () => void;
  readonly isSidebarOpen?: boolean;
  readonly adminUser?: {
    readonly id?: string;
    readonly name?: string;
    readonly email?: string;
    readonly role?: string;
    readonly permissions?: readonly string[];
    readonly avatar?: string;
  } | null;
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

export function AdminTopbar({ onToggleSidebar, isSidebarOpen = false, adminUser }: AdminTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { eyebrow, title } = getPageTitle(pathname ?? "");

  const [internalAdminUser, setInternalAdminUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // If adminUser prop is provided by layout, avoid duplicate session call
  useEffect(() => {
    if (adminUser !== undefined) return;
    let isMounted = true;
    getAdminMe()
      .then((res) => {
        if (isMounted && res.user) {
          setInternalAdminUser(res.user);
        }
      })
      .catch(() => {
        // Fallback silently if offline or unauthenticated
      });
    return () => {
      isMounted = false;
    };
  }, [adminUser]);

  const profileUser = adminUser !== undefined ? adminUser : internalAdminUser;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await adminLogout();
    } catch {
      // ignore
    } finally {
      setIsLoggingOut(false);
      router.push("/admin/login");
    }
  };

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

  const displayName = profileUser?.name || "Administrator";
  const displayEmail = profileUser?.email || "Not provided";
  const displayId = profileUser?.id || "Not provided";
  const displayRole =
    profileUser?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : profileUser?.role === "OPERATIONS_ADMIN"
      ? "Operations Admin"
      : profileUser?.role === "BILLING_ADMIN"
      ? "Billing Admin"
      : profileUser?.role === "AUDIT_VIEWER"
      ? "Audit Viewer"
      : profileUser?.role || "Administrator";
  const initial = displayName.charAt(0).toUpperCase() || "A";

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

      {/* Right: Info Badges, Notifications & Admin Profile */}
      <div className="admin-topbar-right">
        {/* Currency & Environment Indicator */}
        <div
          className="admin-topbar-info-pill"
          title="Default system currency is AED; live database connected"
        >
          <span>Currency:</span>
          <span className="admin-info-highlight">AED</span>
          <span>•</span>
          <span style={{ color: "#10b981", fontWeight: 600 }}>Live Production</span>
        </div>

        {/* Notifications Button & Popover */}
        <div className="admin-topbar-action-container" ref={notificationRef}>
          <button
            type="button"
            className={`admin-notification-btn ${isNotificationsOpen ? "active" : ""}`}
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            title="Notification Center"
          >
            <Bell size={18} aria-hidden="true" />
          </button>

          {isNotificationsOpen && (
            <div
              className="admin-notifications-popover"
              role="dialog"
              aria-label="Platform Notifications"
            >
              <div className="admin-popover-header">
                <h3 className="admin-popover-title">Notifications</h3>
                <span
                  className="admin-popover-badge"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                  }}
                >
                  LIVE PLATFORM
                </span>
              </div>
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "#94a3b8",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Bell size={24} style={{ color: "#64748b", opacity: 0.6 }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#cbd5e1" }}>
                  No notifications available
                </span>
                <span style={{ fontSize: "12px", color: "#64748b", maxWidth: "260px", lineHeight: 1.4 }}>
                  Operational alerts, registrations, and system updates will appear here in real time.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown Menu */}
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
            {profileUser?.avatar ? (
              <Image
                src={profileUser.avatar}
                alt={displayName}
                width={32}
                height={32}
                className="admin-profile-avatar"
              />
            ) : (
              <div
                className="admin-profile-avatar"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
                  border: "1px solid rgba(229,184,105,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e5b869",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <div className="admin-profile-meta">
              <span className="admin-profile-name">{displayName}</span>
              <span className="admin-profile-role">{displayRole}</span>
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
                <span className="admin-profile-full-name">{displayName}</span>
                <span className="admin-profile-full-email">{displayEmail}</span>
              </div>

              <div className="admin-profile-details-grid">
                <div className="admin-profile-stat-box">
                  <span className="admin-profile-stat-label">Admin ID</span>
                  <span className="admin-profile-stat-value">{displayId}</span>
                </div>
                <div className="admin-profile-stat-box">
                  <span className="admin-profile-stat-label">Permissions</span>
                  <span className="admin-profile-stat-value">
                    {profileUser?.permissions ? `${profileUser.permissions.length} Active` : "Not provided"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: profileUser ? "#34d399" : "#94a3b8",
                  padding: "8px 0 4px",
                }}
              >
                <ShieldCheck size={14} color={profileUser ? "#34d399" : "#e5b869"} aria-hidden="true" />
                <span>{profileUser ? "Live session — Authenticated Super Admin" : "Active Super Admin Session"}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  color: "#f87171",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={13} />
                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
