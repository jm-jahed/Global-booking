"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserCheck,
  Users,
  Plus,
  Shield,
  Search,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Building2,
  Lock,
  Sparkles,
  Key,
} from "lucide-react";
import { AddStaffModal, type StaffMember } from "./add-staff-modal";
import { useTranslation } from "@/lib/i18n/i18n-context";
import {
  getDoctorProfile,
  getStoredPortalUser,
  getDoctorStaff,
  createDoctorStaff,
  updateDoctorStaff,
  deleteDoctorStaff,
  type DoctorChamberDetail,
  type BackendStaffRecord,
} from "@/lib/api/admin-client";

export function getDoctorStaffCacheKey(doctorId?: string): string {
  return `gb_staff_cache_${doctorId ? encodeURIComponent(doctorId) : "default"}`;
}

export function backendRecordToStaffMember(record: BackendStaffRecord): StaffMember {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone || "—",
    role: record.staffRole,
    chamberLocation: record.chamberLocation || "All Practice Chambers",
    status: record.accountStatus === "ACTIVE" ? "Active" : "Suspended",
    permissions: record.permissions,
    createdAt: record.createdAt,
    lastActive: record.lastLoginAt ? "Active Recently" : "Active (Direct)",
  };
}

export function StaffView() {
  const { t } = useTranslation("staff");
  const { t: tCommon } = useTranslation("common");
  const [doctorName, setDoctorName] = useState("Doctor Practice");
  const [doctorSpecialty, setDoctorSpecialty] = useState("Healthcare Professional");
  const [chambers, setChambers] = useState<DoctorChamberDetail[]>([]);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [chamberFilter, setChamberFilter] = useState<string>("All");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Fetch staff list authoritatively from backend API
  const fetchStaffList = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const res = await getDoctorStaff();
      if (res?.staff && Array.isArray(res.staff)) {
        const mapped = res.staff.map(backendRecordToStaffMember);
        setStaffList(mapped);
        setIsLoading(false);
        setApiError(null);

        // Update strictly doctor-scoped cache
        try {
          const user = getStoredPortalUser();
          const docId = user?.id || user?.doctorId;
          if (docId) {
            localStorage.setItem(getDoctorStaffCacheKey(docId), JSON.stringify(mapped));
          }
        } catch {}
        return;
      }

      setStaffList([]);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || "Failed to connect to backend server to load practice staff records.";
      setApiError(msg);
      // Strictly do not show fake demo or stale records as genuine database records
      setStaffList([]);
    }
  }, [backendRecordToStaffMember]);

  // Load stored doctor info and trigger staff fetch
  useEffect(() => {
    const user = getStoredPortalUser();
    if (user?.fullName) setDoctorName(user.fullName);
    if (user?.specialty) setDoctorSpecialty(user.specialty);

    getDoctorProfile().then((res) => {
      if (res?.doctor?.chambers && Array.isArray(res.doctor.chambers)) {
        setChambers(res.doctor.chambers);
      }
    }).catch(() => {});

    fetchStaffList();
  }, [fetchStaffList]);

  // Add Staff Member
  const handleAddStaff = async (newStaff: StaffMember, password?: string) => {
    if (!password) {
      setActionNotice("Password is required to provision staff login.");
      return false;
    }

    try {
      const res = await createDoctorStaff({
        name: newStaff.name,
        email: newStaff.email,
        password,
        role: newStaff.role,
        phone: newStaff.phone,
        chamberLocation: newStaff.chamberLocation,
        permissions: newStaff.permissions,
      });

      if (res?.staff) {
        const created = backendRecordToStaffMember(res.staff);
        const updated = [created, ...staffList.filter((s) => s.id !== created.id)];
        setStaffList(updated);
        try {
          const user = getStoredPortalUser();
          const docId = user?.id || user?.doctorId;
          if (docId) {
            localStorage.setItem(getDoctorStaffCacheKey(docId), JSON.stringify(updated));
          }
        } catch {}
        setActionNotice(`Staff account for "${created.name}" created with email and secure password.`);
        setTimeout(() => setActionNotice(null), 4000);
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err?.message || err?.error || "Failed to create staff account.";
      setActionNotice(`Notice: ${msg}`);
      setTimeout(() => setActionNotice(null), 5000);
      throw err;
    }
  };

  // Toggle Status
  const handleToggleStatus = async (id: string) => {
    const target = staffList.find((s) => s.id === id);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "Suspended" : "Active";
    const backendStatus = nextStatus === "Active" ? "ACTIVE" : "SUSPENDED";

    try {
      const res = await updateDoctorStaff(id, { accountStatus: backendStatus });
      if (res?.staff) {
        const updatedRecord = backendRecordToStaffMember(res.staff);
        const updated = staffList.map((s) => (s.id === id ? updatedRecord : s));
        setStaffList(updated);
        try {
          const user = getStoredPortalUser();
          const docId = user?.id || user?.doctorId;
          if (docId) {
            localStorage.setItem(getDoctorStaffCacheKey(docId), JSON.stringify(updated));
          }
        } catch {}
        setActionNotice(`Staff account "${updatedRecord.name}" is now ${nextStatus.toUpperCase()}.`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err: any) {
      setActionNotice(`Failed to update status: ${err?.message || "Server error"}`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Remove Staff Member
  const handleRemoveStaff = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from practice staff access?`)) {
      try {
        await deleteDoctorStaff(id);
        const updated = staffList.filter((s) => s.id !== id);
        setStaffList(updated);
        try {
          const user = getStoredPortalUser();
          const docId = user?.id || user?.doctorId;
          if (docId) {
            localStorage.setItem(getDoctorStaffCacheKey(docId), JSON.stringify(updated));
          }
        } catch {}
        setActionNotice(`Staff member "${name}" was permanently removed.`);
        setTimeout(() => setActionNotice(null), 3000);
      } catch (err: any) {
        setActionNotice(`Failed to remove staff: ${err?.message || "Server error"}`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    }
  };

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.phone.includes(searchQuery);

      const matchesRole = roleFilter === "All" || staff.role === roleFilter;
      const matchesChamber =
        chamberFilter === "All" ||
        staff.chamberLocation === chamberFilter ||
        staff.chamberLocation === "All Practice Chambers";

      return matchesSearch && matchesRole && matchesChamber;
    });
  }, [staffList, searchQuery, roleFilter, chamberFilter]);

  // KPI Calculations
  const totalStaffCount = staffList.length;
  const activeCount = staffList.filter((s) => s.status === "Active").length;
  const frontDeskCount = staffList.filter((s) => s.role === "Receptionist / Front Desk").length;
  const nurseCount = staffList.filter((s) => s.role === "Clinical Nurse").length;

  return (
    <div className="staff-page-container">
      {/* 1. TOP LUXURY HEADER */}
      <header className="staff-header" aria-label="Staff Management Header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
              border: "1px solid rgba(229,184,105,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              boxShadow: "0 4px 16px rgba(229,184,105,0.12)",
            }}
          >
            <UserCheck size={24} strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#ffffff", letterSpacing: "-0.01em" }}>
              {t("staffManagement", undefined, "Staff Management")}
            </h1>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{doctorName} • {doctorSpecialty}</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  background: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                {t("rbacActive", undefined, "RBAC Access Active")}
              </span>
            </div>
          </div>
        </div>

        <div className="staff-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
              border: "none",
              color: "#050b14",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>{t("inviteNewStaff", undefined, "Invite New Staff Member")}</span>
          </button>
        </div>
      </header>

      {/* ACTION NOTICE TOAST */}
      {actionNotice && (
        <div
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#6ee7b7",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* API ERROR / RETRY BANNER */}
      {apiError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            padding: "14px 18px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={20} color="#ef4444" />
            <div>
              <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13.5 }}>
                {t("unableToRetrieve", undefined, "Unable to Retrieve Database Staff Records")}
              </div>
              <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 2 }}>{apiError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchStaffList()}
            style={{
              background: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ffffff",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("retryConnection", undefined, "Retry Connection")}
          </button>
        </div>
      )}

      {/* 2. FOUR LUXURY KPI METRIC CARDS (2x2 on Mobile, 4x1 on Desktop) */}
      <section className="staff-kpi-grid" aria-label="Staff Overview Metrics">
        {/* KPI 1: Total Staff */}
        <div className="staff-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("totalStaff", undefined, "Total Practice Staff")}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(229,184,105,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={15} color="#e5b869" />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>
            {totalStaffCount} <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>{t("members", undefined, "Members")}</span>
          </div>
          <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span>{t("activeAccounts", { count: activeCount }, `${activeCount} Active Accounts`)}</span>
          </div>
        </div>

        {/* KPI 2: Reception & Front Desk */}
        <div className="staff-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("frontDeskStaff", undefined, "Front Desk Staff")}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(56,189,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Phone size={15} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>
            {frontDeskCount} <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>{t("receptionists", undefined, "Receptionists")}</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            {t("opdQueueCallers", undefined, "OPD Queue & Token Callers")}
          </div>
        </div>

        {/* KPI 3: Clinical Nurses */}
        <div className="staff-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("clinicalNurses", undefined, "Clinical Nurses")}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>
            {nurseCount} <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>{t("assigned", undefined, "Assigned")}</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            {t("patientPrepVitals", undefined, "Patient Prep & Clinical Vitals")}
          </div>
        </div>

        {/* KPI 4: Security & Access Control */}
        <div className="staff-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8e9fb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("accessControl", undefined, "Access Control")}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={15} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
            {t("doctorSuperAdmin", undefined, "Doctor Super Admin")}
          </div>
          <div style={{ fontSize: 11, color: "#e5b869", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Shield size={11} color="#e5b869" />
            <span>{t("leastPrivilege", undefined, "Strict Least-Privilege Enforced")}</span>
          </div>
        </div>
      </section>

      {/* 3. STAFF DIRECTORY & SEARCH TOOLBAR */}
      <section className="staff-table-card" aria-label="Staff Directory">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} color="#e5b869" />
              <span>Practice Staff Directory ({filteredStaff.length})</span>
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Authorized receptionists, nursing staff, and chamber supervisors for Dr. Jahedul Islam.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%", maxWidth: "600px" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, phone..."
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "8px 12px 8px 32px",
                  color: "#ffffff",
                  fontSize: 12.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10, top: 10 }} />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                background: "#08101e",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "#cbd5e1",
                fontSize: 12,
                outline: "none",
              }}
            >
              <option value="All">All Roles</option>
              <option value="Receptionist / Front Desk">Receptionist</option>
              <option value="Clinical Nurse">Clinical Nurse</option>
              <option value="Chamber Manager">Chamber Manager</option>
            </select>
          </div>
        </div>

        {/* 4A: DESKTOP TABLE VIEW (Visible on >= 769px) */}
        <div className="staff-desktop-table">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#8e9fb5", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px" }}>Staff Member</th>
                <th style={{ padding: "10px 12px" }}>Clinical Role</th>
                <th style={{ padding: "10px 12px" }}>Chamber Branch</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Last Activity</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => {
                  const initials = staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  const isNurse = staff.role === "Clinical Nurse";
                  const isManager = staff.role === "Chamber Manager";
                  const isReception = staff.role === "Receptionist / Front Desk";

                  return (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: staff.status === "Suspended" ? "rgba(239,68,68,0.02)" : "transparent",
                      }}
                    >
                      {/* Name & Contact */}
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              minWidth: 34,
                              borderRadius: "50%",
                              background: isNurse
                                ? "linear-gradient(135deg, #10b981 0%, #047857 100%)"
                                : isManager
                                ? "linear-gradient(135deg, #e5b869 0%, #b88628 100%)"
                                : "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isManager ? "#050b14" : "#ffffff",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>
                              {staff.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{staff.email}</span>
                              <span>•</span>
                              <span>{staff.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clinical Role Badge */}
                      <td style={{ padding: "14px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: isNurse
                              ? "rgba(16,185,129,0.12)"
                              : isManager
                              ? "rgba(229,184,105,0.15)"
                              : "rgba(56,189,248,0.12)",
                            color: isNurse ? "#10b981" : isManager ? "#e5b869" : "#38bdf8",
                            border: `1px solid ${
                              isNurse
                                ? "rgba(16,185,129,0.3)"
                                : isManager
                                ? "rgba(229,184,105,0.3)"
                                : "rgba(56,189,248,0.3)"
                            }`,
                          }}
                        >
                          {staff.role}
                        </span>
                      </td>

                      {/* Chamber Location */}
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#cbd5e1" }}>
                          <MapPin size={12} color="#e5b869" />
                          <span>{staff.chamberLocation}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 12px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: staff.status === "Active" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            color: staff.status === "Active" ? "#10b981" : "#f87171",
                            border: staff.status === "Active" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                            cursor: "pointer",
                          }}
                          title="Click to toggle Active / Suspended status"
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: staff.status === "Active" ? "#10b981" : "#f87171",
                            }}
                          />
                          {staff.status.toUpperCase()}
                        </button>
                      </td>

                      {/* Last Active */}
                      <td style={{ padding: "14px 12px", color: "#94a3b8", fontSize: 11.5 }}>
                        {staff.lastActive}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(staff.id, staff.name)}
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              color: "#f87171",
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Remove staff member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div style={{ display: "inline-block", width: 24, height: 24, border: "2px solid rgba(229,184,105,0.3)", borderTopColor: "#e5b869", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>
                      Connecting to backend database and verifying staff directory...
                    </p>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "44px 20px", color: "#94a3b8" }}>
                    <Users size={32} color="#e5b869" style={{ margin: "0 auto 10px", opacity: 0.7 }} />
                    <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                      No Practice Staff Accounts in Database
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                      Authorize receptionists, nurses, or chamber supervisors to manage patient queues and front-desk bookings.
                    </p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 20px", color: "#94a3b8" }}>
                    <Users size={28} color="#e5b869" style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                      No staff members found matching search or filter criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4B: MOBILE CARDS VIEW (Visible on <= 768px) */}
        <div className="staff-mobile-cards">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => {
              const initials = staff.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              const isNurse = staff.role === "Clinical Nurse";
              const isManager = staff.role === "Chamber Manager";

              return (
                <div
                  key={staff.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          borderRadius: "50%",
                          background: isNurse
                            ? "linear-gradient(135deg, #10b981 0%, #047857 100%)"
                            : isManager
                            ? "linear-gradient(135deg, #e5b869 0%, #b88628 100%)"
                            : "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isManager ? "#050b14" : "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13.5 }}>
                          {staff.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{staff.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff.id)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        background: staff.status === "Active" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: staff.status === "Active" ? "#10b981" : "#f87171",
                        border: staff.status === "Active" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
                        cursor: "pointer",
                      }}
                    >
                      {staff.status.toUpperCase()}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "#cbd5e1" }}>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 8,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: isNurse
                          ? "rgba(16,185,129,0.1)"
                          : isManager
                          ? "rgba(229,184,105,0.12)"
                          : "rgba(56,189,248,0.1)",
                        color: isNurse ? "#10b981" : isManager ? "#e5b869" : "#38bdf8",
                      }}
                    >
                      {staff.role}
                    </span>
                    <span style={{ color: "#94a3b8" }}>{staff.phone}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={11} color="#e5b869" />
                      <span>{staff.chamberLocation}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(staff.id, staff.name)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : isLoading ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
              <div style={{ display: "inline-block", width: 22, height: 22, border: "2px solid rgba(229,184,105,0.3)", borderTopColor: "#e5b869", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 12, color: "#cbd5e1" }}>
                Verifying staff directory...
              </p>
            </div>
          ) : staffList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
              <Users size={28} color="#e5b869" style={{ margin: "0 auto 8px", opacity: 0.7 }} />
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                No Practice Staff Accounts
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                No staff members found in database. Invite receptionists or chamber staff using the button above.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 10px", color: "#94a3b8", fontSize: 12 }}>
              No staff members found matching search or filter criteria.
            </div>
          )}
        </div>
      </section>

      {/* 5. ADD STAFF MODAL */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStaff={handleAddStaff}
        chambers={chambers}
      />
    </div>
  );
}
