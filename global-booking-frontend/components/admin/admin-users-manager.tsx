"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Key,
  Power,
  Eye,
  EyeOff,
  Filter,
  Check,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUserStatus,
  updateAdminUserPermissions,
  type AdminUserItem,
  type SuperAdminRole,
  type AdminPermission,
} from "@/lib/api/admin-client";

const ALL_ROLES: { role: SuperAdminRole; label: string; badgeColor: string; description: string }[] = [
  {
    role: "SUPER_ADMIN",
    label: "Super Admin",
    badgeColor: "#e5b869",
    description: "Full platform governance, user management, and security policies.",
  },
  {
    role: "OPS_ADMIN",
    label: "Operations Admin",
    badgeColor: "#3b82f6",
    description: "Provider registration approvals, provider management, and subscriptions.",
  },
  {
    role: "COMPLIANCE_OFFICER",
    label: "Compliance Officer",
    badgeColor: "#8b5cf6",
    description: "License verification, provider reviews, and immutable audit logs.",
  },
  {
    role: "SUPPORT_LEAD",
    label: "Support Lead",
    badgeColor: "#10b981",
    description: "Doctor and Hospital operations, verification support, and inquiries.",
  },
  {
    role: "AUDIT_VIEWER",
    label: "Audit Viewer",
    badgeColor: "#94a3b8",
    description: "Read-only access to audit logs and provider records for compliance.",
  },
];

const PERMISSIONS_CATALOG: { key: AdminPermission; label: string; description: string }[] = [
  {
    key: "MANAGE_ADMIN_USERS",
    label: "Manage Admin Users",
    description: "Create, edit, and deactivate administrative staff and access permissions.",
  },
  {
    key: "MANAGE_REGISTRATIONS",
    label: "Manage Registrations",
    description: "Review, approve, or reject Doctor and Hospital onboarding applications.",
  },
  {
    key: "MANAGE_DOCTORS",
    label: "Manage Doctors",
    description: "Create doctor accounts, modify profiles, and manage active status.",
  },
  {
    key: "VIEW_DOCTORS",
    label: "View Doctors",
    description: "Read-only directory of verified doctors and active subscriptions.",
  },
  {
    key: "MANAGE_HOSPITALS",
    label: "Manage Hospitals",
    description: "Create hospital accounts, modify institutional details, and suspend access.",
  },
  {
    key: "VIEW_HOSPITALS",
    label: "View Hospitals",
    description: "Read-only access to hospital profiles and institutional subscriptions.",
  },
  {
    key: "MANAGE_SUBSCRIPTIONS",
    label: "Manage Subscriptions",
    description: "Extend trial periods, manage AED subscription plans, and review lifecycle.",
  },
  {
    key: "VIEW_AUDIT_LOGS",
    label: "View Audit Logs",
    description: "Inspect immutable security trails, login sessions, and permission audits.",
  },
  {
    key: "MANAGE_PLATFORM_SETTINGS",
    label: "Manage Platform Settings",
    description: "Configure system policies, security parameters, and onboarding rules.",
  },
];

function getDefaultPermissionsForRole(role: SuperAdminRole): AdminPermission[] {
  switch (role) {
    case "SUPER_ADMIN":
      return PERMISSIONS_CATALOG.map((p) => p.key);
    case "OPS_ADMIN":
      return [
        "MANAGE_REGISTRATIONS",
        "MANAGE_DOCTORS",
        "VIEW_DOCTORS",
        "MANAGE_HOSPITALS",
        "VIEW_HOSPITALS",
        "MANAGE_SUBSCRIPTIONS",
        "VIEW_AUDIT_LOGS",
      ];
    case "COMPLIANCE_OFFICER":
      return [
        "MANAGE_REGISTRATIONS",
        "VIEW_DOCTORS",
        "VIEW_HOSPITALS",
        "VIEW_AUDIT_LOGS",
      ];
    case "SUPPORT_LEAD":
      return [
        "MANAGE_REGISTRATIONS",
        "MANAGE_DOCTORS",
        "VIEW_DOCTORS",
        "MANAGE_HOSPITALS",
        "VIEW_HOSPITALS",
        "MANAGE_SUBSCRIPTIONS",
        "VIEW_AUDIT_LOGS",
      ];
    case "AUDIT_VIEWER":
      return ["VIEW_AUDIT_LOGS"];
  }
}

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<AdminUserItem | null>(null);
  const [statusTogglingUser, setStatusTogglingUser] = useState<AdminUserItem | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<SuperAdminRole>("OPS_ADMIN");
  const [newPermissions, setNewPermissions] = useState<AdminPermission[]>(getDefaultPermissionsForRole("OPS_ADMIN"));
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Permissions Edit Form State
  const [editRole, setEditRole] = useState<SuperAdminRole>("OPS_ADMIN");
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [editReason, setEditReason] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Toggle Form State
  const [statusReason, setStatusReason] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminUsers({
        search: searchTerm.trim() || undefined,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setUsers(res.items || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin users from database.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Role change in Add form
  const handleRoleChangeForAdd = (role: SuperAdminRole) => {
    setNewRole(role);
    setNewPermissions(getDefaultPermissionsForRole(role));
  };

  // Generate random secure password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setAddError("Name, email, and password are required.");
      return;
    }

    if (newPassword.length < 8) {
      setAddError("Password must be at least 8 characters.");
      return;
    }

    try {
      setSubmittingAdd(true);
      await createAdminUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        permissions: newPermissions,
      });
      setIsAddModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("OPS_ADMIN");
      setNewPermissions(getDefaultPermissionsForRole("OPS_ADMIN"));
      setSuccessMessage("Administrator account created and saved to database.");
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create administrator account.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Permissions Edit Modal
  const openEditPermissionsModal = (user: AdminUserItem) => {
    setEditingPermissionsUser(user);
    setEditRole(user.role);
    setEditPermissions([...user.permissions]);
    setEditReason("");
    setEditError(null);
  };

  // Submit Edit Permissions
  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;
    setEditError(null);

    if (editPermissions.length === 0) {
      setEditError("At least one permission must be granted.");
      return;
    }

    try {
      setSubmittingEdit(true);
      await updateAdminUserPermissions(editingPermissionsUser.adminId, {
        role: editRole,
        permissions: editPermissions,
        reason: editReason.trim() || undefined,
      });
      setEditingPermissionsUser(null);
      setSuccessMessage(`Permissions updated for ${editingPermissionsUser.name}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update permissions.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Status Toggle Modal
  const openStatusToggleModal = (user: AdminUserItem) => {
    setStatusTogglingUser(user);
    setStatusReason("");
    setStatusError(null);
  };

  // Submit Status Toggle
  const handleToggleStatus = async () => {
    if (!statusTogglingUser) return;
    setStatusError(null);

    const targetActive = !statusTogglingUser.isActive;

    try {
      setSubmittingStatus(true);
      await updateAdminUserStatus(statusTogglingUser.adminId, {
        isActive: targetActive,
        reason: statusReason.trim() || undefined,
      });
      setStatusTogglingUser(null);
      setSuccessMessage(
        `Account ${statusTogglingUser.name} ${targetActive ? "reactivated" : "deactivated"} successfully.`,
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to change account status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  const getRoleBadge = (role: SuperAdminRole) => {
    const meta = ALL_ROLES.find((r) => r.role === role);
    const color = meta ? meta.badgeColor : "#e5b869";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${color}18`,
          border: `1px solid ${color}40`,
          color,
          padding: "4px 10px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        <Shield size={12} />
        {meta?.label || role}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Toast Banner */}
      {successMessage && (
        <div
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: 12,
            padding: "14px 20px",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            padding: "14px 20px",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.1) 0%, rgba(11,19,37,0.85) 100%)",
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
            <Users size={24} color="#e5b869" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>
              Administrator Accounts & Access Control
            </h1>
            <span
              style={{
                background: "rgba(229,184,105,0.15)",
                color: "#e5b869",
                border: "1px solid rgba(229,184,105,0.3)",
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 20,
              }}
            >
              {totalCount} Active Accounts
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Manage staff credentials, granular RBAC permissions, and administrative account lifecycles.
          </p>
        </div>

        <button
          onClick={() => {
            setAddError(null);
            setIsAddModalOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
            color: "#0b1325",
            fontWeight: 700,
            fontSize: 14,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
            transition: "all 0.2s ease",
          }}
        >
          <UserPlus size={16} />
          Add Administrator
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "rgba(11,19,37,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search
            size={16}
            color="#64748b"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or admin ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px 10px 38px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={14} color="#94a3b8" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#94a3b8",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: "rgba(11,19,37,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
            <div
              style={{
                display: "inline-block",
                width: 32,
                height: 32,
                border: "3px solid rgba(229,184,105,0.3)",
                borderTopColor: "#e5b869",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: 16,
              }}
            />
            <p style={{ margin: 0, fontSize: 14 }}>Loading administrator accounts from database...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
            <Users size={40} style={{ opacity: 0.4, margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#94a3b8" }}>No administrators found</h3>
            <p style={{ margin: 0, fontSize: 13 }}>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                    ADMINISTRATOR
                  </th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                    ASSIGNED ROLE
                  </th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                    PERMISSIONS ({PERMISSIONS_CATALOG.length} MAX)
                  </th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                    STATUS
                  </th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                    JOINED
                  </th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "#94a3b8", textAlign: "right" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.adminId}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>
                          {user.name}
                        </span>
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>{user.email}</span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "rgba(229,184,105,0.8)",
                          }}
                        >
                          {user.adminId}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "18px 20px" }}>{getRoleBadge(user.role)}</td>

                    <td style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 360 }}>
                        {user.permissions.map((perm) => (
                          <span
                            key={perm}
                            style={{
                              fontSize: 11,
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "#cbd5e1",
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {perm.replace("MANAGE_", "M: ").replace("VIEW_", "V: ")}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: "18px 20px" }}>
                      {user.isActive ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.3)",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#10b981",
                            }}
                          />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#ef4444",
                            }}
                          />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "18px 20px", fontSize: 13, color: "#94a3b8" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={12} color="#64748b" />
                        {new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    <td style={{ padding: "18px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          onClick={() => openEditPermissionsModal(user)}
                          title="Modify permissions and role"
                          style={{
                            background: "rgba(229,184,105,0.12)",
                            border: "1px solid rgba(229,184,105,0.3)",
                            color: "#e5b869",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Key size={13} />
                          Permissions
                        </button>

                        <button
                          onClick={() => openStatusToggleModal(user)}
                          title={user.isActive ? "Deactivate account" : "Reactivate account"}
                          style={{
                            background: user.isActive
                              ? "rgba(239,68,68,0.12)"
                              : "rgba(16,185,129,0.12)",
                            border: `1px solid ${
                              user.isActive ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"
                            }`,
                            color: user.isActive ? "#ef4444" : "#10b981",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Power size={13} />
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD ADMINISTRATOR */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(229,184,105,0.35)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <UserPlus size={22} color="#e5b869" />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>
                  Create Administrator
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {addError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#ef4444",
                  fontSize: 13,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tariq Mansour"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Administrative Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="tariq@globalbooking.ae"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 13, color: "#cbd5e1" }}>Initial Password *</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#e5b869",
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={12} />
                    Generate Secure
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "10px 42px 10px 14px",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Role Assignment *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => handleRoleChangeForAdd(e.target.value as SuperAdminRole)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.role} value={r.role} style={{ background: "#0c1527" }}>
                      {r.label} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>
                  Granular Permissions ({newPermissions.length} selected)
                </label>
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: 12,
                    maxHeight: 180,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {PERMISSIONS_CATALOG.map((p) => {
                    const isChecked = newPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          fontSize: 13,
                          color: isChecked ? "#fff" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPermissions([...newPermissions, p.key]);
                            } else {
                              setNewPermissions(newPermissions.filter((k) => k !== p.key));
                            }
                          }}
                          style={{ marginTop: 3 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.label}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{p.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
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
                  type="submit"
                  disabled={submittingAdd}
                  style={{
                    background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                    color: "#0b1325",
                    fontWeight: 700,
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: 10,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {submittingAdd ? "Creating..." : "Save Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PERMISSIONS */}
      {editingPermissionsUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(229,184,105,0.35)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Key size={22} color="#e5b869" />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>
                  Edit Permissions — {editingPermissionsUser.name}
                </h2>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#ef4444",
                  fontSize: 13,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                {editError}
              </div>
            )}

            <form onSubmit={handleSavePermissions} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const r = e.target.value as SuperAdminRole;
                    setEditRole(r);
                    setEditPermissions(getDefaultPermissionsForRole(r));
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.role} value={r.role} style={{ background: "#0c1527" }}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>
                  Granular Permissions Checklist
                </label>
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: 12,
                    maxHeight: 220,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {PERMISSIONS_CATALOG.map((p) => {
                    const isChecked = editPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          fontSize: 13,
                          color: isChecked ? "#fff" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditPermissions([...editPermissions, p.key]);
                            } else {
                              setEditPermissions(editPermissions.filter((k) => k !== p.key));
                            }
                          }}
                          style={{ marginTop: 3 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.label}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{p.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                  Reason for Modification (Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Assigned compliance review duties"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  style={{
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
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                    color: "#0b1325",
                    fontWeight: 700,
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: 10,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {submittingEdit ? "Saving..." : "Update Permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TOGGLE STATUS (DEACTIVATE / REACTIVATE) */}
      {statusTogglingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0c1527",
              border: `1px solid ${
                statusTogglingUser.isActive ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"
              }`,
              borderRadius: 18,
              width: "100%",
              maxWidth: 480,
              padding: "28px 32px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Power
                size={24}
                color={statusTogglingUser.isActive ? "#ef4444" : "#10b981"}
              />
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>
                {statusTogglingUser.isActive ? "Deactivate" : "Reactivate"} Account
              </h2>
            </div>

            <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 16px" }}>
              Are you sure you want to {statusTogglingUser.isActive ? "deactivate" : "reactivate"}{" "}
              <strong style={{ color: "#fff" }}>{statusTogglingUser.name}</strong> (
              <span style={{ color: "#e5b869" }}>{statusTogglingUser.email}</span>)?
              {statusTogglingUser.isActive && (
                <span style={{ display: "block", marginTop: 8, color: "#94a3b8", fontSize: 13 }}>
                  Deactivated administrators immediately lose access to the portal and protected APIs.
                  Sole Super Admin accounts cannot be deactivated to prevent system lockout.
                </span>
              )}
            </p>

            {statusError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#ef4444",
                  fontSize: 13,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                {statusError}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Staff departure or temporary leave"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setStatusTogglingUser(null)}
                style={{
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
                onClick={handleToggleStatus}
                disabled={submittingStatus}
                style={{
                  background: statusTogglingUser.isActive
                    ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {submittingStatus
                  ? "Processing..."
                  : statusTogglingUser.isActive
                  ? "Confirm Deactivation"
                  : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
