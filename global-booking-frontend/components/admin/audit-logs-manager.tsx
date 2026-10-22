"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Shield,
  Activity,
  User,
  Filter,
} from "lucide-react";
import { getAuditLogs } from "@/lib/api/admin-client";

export function AuditLogsManager() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAuditLogs({
        search: searchTerm.trim() || undefined,
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
      });
      setLogs(res.items || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs from database.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("CREATED") || action.includes("ACTIVATED")) {
      return { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" };
    }
    if (action.includes("REJECTED") || action.includes("SUSPENDED")) {
      return { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" };
    }
    return { bg: "rgba(229,184,105,0.15)", text: "#e5b869", border: "rgba(229,184,105,0.3)" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.08) 0%, rgba(11,19,37,0.85) 100%)",
          border: "1px solid rgba(229,184,105,0.25)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ShieldAlert size={24} color="#e5b869" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>
              Security & Audit Logs
            </h1>
            <span
              style={{
                background: "rgba(229,184,105,0.15)",
                color: "#e5b869",
                border: "1px solid rgba(229,184,105,0.3)",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {totalCount} Immutable Records
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Immutable administrative audit trail recorded directly into MongoDB Atlas for compliance and security oversight.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Logs
        </button>
      </div>

      {/* Search & Category Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ position: "relative", minWidth: 320, flex: 1, maxWidth: 440 }}>
          <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Admin Email, Target Name, or Summary..."
            style={{
              width: "100%",
              background: "#0b1325",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px 10px 38px",
              color: "#fff",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, background: "#0b1325", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: "All Categories" },
            { key: "REGISTRATION_REVIEW", label: "Registrations" },
            { key: "ACCOUNT_LIFECYCLE", label: "Accounts" },
            { key: "SUBSCRIPTION_MANAGEMENT", label: "Subscriptions" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              style={{
                background: categoryFilter === cat.key ? "#e5b869" : "transparent",
                color: categoryFilter === cat.key ? "#060b13" : "#94a3b8",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            padding: "14px 18px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Logs List */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#e5b869" }} />
          <p style={{ margin: 0, fontSize: 15 }}>Loading audit history from MongoDB Atlas...</p>
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            background: "#0b1325",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <Shield size={44} color="#64748b" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>
            No Audit Logs Recorded Yet
          </h3>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 440, margin: "0 auto" }}>
            Administrative actions such as approving applications, creating accounts, or suspending providers will automatically appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {logs.map((log) => {
            const badge = getActionBadgeColor(log.action);
            return (
              <div
                key={log.id}
                style={{
                  background: "#0b1325",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {log.action}
                    </span>

                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      Category: <strong style={{ color: "#fff" }}>{log.category}</strong>
                    </span>

                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      Target: <code style={{ color: "#e5b869" }}>{log.targetType} ({log.targetId})</code>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                    <Clock size={13} />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                    <span>• IP: {log.ipAddress}</span>
                  </div>
                </div>

                <div style={{ fontSize: 14, color: "#e2e8f0" }}>
                  {log.summary}
                </div>

                {log.reason && (
                  <div style={{ fontSize: 12, color: "#fca5a5", background: "rgba(239,68,68,0.06)", padding: "6px 10px", borderRadius: 6 }}>
                    <strong>Reason:</strong> {log.reason}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                  <User size={13} />
                  <span>Actor: <strong style={{ color: "#fff" }}>{log.actor?.adminEmail || "Super Admin"}</strong> ({log.actor?.adminRole || "SUPER_ADMIN"})</span>
                  <span style={{ marginLeft: "auto", fontFamily: "monospace", color: "#64748b" }}>{log.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
