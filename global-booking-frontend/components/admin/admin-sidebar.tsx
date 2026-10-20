"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
import {
  MOCK_SUPER_ADMIN_USERS,
  MOCK_PENDING_DOCTOR_APPLICATIONS,
  MOCK_PENDING_HOSPITAL_APPLICATIONS,
} from "@/lib/data/mock-admin-data";

/**
 * Total pending registration applications from Phase 1 mock data.
 * Explicitly identified as fictional mock data fixtures.
 */
const TOTAL_MOCK_PENDING_REGISTRATIONS =
  MOCK_PENDING_DOCTOR_APPLICATIONS.length +
  MOCK_PENDING_HOSPITAL_APPLICATIONS.length;

export interface AdminSidebarProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

/**
 * Exactly the 6 approved Super Admin primary modules in strict specification order.
 */
export const SUPER_ADMIN_NAV_MODULES = [
  {
    label: "New Registration Requests",
    href: ROUTES.adminRegistrations,
    icon: ClipboardList,
    badge: `${TOTAL_MOCK_PENDING_REGISTRATIONS}`,
    badgeLabel: "MOCK",
    badgeTooltip: `Mock Fixture: ${TOTAL_MOCK_PENDING_REGISTRATIONS} pending applications (${MOCK_PENDING_DOCTOR_APPLICATIONS.length} Doctors, ${MOCK_PENDING_HOSPITAL_APPLICATIONS.length} Hospitals)`,
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

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const currentAdmin = MOCK_SUPER_ADMIN_USERS[0];

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

        {/* Mock Environment Identifier */}
        <div className="admin-mock-env-pill" title="Phase 2 layout preview using mock fixtures only">
          <span className="admin-mock-dot" aria-hidden="true" />
          <span>Mock Test Mode</span>
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
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className="admin-nav-badge"
                      title={item.badgeTooltip ?? undefined}
                      aria-label={`${item.badge} pending requests (${item.badgeLabel} fixture)`}
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
          title="Fictional mock administrator identity from Phase 1 data"
        >
          <Image
            src={currentAdmin.avatar}
            alt={currentAdmin.name}
            width={36}
            height={36}
            className="admin-actor-avatar"
          />
          <div className="admin-actor-details">
            <span className="admin-actor-name">{currentAdmin.name}</span>
            <span className="admin-actor-role">Super Admin ({currentAdmin.id})</span>
            <span className="admin-actor-context-tag">Mock Actor Fixture</span>
          </div>
        </div>

        <Link
          href={ROUTES.login}
          className="admin-sidebar-exit-btn"
          title="Exit Admin Preview to Login Page (Mock Action)"
          onClick={onClose}
        >
          <LogOut size={14} aria-hidden="true" />
          <span>Exit Admin Session</span>
        </Link>
      </div>
    </aside>
  );
}
