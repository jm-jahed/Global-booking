"use client";

import { useState } from "react";
import { X, UserCheck, User, Mail, Phone, MapPin, Shield, Check, Lock, Eye, EyeOff } from "lucide-react";
import type { DoctorChamberDetail } from "@/lib/api/admin-client";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Receptionist / Front Desk" | "Clinical Nurse" | "Chamber Manager" | "Billing Coordinator";
  chamberLocation: string;
  status: "Active" | "Pending Invite" | "Suspended";
  permissions: {
    canManageQueue: boolean;
    canBookPhoneAppointments: boolean;
    canViewPatientHistory: boolean;
    canCollectPayments: boolean;
  };
  createdAt: string;
  lastActive: string;
  password?: string;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStaff: (newStaff: StaffMember, password: string) => Promise<boolean | void> | void;
  chambers: DoctorChamberDetail[];
}

export function AddStaffModal({ isOpen, onClose, onAddStaff, chambers }: AddStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<StaffMember["role"]>("Receptionist / Front Desk");
  const [chamberLocation, setChamberLocation] = useState(
    chambers[0]?.facilityName || "Main Consultation Chamber"
  );

  const [permissions, setPermissions] = useState({
    canManageQueue: true,
    canBookPhoneAppointments: true,
    canViewPatientHistory: true,
    canCollectPayments: false,
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the staff member's full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid official email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password is required and must be at least 8 characters long.");
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || "+971 50 123 4567",
      role,
      chamberLocation: chamberLocation || "All Practice Chambers",
      status: "Active",
      permissions,
      createdAt: new Date().toISOString(),
      lastActive: "Active Now",
      password,
    };

    try {
      setIsSubmitting(true);
      const res = await onAddStaff(newStaff, password);
      if (res !== false) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#0c1527",
          border: "1px solid rgba(229,184,105,0.3)",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(229,184,105,0.1)",
          overflow: "hidden",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(229,184,105,0.2) 0%, rgba(229,184,105,0.05) 100%)",
                border: "1px solid rgba(229,184,105,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
              }}
            >
              <UserCheck size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#ffffff" }}>
                Add Clinical Staff Member
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Delegate OPD queue, patient reception & chamber operations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Full Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
              Staff Full Name *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Fatima Zahra"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "10px 12px 10px 36px",
                  color: "#ffffff",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <User size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
            </div>
          </div>

          {/* Email & Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                Staff Email (Login ID) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="reception@doctor.com"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px 10px 34px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <Mail size={14} color="#94a3b8" style={{ position: "absolute", left: 11, top: 12 }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
                Mobile Number
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px 10px 34px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <Phone size={14} color="#94a3b8" style={{ position: "absolute", left: 11, top: 12 }} />
              </div>
            </div>
          </div>

          {/* Login Password */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <label style={{ fontSize: 11.5, color: "#cbd5e1", fontWeight: 600 }}>
                Initial Login Password *
              </label>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Min 8 characters</span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter secure initial password for staff login"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "10px 38px 10px 34px",
                  color: "#ffffff",
                  fontSize: 12.5,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Lock size={14} color="#94a3b8" style={{ position: "absolute", left: 11, top: 12 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 10,
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Staff member will use this email &amp; password to sign in directly to the Staff Portal.
            </div>
          </div>

          {/* Staff Role */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
              Practice Staff Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffMember["role"])}
              style={{
                width: "100%",
                background: "#08101e",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#ffffff",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="Receptionist / Front Desk">Receptionist / Front Desk (Queue & Check-in)</option>
              <option value="Clinical Nurse">Clinical Nurse (Vitals & OPD Assisting)</option>
              <option value="Chamber Manager">Chamber Manager (Schedule & Roster)</option>
              <option value="Billing Coordinator">Billing Coordinator (Fee & Invoicing)</option>
            </select>
          </div>

          {/* Assigned Chamber */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "#cbd5e1", marginBottom: 5, fontWeight: 600 }}>
              Assigned Chamber Location *
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={chamberLocation}
                onChange={(e) => setChamberLocation(e.target.value)}
                style={{
                  width: "100%",
                  background: "#08101e",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "10px 12px 10px 34px",
                  color: "#ffffff",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="All Practice Chambers">All Practice Chambers</option>
                {chambers.map((ch, idx) => (
                  <option key={ch.id || idx} value={ch.facilityName}>
                    {ch.facilityName} ({ch.city})
                  </option>
                ))}
              </select>
              <MapPin size={14} color="#e5b869" style={{ position: "absolute", left: 11, top: 12 }} />
            </div>
          </div>

          {/* Delegated Permissions */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <Shield size={14} color="#e5b869" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                Delegated Operational Permissions
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={permissions.canManageQueue}
                  onChange={(e) => setPermissions({ ...permissions, canManageQueue: e.target.checked })}
                />
                <span>Manage Live Queue, Call Patients & Print Tokens</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={permissions.canBookPhoneAppointments}
                  onChange={(e) => setPermissions({ ...permissions, canBookPhoneAppointments: e.target.checked })}
                />
                <span>Create Phone Booking & Walk-in Patient Appointments</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={permissions.canViewPatientHistory}
                  onChange={(e) => setPermissions({ ...permissions, canViewPatientHistory: e.target.checked })}
                />
                <span>View Patient Demographics & Contact Records</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={permissions.canCollectPayments}
                  onChange={(e) => setPermissions({ ...permissions, canCollectPayments: e.target.checked })}
                />
                <span>Collect Consultation Fees & Mark Paid</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#cbd5e1",
                padding: "9px 16px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                border: "none",
                color: "#050b14",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(229,184,105,0.25)",
              }}
            >
              <Check size={14} strokeWidth={2.6} />
              <span>Invite & Activate Staff</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
