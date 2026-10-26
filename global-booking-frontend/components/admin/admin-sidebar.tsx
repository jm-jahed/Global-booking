"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Stethoscope,
  Building2,
  ShieldAlert,
  Users,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import { adminLogout } from "@/lib/api/admin-client";
import { useTranslation } from "@/lib/i18n/i18n-context";

export interface AdminSidebarProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
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
 * Exactly the 6 approved Super Admin primary modules in strict specification order.
 */
export const SUPER_ADMIN_NAV_MODULES = [
  {
    label: "New Registration Requests",
    href: ROUTES.adminRegistrations,
    icon: ClipboardList,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) =>
      path === "/admin" ||
      path === "/admin/" ||
      path.startsWith("/admin/registrations"),
  },
  {
    label: "Doctors & Specialists",
    href: ROUTES.adminDoctors,
    icon: Stethoscope,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) => path.startsWith("/admin/doctors"),
  },
  {
    label: "Hospitals & Clinics",
    href: ROUTES.adminHospitals,
    icon: Building2,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) => path.startsWith("/admin/hospitals"),
  },
  {
    label: "Security & Audit Logs",
    href: ROUTES.adminAuditLogs,
    icon: ShieldAlert,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) => path.startsWith("/admin/audit-logs"),
  },
  {
    label: "Admin Users & Permissions",
    href: ROUTES.adminUsers,
    icon: Users,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) => path.startsWith("/admin/users"),
  },
  {
    label: "Platform Settings",
    href: ROUTES.adminSettings,
    icon: Settings,
    badge: null,
    badgeLabel: null,
    badgeTooltip: null,
    activeMatch: (path: string) => path.startsWith("/admin/settings"),
  },
] as const;

export function AdminSidebar({ isOpen = false, onClose, adminUser }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation("nav");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getAdminNavLabel = (href: string, fallback: string): string => {
    switch (href) {
      case ROUTES.adminRegistrations:
        return t("adminRegistrations", undefined, fallback);
      case ROUTES.adminDoctors:
        return t("adminDoctors", undefined, fallback);
      case ROUTES.adminHospitals:
        return t("adminHospitals", undefined, fallback);
      case ROUTES.adminAuditLogs:
        return t("adminAudit", undefined, fallback);
      case ROUTES.adminUsers:
        return t("adminUsers", undefined, fallback);
      case ROUTES.adminSettings:
        return t("adminSettings", undefined, fallback);
      default:
        return fallback;
    }
  };

  const handleExitSession = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await adminLogout();
    } catch {
      // ignore
    } finally {
      setIsLoggingOut(false);
      onClose?.();
      router.push(ROUTES.adminLogin);
    }
  };

  const displayName = adminUser?.name || "Administrator";
  const displayRole =
    adminUser?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : adminUser?.role === "OPERATIONS_ADMIN"
      ? "Operations Admin"
      : adminUser?.role === "BILLING_ADMIN"
      ? "Billing Admin"
      : adminUser?.role === "AUDIT_VIEWER"
      ? "Audit Viewer"
      : adminUser?.role || "Administrator";
  const displayId = adminUser?.id ? ` (${adminUser.id})` : "";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  return (
    <aside
      className={`admin-sidebar ${isOpen ? "sidebar-open" : ""}`}
      aria-label="Super Admin Navigation"
    >
      {/* Brand Header */}
      <div className="admin-sidebar-brand">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            href={ROUTES.adminRegistrations}
            className="admin-brand-link"
            onClick={onClose}
          >
            <div className="admin-brand-icon-wrapper">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e5b869"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="admin-brand-text">
              <span className="admin-brand-title">Global Booking</span>
              <span className="admin-brand-subtitle">Super Admin</span>
            </div>
          </Link>

          {/* Close button on mobile */}
          {isOpen && (
            <button
              type="button"
              className="admin-mobile-toggle-btn"
              onClick={onClose}
              aria-label="Close Super Admin sidebar"
              style={{ display: "flex", width: "32px", height: "32px" }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Environment Identifier */}
        <div className="admin-live-env-pill" title="Live System Active — Connected to MongoDB Atlas">
          <span className="admin-live-dot" aria-hidden="true" />
          <span>Production Live</span>
        </div>
      </div>

      <div className="admin-nav-section-title">Core Management</div>

      {/* Primary Navigation — Exactly the 6 approved modules */}
      <nav aria-label="Super Admin Primary Navigation" className="admin-sidebar-nav">
        <ul className="admin-nav-list" role="list">
          {SUPER_ADMIN_NAV_MODULES.map((item) => {
            const isActive = item.activeMatch(pathname ?? "");
            const IconComponent = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`admin-nav-link ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onClose}
                >
                  <div className="admin-nav-link-left">
                    <IconComponent className="admin-nav-icon" aria-hidden="true" />
                    <span>{getAdminNavLabel(item.href, item.label)}</span>
                  </div>

                  {item.badge && (
                    <span
                      className="admin-nav-badge"
                      title={item.badgeTooltip ?? undefined}
                      aria-label={`${item.badge} pending requests`}
                    >
                      {item.badge}
                      {item.badgeLabel && <small>{item.badgeLabel}</small>}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Visual Divider separating Primary Nav from Account Controls */}
      <div className="admin-sidebar-divider" role="separator" />

      {/* Admin Actor Profile & Account Controls (Strictly Separated) */}
      <div className="admin-sidebar-footer">
        <div
          className="admin-actor-card"
          title="Authenticated Platform Administrator"
        >
          {adminUser?.avatar ? (
            <Image
              src={adminUser.avatar}
              alt={displayName}
              width={36}
              height={36}
              className="admin-actor-avatar"
            />
          ) : (
            <div
              className="admin-actor-avatar"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
                border: "1px solid rgba(229,184,105,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div className="admin-actor-details">
            <span className="admin-actor-name">{displayName}</span>
            <span className="admin-actor-role">
              {displayRole}
              {displayId}
            </span>
            <span className="admin-actor-context-tag">Live System Active</span>
          </div>
        </div>

        <button
          type="button"
          className="admin-sidebar-exit-btn"
          title="Exit Admin Session"
          onClick={handleExitSession}
          disabled={isLoggingOut}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LogOut size={14} aria-hidden="true" />
          <span>{isLoggingOut ? "Exiting session..." : "Exit Admin Session"}</span>
        </button>
      </div>
    </aside>
  );
}
