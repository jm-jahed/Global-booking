"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  User,
  Users,
  Clock,
  BarChart3,
  QrCode,
  UserCheck,
  CreditCard,
  Bell,
  UserCircle,
  LogOut,
  Stethoscope,
  Building2,
  Building,
  Settings,
  PhoneCall,
  Shield,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  adminLogout,
  getStoredAccountType,
  setStoredAccountType,
  getStoredPortalUser,
  getAdminMe,
} from "@/lib/api/admin-client";
import { DoctorQrModal } from "./qr-code/doctor-qr-modal";
import { useTranslation } from "@/lib/i18n/i18n-context";

export type PortalAccountType = "DOCTOR" | "HOSPITAL" | "STAFF";

export interface PortalNavItem {
  id: string;
  label: string;
  href?: string;
  icon: any;
  isAction?: boolean;
  actionKey?: "LOGOUT" | "QR_CODE";
  activeMatch?: (path: string) => boolean;
  staffAccessible?: boolean;
  phoneBookingAllowed?: boolean;
}

/**
 * 10 Approved Menus for DOCTOR DASHBOARD SIDEBAR (Strict Order)
 * 1. Dashboard
 * 2. Live Queue
 * 3. My Patients
 * 4. Availability & Schedule
 * 5. Reports
 * 6. QR Code & Booking Link
 * 7. Staff Management (Doctor full access, hidden for Staff by default)
 * 8. Notifications
 * 9. My Profile & Portfolio
 * 10. Logout
 * (Note: Subscription & Billing temporarily removed for future addition)
 */
export const DOCTOR_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    activeMatch: (path) => path === "/dashboard" || path === "/dashboard/",
    staffAccessible: true,
  },
  {
    id: "live-queue",
    label: "Live Queue",
    href: "/live-queue",
    icon: Activity,
    activeMatch: (path) => path.startsWith("/live-queue"),
    staffAccessible: true,
    phoneBookingAllowed: true,
  },
  {
    id: "my-patients",
    label: "My Patients",
    href: "/patients",
    icon: User,
    activeMatch: (path) =>
      path.startsWith("/patients") ||
      path.startsWith("/customers") ||
      path.startsWith("/clients"),
    staffAccessible: true,
  },
  {
    id: "availability",
    label: "Availability & Schedule",
    href: "/availability",
    icon: Clock,
    activeMatch: (path) => path.startsWith("/availability"),
    staffAccessible: true,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    activeMatch: (path) => path.startsWith("/reports"),
    staffAccessible: false, // Staff restricted (backend enforces DOCTOR only)
  },
  {
    id: "qr-code",
    label: "QR Code & Booking Link",
    isAction: true,
    actionKey: "QR_CODE",
    icon: QrCode,
    activeMatch: () => false,
    staffAccessible: true,
  },
  {
    id: "staff-management",
    label: "Staff Management",
    href: "/staff",
    icon: UserCheck,
    activeMatch: (path) => path.startsWith("/staff"),
    staffAccessible: false, // Staff restricted by default
  },
  // Note: Subscription & Billing temporarily removed from doctor navigation - will be re-added in future.
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    activeMatch: (path) => path.startsWith("/notifications"),
    staffAccessible: true,
  },
  {
    id: "my-profile",
    label: "My Profile & Portfolio",
    href: "/settings",
    icon: UserCircle,
    activeMatch: (path) =>
      path.startsWith("/settings") || path.startsWith("/profile"),
    staffAccessible: true,
  },
  {
    id: "logout",
    label: "Logout",
    isAction: true,
    actionKey: "LOGOUT",
    icon: LogOut,
    activeMatch: () => false,
    staffAccessible: true,
  },
] as const;

/**
 * 14 Approved Menus for HOSPITAL / CLINIC DASHBOARD SIDEBAR (Strict Order)
 * 1. Dashboard
 * 2. Live Queue
 * 3. Patients
 * 4. Doctors & Specialists
 * 5. Departments & Specializations
 * 6. Availability & Schedule
 * 7. Reports
 * 8. QR Code & Booking Link
 * 9. Staff Management
 * 10. Subscription & Billing
 * 11. Notifications
 * 12. Hospital / Clinic Profile
 * 13. Account Settings
 * 14. Logout
 */
export const HOSPITAL_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    activeMatch: (path) => path === "/dashboard" || path === "/dashboard/",
    staffAccessible: true,
  },
  {
    id: "live-queue",
    label: "Live Queue",
    href: "/live-queue",
    icon: Activity,
    activeMatch: (path) => path.startsWith("/live-queue"),
    staffAccessible: true,
    phoneBookingAllowed: true,
  },
  {
    id: "patients",
    label: "Patients",
    href: "/patients",
    icon: Users,
    activeMatch: (path) =>
      path.startsWith("/patients") ||
      path.startsWith("/customers") ||
      path.startsWith("/clients"),
    staffAccessible: true,
  },
  {
    id: "doctors-specialists",
    label: "Doctors & Specialists",
    href: "/staff#doctors",
    icon: Stethoscope,
    activeMatch: (path) => path.startsWith("/doctors"),
    staffAccessible: true,
  },
  {
    id: "departments-specializations",
    label: "Departments & Specializations",
    href: "/services",
    icon: Building2,
    activeMatch: (path) =>
      path.startsWith("/services") || path.startsWith("/departments"),
    staffAccessible: true,
  },
  {
    id: "availability",
    label: "Availability & Schedule",
    href: "/availability",
    icon: Clock,
    activeMatch: (path) => path.startsWith("/availability"),
    staffAccessible: true,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    activeMatch: (path) => path.startsWith("/reports"),
    staffAccessible: false, // Staff restricted (backend enforces DOCTOR only)
  },
  {
    id: "qr-code",
    label: "QR Code & Booking Link",
    isAction: true,
    actionKey: "QR_CODE",
    icon: QrCode,
    activeMatch: () => false,
    staffAccessible: true,
  },
  {
    id: "staff-management",
    label: "Staff Management",
    href: "/staff",
    icon: UserCheck,
    activeMatch: (path) => path.startsWith("/staff"),
    staffAccessible: false, // Staff restricted by default
  },
  {
    id: "subscription-billing",
    label: "Subscription & Billing",
    href: "/pricing",
    icon: CreditCard,
    activeMatch: (path) =>
      path.startsWith("/pricing") || path.startsWith("/subscription"),
    staffAccessible: false, // Staff restricted by default
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    activeMatch: (path) => path.startsWith("/notifications"),
    staffAccessible: true,
  },
  {
    id: "hospital-profile",
    label: "Hospital / Clinic Profile",
    href: "/settings#hospital-profile",
    icon: Building,
    activeMatch: (path) => path === "/settings#hospital-profile",
    staffAccessible: true,
  },
  {
    id: "account-settings",
    label: "Account Settings",
    href: "/settings",
    icon: Settings,
    activeMatch: (path) => path.startsWith("/settings"),
    staffAccessible: true,
  },
  {
    id: "logout",
    label: "Logout",
    isAction: true,
    actionKey: "LOGOUT",
    icon: LogOut,
    activeMatch: () => false,
    staffAccessible: true,
  },
] as const;

export interface PortalSidebarProps {
  readonly accountType?: PortalAccountType;
  readonly currentUser?: any;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function PortalSidebar({
  accountType: propAccountType,
  currentUser: propUser,
  isOpen = false,
  onClose,
}: PortalSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation("nav");

  const [accountType, setAccountType] = useState<PortalAccountType>(propAccountType || "DOCTOR");
  const [currentUser, setCurrentUser] = useState<any>(propUser || null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mounted, setMounted] = useState(false);

  const getNavItemLabel = (id: string, defaultLabel: string): string => {
    switch (id) {
      case "dashboard":
        return t("dashboard", undefined, defaultLabel);
      case "live-queue":
        return t("liveQueue", undefined, defaultLabel);
      case "my-patients":
      case "patients":
      case "clients":
      case "customers":
        return t("patients", undefined, defaultLabel);
      case "availability":
        return t("availability", undefined, defaultLabel);
      case "services":
        return t("services", undefined, defaultLabel);
      case "staff":
        return t("staff", undefined, defaultLabel);
      case "reports":
        return t("reports", undefined, defaultLabel);
      case "notifications":
        return t("notifications", undefined, defaultLabel);
      case "profile-settings":
      case "settings":
        return t("settings", undefined, defaultLabel);
      case "qr-code":
        return t("qrCode", undefined, defaultLabel);
      case "logout":
        return t("logout", undefined, defaultLabel);
      default:
        return defaultLabel;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize authenticated session state
  useEffect(() => {
    if (propAccountType) {
      setAccountType(propAccountType);
    } else {
      const storedType = getStoredAccountType();
      setAccountType(storedType);
    }

    if (propUser) {
      setCurrentUser(propUser);
    } else {
      const storedUser = getStoredPortalUser();
      if (storedUser) {
        setCurrentUser(storedUser);
      }
      getAdminMe()
        .then((res) => {
          if (res?.user) {
            setCurrentUser(res.user);
            if (res.user.role === "HOSPITAL") {
              setAccountType("HOSPITAL");
            } else if (res.user.role === "STAFF") {
              setAccountType("STAFF");
            } else {
              setAccountType("DOCTOR");
            }
          }
        })
        .catch(() => {});
    }
  }, [propAccountType, propUser]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // Local fallback
    } finally {
      setIsLogoutModalOpen(false);
      router.push("/login");
    }
  };

  // Select appropriate menu items
  const isHospital = accountType === "HOSPITAL";
  const isStaff = accountType === "STAFF";
  const isDoctor = !isHospital && !isStaff;

  const rawItems = isHospital ? HOSPITAL_NAV_ITEMS : DOCTOR_NAV_ITEMS;

  // Filter based on Staff permissions: Staff does NOT get Staff Management & Subscription & Billing
  const visibleItems = rawItems.filter((item) => {
    if (isStaff && !item.staffAccessible) {
      return false;
    }
    return true;
  });

  const doctorSlug =
    currentUser?.slug ||
    (currentUser?.fullName || currentUser?.name
      ? String(currentUser.fullName || currentUser.name)
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
      : "");

  const bookingUrl =
    typeof window !== "undefined"
      ? (doctorSlug ? `${window.location.origin}/${doctorSlug}/book` : window.location.origin)
      : (doctorSlug ? `https://globalbooking.ae/${doctorSlug}/book` : "https://globalbooking.ae");

  const handleCopyBookingLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <aside className={`portal-sidebar ${isOpen ? "sidebar-open" : ""}`} aria-label="Portal Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand-wrapper">
        <Link href="/dashboard" className="sidebar-brand-link" onClick={() => onClose?.()}>
          <div className="sidebar-brand-icon">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e5b869"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8" cy="14" r="1" fill="#e5b869" />
              <circle cx="12" cy="14" r="1" fill="#e5b869" />
              <circle cx="16" cy="14" r="1" fill="#e5b869" />
              <circle cx="8" cy="18" r="1" fill="#e5b869" />
              <circle cx="12" cy="18" r="1" fill="#e5b869" />
              <circle cx="16" cy="18" r="1" fill="#e5b869" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">
              <span className="brand-global">GLOBAL</span>
              <span className="brand-booking">BOOKING</span>
            </div>
            <p className="sidebar-brand-sub">Healthcare Practice Suite</p>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            className="portal-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Verified Account Type Indicator (Executive Medical SaaS Design) */}
      <div className="sidebar-profile-card">
        <div className="sidebar-avatar-squircle">
          {isDoctor ? (
            <img
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80"}
              alt={currentUser?.fullName || currentUser?.name || "Doctor Practice"}
              className="sidebar-avatar-img"
            />
          ) : isHospital ? (
            <div className="sidebar-avatar-icon-wrap hosp">
              <Building2 size={18} />
            </div>
          ) : (
            <div className="sidebar-avatar-icon-wrap staff">
              <Shield size={18} />
            </div>
          )}
          <span className="sidebar-status-online" title="System Online & Active" />
        </div>
        <div className="sidebar-profile-meta">
          <div className="sidebar-profile-name">
            {currentUser?.fullName ||
              currentUser?.name ||
              currentUser?.institutionName ||
              (isHospital ? "Clinical Institution" : isStaff ? "Clinic Staff" : "Doctor Practice")}
          </div>
          <div className="sidebar-profile-badge">
            <span className="badge-bullet-gold" />
            <span>
              {isHospital
                ? "Hospital Facility Portal"
                : isStaff
                ? "Reception Desk Staff"
                : "Personal Doctor Practice"}
            </span>
          </div>
        </div>
      </div>

      {/* Role Context Notification for Staff */}
      {isStaff && (
        <div
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "#a7f3d0",
          }}
        >
          <Shield size={14} color="#10b981" />
          <span>Staff Login: Phone Booking Active • Billing Restricted</span>
        </div>
      )}

      {/* Main Navigation List */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch ? item.activeMatch(pathname || "") : false;
            const isLogout = item.actionKey === "LOGOUT";

            // Interactive Actions (Logout & QR Code modal)
            if (item.isAction) {
              return (
                <li key={item.id} className={`sidebar-nav-item ${isLogout ? "logout-item" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      if (item.actionKey === "LOGOUT") {
                        setIsLogoutModalOpen(true);
                      } else if (item.actionKey === "QR_CODE") {
                        setIsQrModalOpen(true);
                      }
                    }}
                    className={`sidebar-nav-link ${isLogout ? "logout-link" : ""}`}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="sidebar-nav-icon">
                        <Icon size={18} />
                      </span>
                      <span className="sidebar-nav-label">{getNavItemLabel(item.id, item.label)}</span>
                    </div>

                    {item.actionKey === "QR_CODE" && (
                      <span className="sidebar-nav-pill qr-pill">Standee</span>
                    )}
                  </button>
                </li>
              );
            }

            // Normal Navigation Links
            return (
              <li key={item.id} className="sidebar-nav-item">
                <Link
                  href={item.href || "/dashboard"}
                  onClick={() => onClose?.()}
                  className={`sidebar-nav-link ${isActive ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="sidebar-nav-icon">
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} />
                    </span>
                    <span className="sidebar-nav-label">{getNavItemLabel(item.id, item.label)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Live queue pulsating badge */}
                    {item.id === "live-queue" && (
                      <span className="sidebar-nav-pill live-pill">
                        <span className="live-dot" /> Live
                      </span>
                    )}

                    {/* QR link pill */}
                    {item.id === "qr-code" && (
                      <span className="sidebar-nav-pill qr-pill">Standee</span>
                    )}

                    {/* Profile & Portfolio pill */}
                    {item.id === "my-profile" && (
                      <span className="sidebar-nav-pill profile-pill">Public</span>
                    )}

                    {/* Telephone Appointment Booking Badge for Staff */}
                    {isStaff && item.phoneBookingAllowed && (
                      <span
                        title="Doctor permitted: Staff can book appointments by phone"
                        className="sidebar-nav-pill phone-pill"
                      >
                        <PhoneCall size={9} />
                        Phone
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Medical Summary Card */}
      <div className="sidebar-bottom-promo" style={{ marginTop: 20 }}>
        <div className="sidebar-suite-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="suite-pulse-dot" />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isHospital ? "#60a5fa" : isStaff ? "#34d399" : "#e5b869",
              }}
            >
              {isHospital
                ? "Hospital Care Suite"
                : isStaff
                ? "Doctor Staff Desk"
                : "Doctor Practice Suite"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.45 }}>
            {isHospital
              ? "Departments, Chambers & Live OPD Roster"
              : isStaff
              ? "Reception Desk • Phone Booking Active"
              : "HIPAA Compliant • Practice Online"}
          </p>
        </div>
      </div>

      {/* MODAL 1: DUAL SCANNABLE QR CODES MODAL (PORTFOLIO + BOOKING) */}
      <DoctorQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        initialProfile={currentUser}
      />


      {/* MODAL 2: LOGOUT CONFIRMATION (PORTALED TO BODY) */}
      {mounted && isLogoutModalOpen && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 420,
              padding: "26px 28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#ef4444",
              }}
            >
              <LogOut size={24} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
              Sign Out of Portal?
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.5 }}>
              Are you sure you want to log out of your{" "}
              {isHospital ? "Hospital / Clinic" : isStaff ? "Staff" : "Doctor"} session?
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
