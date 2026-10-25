"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminMe, getStoredAccountType, getStoredPortalUser } from "@/lib/api/admin-client";
import { StaffView } from "@/components/portal/staff/staff-view";
import { Lock, ArrowLeft } from "lucide-react";

export function StaffPageGuard() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized" | "denied">("checking");
  const [denialMessage, setDenialMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    // Fast synchronous check to prevent flash of content
    const storedType = getStoredAccountType();
    const storedUser = getStoredPortalUser();
    if (storedType === "STAFF" || storedUser?.role === "STAFF") {
      setStatus("denied");
      setDenialMessage("Staff accounts are not authorized to view or manage staff directories.");
      router.replace("/live-queue");
      return;
    }

    // Authoritative backend verification via /api/v1/auth/admin/me
    getAdminMe()
      .then((res) => {
        if (!isMounted) return;
        const user = res?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        if (user.role === "STAFF") {
          setStatus("denied");
          setDenialMessage("Staff accounts are not authorized to view or manage staff directories.");
          router.replace("/live-queue");
          return;
        }

        setStatus("authorized");
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback session verification
        const fallbackType = getStoredAccountType();
        const fallbackUser = getStoredPortalUser();
        if (fallbackType === "STAFF" || fallbackUser?.role === "STAFF") {
          setStatus("denied");
          setDenialMessage("Staff accounts are not authorized to view or manage staff directories.");
          router.replace("/live-queue");
        } else {
          setStatus("authorized");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (status === "checking") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "#94a3b8",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(229,184,105,0.2)",
            borderTopColor: "#e5b869",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: 12,
          }}
        />
        <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>
          Verifying administrative authorization...
        </p>
      </div>
    );
  }

  if (status === "denied") {
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
          Staff Management Restricted
        </h2>
        <p style={{ maxWidth: 500, fontSize: 14, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 24px" }}>
          {denialMessage || "Staff accounts do not have permission to access Staff Management. Administrative authority is restricted to registered Doctors."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/live-queue")}
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
          }}
        >
          <ArrowLeft size={16} />
          Go to Live Queue
        </button>
      </div>
    );
  }

  return <StaffView />;
}
