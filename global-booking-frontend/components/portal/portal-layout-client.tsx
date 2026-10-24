"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PortalSidebar, type PortalAccountType } from "./portal-sidebar";
import { PortalTopBar } from "./portal-topbar";
import { getAdminMe, getStoredAccountType, getStoredPortalUser } from "@/lib/api/admin-client";
import { ShieldAlert, ArrowLeft, Building2, Lock } from "lucide-react";

export interface PortalLayoutClientProps {
  readonly children: ReactNode;
}

/**
 * Access Restricted Screen for routes accessed out of role scope
 * (e.g. Doctor attempting to access Hospital Departments & Services, or Staff accessing Billing)
 */
function RestrictedRouteNotice({
  accountType,
  pathname,
  onReturnDashboard,
}: {
  accountType: PortalAccountType;
  pathname: string;
  onReturnDashboard: () => void;
}) {
  const isDoctorOnHospitalRoute =
    accountType === "DOCTOR" && (pathname.startsWith("/services") || pathname.startsWith("/departments"));
  const isStaffRestricted =
    accountType === "STAFF" &&
    (pathname.startsWith("/staff") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/services"));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        textAlign: "center",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          marginBottom: 20,
        }}
      >
        <Lock size={30} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", margin: "0 0 10px" }}>
        {isDoctorOnHospitalRoute
          ? "Institutional Feature Restricted"
          : isStaffRestricted
          ? "Staff Access Restricted"
          : "Access Restricted"}
      </h2>

      <p
        style={{
          maxWidth: 520,
          fontSize: 14,
          color: "#94a3b8",
          lineHeight: 1.6,
          margin: "0 0 28px",
        }}
      >
        {isDoctorOnHospitalRoute ? (
          <>
            <strong>Departments & Specializations</strong> is an institutional management feature
            reserved exclusively for <strong>Hospital & Clinic</strong> accounts. Individual Doctor
            accounts manage their personal practice, patients, schedule, and professional portfolio.
          </>
        ) : isStaffRestricted ? (
          <>
            Staff accounts are restricted from accessing Staff Management, Subscription & Billing,
            or Institutional Catalogs by default. Please contact the primary Doctor for administrative
            authorization.
          </>
        ) : (
          <>You do not have authorization to access this section from your current account type.</>
        )}
      </p>

      <button
        type="button"
        onClick={onReturnDashboard}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
          color: "#0b1325",
          fontWeight: 700,
          fontSize: 14,
          padding: "10px 24px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
        }}
      >
        <ArrowLeft size={16} />
        Return to Dashboard
      </button>
    </div>
  );
}

export function PortalLayoutClient({ children }: PortalLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accountType, setAccountType] = useState<PortalAccountType>("DOCTOR");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Close mobile sidebar on Escape key or desktop resize
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 1024) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check authenticated session via backend /api/v1/auth/admin/me
    getAdminMe()
      .then((res) => {
        if (!isMounted) return;
        const user = res?.user;
        if (!user) {
          // Unauthenticated -> redirect to login
          setIsAuthorized(false);
          setIsCheckingAuth(false);
          router.replace("/login");
          return;
        }

        // Authenticated: determine role
        setCurrentUser(user);
        setIsAuthorized(true);
        setIsCheckingAuth(false);

        if (user.role === "HOSPITAL") {
          setAccountType("HOSPITAL");
        } else if (user.role === "STAFF") {
          setAccountType("STAFF");
        } else {
          // Default to Doctor account
          setAccountType("DOCTOR");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback check to stored session before hard redirect
        const storedUser = getStoredPortalUser();
        const storedType = getStoredAccountType();

        if (storedUser && storedUser.role) {
          setCurrentUser(storedUser);
          setIsAuthorized(true);
          setIsCheckingAuth(false);
          if (storedUser.role === "HOSPITAL" || storedType === "HOSPITAL") {
            setAccountType("HOSPITAL");
          } else if (storedUser.role === "STAFF" || storedType === "STAFF") {
            setAccountType("STAFF");
          } else {
            setAccountType("DOCTOR");
          }
        } else {
          setIsAuthorized(false);
          setIsCheckingAuth(false);
          router.replace("/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Route Restriction Checks
  const isDoctorAccount = accountType === "DOCTOR";
  const isStaffAccount = accountType === "STAFF";

  // Doctors cannot access /services (Departments & Specializations is hospital only)
  const isHospitalOnlyRoute =
    pathname.startsWith("/services") || pathname.startsWith("/departments");
  const isStaffRestrictedRoute =
    pathname.startsWith("/staff") || pathname.startsWith("/pricing");

  const isRestricted =
    (isDoctorAccount && isHospitalOnlyRoute) ||
    (isStaffAccount && (isHospitalOnlyRoute || isStaffRestrictedRoute));

  // Loading Screen while verifying session
  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#060b13",
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(229,184,105,0.08) 0%, rgba(6,11,19,0.98) 75%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: "3px solid rgba(229,184,105,0.25)",
            borderTopColor: "#e5b869",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>
            Verifying Healthcare Portal Session
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            Enforcing role boundaries and data isolation...
          </p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="portal-layout-container">
      {/* Mobile Backdrop */}
      <div
        className={`portal-mobile-backdrop ${isMobileSidebarOpen ? "sidebar-open" : ""}`}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar strictly locked to authenticated account type (no manual switcher) */}
      <PortalSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        accountType={accountType}
        currentUser={currentUser}
      />

      <div className="portal-main-wrapper">
        <PortalTopBar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          accountType={accountType}
          currentUser={currentUser}
        />
        <main className="portal-main-content">
          {isRestricted ? (
            <RestrictedRouteNotice
              accountType={accountType}
              pathname={pathname}
              onReturnDashboard={() => router.push("/dashboard")}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
