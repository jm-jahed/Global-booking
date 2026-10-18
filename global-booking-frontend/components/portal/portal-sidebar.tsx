"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users2,
  User,
  HeartPulse,
  UserCheck,
  QrCode,
  BarChart3,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/config/routes";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    activeMatch: (path: string) => path === "/dashboard" || path === "/dashboard/",
  },
  {
    label: "Appointments",
    href: ROUTES.appointments,
    icon: CalendarDays,
    activeMatch: (path: string) => path.startsWith("/appointments"),
  },
  {
    label: "Live Queue",
    href: "/live-queue",
    icon: Users2,
    activeMatch: (path: string) => path.startsWith("/live-queue"),
  },
  {
    label: "Customers",
    href: ROUTES.customers,
    icon: User,
    activeMatch: (path: string) => path.startsWith("/customers") || path.startsWith("/clients") || path.startsWith("/patients"),
  },
  {
    label: "Services",
    href: ROUTES.services,
    icon: HeartPulse,
    activeMatch: (path: string) => path.startsWith("/services"),
  },
  {
    label: "Staff",
    href: ROUTES.staff,
    icon: UserCheck,
    activeMatch: (path: string) => path.startsWith("/staff"),
  },
  {
    label: "QR Booking",
    href: "/dashboard#qr-booking",
    icon: QrCode,
    activeMatch: () => false,
  },
  {
    label: "Reports & Analytics",
    href: ROUTES.adminReports,
    icon: BarChart3,
    activeMatch: (path: string) => path.startsWith("/admin/reports"),
  },
  {
    label: "Settings",
    href: ROUTES.settings,
    icon: Settings,
    activeMatch: (path: string) => path.startsWith("/settings"),
  },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="portal-sidebar" aria-label="Portal Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand-wrapper">
        <Link href={ROUTES.dashboard} className="sidebar-brand-link">
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
              {/* 6 grid dots */}
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
            <p className="sidebar-brand-sub">Smarter Appointments. Better Business.</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation List */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch(pathname || "");

            return (
              <li key={item.label} className="sidebar-nav-item">
                <Link
                  href={item.href}
                  className={`sidebar-nav-link ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-nav-icon">
                    <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />
                  </span>
                  <span className="sidebar-nav-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Promo Card */}
      <div className="sidebar-bottom-promo">
        <div className="promo-card">
          <div className="promo-bg-wrapper">
            <Image
              src="/images/luxury-lounge.jpg"
              alt="Manage Your Business More Efficiently"
              fill
              className="promo-bg-image"
              sizes="240px"
            />
            <div className="promo-gradient-overlay" />
            {/* Elegant golden curve wave SVG overlay */}
            <svg
              className="promo-gold-ribbon"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M-20,90 Q50,20 120,60 T220,10"
                stroke="#e5b869"
                strokeWidth="1.5"
                strokeOpacity="0.45"
              />
              <path
                d="M-10,95 Q60,35 130,70 T230,25"
                stroke="#d4a757"
                strokeWidth="0.75"
                strokeOpacity="0.3"
              />
            </svg>
          </div>
          <div className="promo-content">
            <h4 className="promo-title">Manage Your Business More Efficiently</h4>
            <p className="promo-tags">Bookings • Customers • Growth</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
