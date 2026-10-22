"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { getAdminMe } from "@/lib/api/admin-client";

export interface AdminLayoutClientProps {
  readonly children: ReactNode;
}

const ALLOWED_ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "BILLING_ADMIN",
  "AUDIT_VIEWER",
]);

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!isLoginPage);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Authenticated Super Admin route protection
  useEffect(() => {
    if (isLoginPage) {
      setAdminUser(null);
      setIsAuthorized(false);
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;

    // If not yet authorized, show loading state and verify session
    if (!isAuthorized) {
      setIsCheckingAuth(true);
      getAdminMe()
        .then((res) => {
          if (!isMounted) return;
          const role = res?.user?.role;
          if (role && ALLOWED_ADMIN_ROLES.has(role)) {
            setAdminUser(res.user);
            setIsAuthorized(true);
            setIsCheckingAuth(false);
          } else {
            setAdminUser(null);
            setIsAuthorized(false);
            setIsCheckingAuth(false);
            router.replace("/admin/login");
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setAdminUser(null);
          setIsAuthorized(false);
          setIsCheckingAuth(false);
          router.replace("/admin/login");
        });
    } else {
      // Already authorized: silently verify session validity on route change
      getAdminMe()
        .then((res) => {
          if (!isMounted) return;
          const role = res?.user?.role;
          if (!role || !ALLOWED_ADMIN_ROLES.has(role)) {
            setAdminUser(null);
            setIsAuthorized(false);
            router.replace("/admin/login");
          } else if (res?.user) {
            setAdminUser(res.user);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setAdminUser(null);
          setIsAuthorized(false);
          router.replace("/admin/login");
        });
    }

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, isAuthorized, router]);

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

  // Dedicated Super Admin login page (bypass sidebar and topbar)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state: do not render protected sidebar, topbar, or content
  if (isCheckingAuth || !isAuthorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--admin-bg, #060b13)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          color: "var(--admin-text-secondary, #94a3b8)",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(229, 184, 105, 0.18)",
            borderTopColor: "var(--admin-gold, #e5b869)",
            borderRadius: "50%",
            animation: "admin-auth-spin 0.8s linear infinite",
          }}
        />
        <style>{`
          @keyframes admin-auth-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.08em",
            color: "var(--admin-gold, #e5b869)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Verifying Super Admin Authorization...
        </div>
      </div>
    );
  }

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
        adminUser={adminUser}
      />

      {/* Main Administrative Column */}
      <div className="admin-main-wrapper">
        <AdminTopbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          adminUser={adminUser}
        />
        <main className="admin-main-content">{children}</main>
      </div>
    </div>
  );
}
