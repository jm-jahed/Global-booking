"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export interface AdminLayoutClientProps {
  readonly children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on desktop resize or Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 1024) {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="admin-layout-container">
      {/* Mobile Backdrop */}
      <div
        className={`admin-mobile-backdrop ${isSidebarOpen ? "sidebar-open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Super Admin Dedicated Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Administrative Column */}
      <div className="admin-main-wrapper">
        <AdminTopbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
        <main className="admin-main-content">{children}</main>
      </div>
    </div>
  );
}
