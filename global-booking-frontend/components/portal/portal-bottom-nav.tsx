"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, BarChart2, MoreHorizontal } from "lucide-react";

export interface PortalBottomNavProps {
  readonly onOpenSidebar?: () => void;
}

export function PortalBottomNav({ onOpenSidebar }: PortalBottomNavProps) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/dashboard" || pathname === "/live-queue" || pathname === "/";
  const isPatientsActive = pathname.startsWith("/patients");
  const isScheduleActive = pathname.startsWith("/availability") || pathname.startsWith("/schedule");
  const isReportsActive = pathname.startsWith("/reports");

  return (
    <nav className="portal-mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <Link href="/live-queue" className={`bottom-nav-item ${isHomeActive ? "active" : ""}`}>
        <Home size={19} className="bottom-nav-icon" />
        <span>Home</span>
        {isHomeActive && <span className="bottom-nav-indicator" />}
      </Link>

      <Link href="/patients" className={`bottom-nav-item ${isPatientsActive ? "active" : ""}`}>
        <Users size={19} className="bottom-nav-icon" />
        <span>Patients</span>
        {isPatientsActive && <span className="bottom-nav-indicator" />}
      </Link>

      <Link href="/availability" className={`bottom-nav-item ${isScheduleActive ? "active" : ""}`}>
        <Calendar size={19} className="bottom-nav-icon" />
        <span>Schedule</span>
        {isScheduleActive && <span className="bottom-nav-indicator" />}
      </Link>

      <Link href="/reports" className={`bottom-nav-item ${isReportsActive ? "active" : ""}`}>
        <BarChart2 size={19} className="bottom-nav-icon" />
        <span>Reports</span>
        {isReportsActive && <span className="bottom-nav-indicator" />}
      </Link>

      <button
        type="button"
        className="bottom-nav-item"
        onClick={onOpenSidebar}
        aria-label="Open full portal menu"
      >
        <MoreHorizontal size={19} className="bottom-nav-icon" />
        <span>More</span>
      </button>
    </nav>
  );
}
