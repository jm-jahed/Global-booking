"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  FileText,
  UserCheck,
  Stethoscope,
  Building2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  getRegistrations,
  approveRegistration,
  rejectRegistration,
} from "@/lib/api/admin-client";

export function RegistrationsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Selected registration for detail view
  const [selectedReg, setSelectedReg] = useState<any | null>(null);

  // Rejection modal state
  const [rejectingReg, setRejectingReg] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Success modal state (displaying generated credentials/invitation)
  const [approvedResult, setApprovedResult] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRegistrations({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        accountType: typeFilter === "ALL" ? undefined : typeFilter,
      });
      setItems(res.items || []);
      setPendingCount(res.pendingCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (reg: any) => {
    let consultationFeeAed: number | undefined = undefined;

    if (reg.accountType === "DOCTOR") {
      const input = prompt(
        `Approve Doctor ${reg.applicantName}:\nPlease specify consultation fee in AED:`,
        "500",
      );
      if (input === null) {
        return; // Admin cancelled approval
      }
      const parsed = parseFloat(input);
      if (isNaN(parsed) || parsed < 0) {
        alert("Please enter a valid consultation fee amount (minimum 0 AED).");
        return;
      }
      consultationFeeAed = parsed;
    } else {
      if (
        !confirm(
          `Are you sure you want to approve ${reg.applicantName || reg.institutionName} as an authorized ${reg.accountType}? This will create a real database account with a 14-day trial in AED.`,
        )
      ) {
        return;
      }
    }

    try {
      setSubmittingAction(true);
      const res = await approveRegistration(reg.id, { consultationFeeAed });
      setApprovedResult({
        registration: reg,
        createdAccount: res.createdAccount,
      });
      await loadData();
      if (selectedReg?.id === reg.id) {
        setSelectedReg(null);
      }
    } catch (err) {
      alert(`Approval error: ${err instanceof Error ? err.message : "Failed to approve application."}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingReg || !rejectionReason.trim()) {
      alert("Please provide a valid rejection reason.");
      return;
    }

    try {
      setSubmittingAction(true);
      await rejectRegistration(rejectingReg.id, {
        reason: rejectionReason.trim(),
      });
      setRejectingReg(null);
      setRejectionReason("");
      await loadData();
      if (selectedReg?.id === rejectingReg.id) {
        setSelectedReg(null);
      }
    } catch (err) {
      alert(`Rejection error: ${err instanceof Error ? err.message : "Failed to reject application."}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const copyInvitationToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.08) 0%, rgba(11,19,37,0.8) 100%)",
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
            <ClipboardList size={24} color="#e5b869" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>
              New Registration Requests
            </h1>
            <span
              style={{
                background: pendingCount > 0 ? "rgba(229,184,105,0.2)" : "rgba(255,255,255,0.1)",
                color: pendingCount > 0 ? "#e5b869" : "#94a3b8",
                border: "1px solid rgba(229,184,105,0.3)",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {pendingCount} Pending Review
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
            Real-time verification queue for healthcare providers. Approved accounts instantly persist in MongoDB Atlas with a 14-day AED trial.
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
            transition: "all 0.2s",
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Queue
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, background: "#0b1325", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { key: "ALL", label: "All Requests" },
            { key: "PENDING", label: `Pending (${pendingCount})` },
            { key: "APPROVED", label: "Approved" },
            { key: "REJECTED", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                background: statusFilter === tab.key ? "#e5b869" : "transparent",
                color: statusFilter === tab.key ? "#060b13" : "#94a3b8",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "ALL", label: "All Account Types" },
            { key: "DOCTOR", label: "Doctors & Specialists" },
            { key: "HOSPITAL", label: "Hospitals & Clinics" },
          ].map((type) => (
            <button
              key={type.key}
              onClick={() => setTypeFilter(type.key)}
              style={{
                background: typeFilter === type.key ? "rgba(229,184,105,0.15)" : "rgba(255,255,255,0.04)",
                color: typeFilter === type.key ? "#e5b869" : "#94a3b8",
                border: typeFilter === type.key ? "1px solid #e5b869" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            padding: "16px 20px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: 14 }}>{error}</span>
          <button
            onClick={loadData}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "underline",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Applications List */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: "#e5b869" }} />
          <p style={{ margin: 0, fontSize: 15 }}>Loading registration queue from MongoDB Atlas...</p>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            background: "#0b1325",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <ClipboardList size={44} color="#64748b" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>
            No Registration Requests Found
          </h3>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 440, margin: "0 auto" }}>
            There are currently no registration applications matching the selected status ({statusFilter}) and account type ({typeFilter}).
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((reg) => {
            const isPending = reg.status === "PENDING";
            const isApproved = reg.status === "APPROVED";
            const isRejected = reg.status === "REJECTED";
            const isDoctor = reg.accountType === "DOCTOR";

            return (
              <div
                key={reg.id}
                style={{
                  background: "#0b1325",
                  border: isPending ? "1px solid rgba(229,184,105,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isDoctor ? "rgba(56,189,248,0.12)" : "rgba(229,184,105,0.12)",
                        border: isDoctor ? "1px solid rgba(56,189,248,0.3)" : "1px solid rgba(229,184,105,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isDoctor ? "#38bdf8" : "#e5b869",
                      }}
                    >
                      {isDoctor ? <Stethoscope size={22} /> : <Building2 size={22} />}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff" }}>
                          {reg.applicantName}
                        </h3>
                        {reg.institutionName && (
                          <span style={{ fontSize: 14, color: "#94a3b8" }}>
                            ({reg.institutionName})
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: isDoctor ? "rgba(56,189,248,0.12)" : "rgba(229,184,105,0.12)",
                            color: isDoctor ? "#38bdf8" : "#e5b869",
                            border: isDoctor ? "1px solid rgba(56,189,248,0.3)" : "1px solid rgba(229,184,105,0.3)",
                          }}
                        >
                          {isDoctor ? "Doctor / Specialist" : "Hospital / Clinic"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13, color: "#94a3b8", flexWrap: "wrap" }}>
                        <span>ID: <code style={{ color: "#e5b869" }}>{reg.id}</code></span>
                        <span>Email: <span style={{ color: "#fff" }}>{reg.applicantEmail}</span></span>
                        <span>Phone: <span style={{ color: "#fff" }}>{reg.applicantPhone}</span></span>
                        <span>Submitted: {new Date(reg.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: isPending
                          ? "rgba(229,184,105,0.15)"
                          : isApproved
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(239,68,68,0.15)",
                        color: isPending ? "#e5b869" : isApproved ? "#10b981" : "#ef4444",
                        border: isPending
                          ? "1px solid rgba(229,184,105,0.3)"
                          : isApproved
                          ? "1px solid rgba(16,185,129,0.3)"
                          : "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      {isPending && <Clock size={14} />}
                      {isApproved && <CheckCircle2 size={14} />}
                      {isRejected && <XCircle size={14} />}
                      {reg.status}
                    </span>
                  </div>
                </div>

                {/* Additional Info / Documents summary */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: "#94a3b8" }}>
                    {isDoctor ? (
                      <span>
                        Specialty: <strong style={{ color: "#fff" }}>{reg.practiceDetails?.primarySpecialty || "General Specialist"}</strong> | Experience: <strong style={{ color: "#fff" }}>{reg.practiceDetails?.yearsOfExperience || "N/A"} yrs</strong>
                      </span>
                    ) : (
                      <span>
                        Facility: <strong style={{ color: "#fff" }}>{reg.facilityDetails?.facilityType || "General Hospital"}</strong> | City: <strong style={{ color: "#fff" }}>{reg.facilityDetails?.location?.city || "Dubai"}</strong>
                      </span>
                    )}
                    {reg.documents?.length > 0 && (
                      <span style={{ marginLeft: 16 }}>
                        <FileText size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                        {reg.documents.length} document(s) uploaded
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setSelectedReg(reg)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        padding: "7px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={14} /> View Details
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(reg)}
                          disabled={submittingAction}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "none",
                            color: "#fff",
                            padding: "7px 16px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2 size={14} /> Approve & Activate Trial
                        </button>

                        <button
                          onClick={() => setRejectingReg(reg)}
                          disabled={submittingAction}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#ef4444",
                            padding: "7px 14px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isRejected && reg.rejectionReason && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#fca5a5",
                    }}
                  >
                    <strong>Rejection Reason:</strong> {reg.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedReg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedReg(null)}
        >
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(229,184,105,0.3)",
              borderRadius: 18,
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869", textTransform: "uppercase" }}>
                  Registration Application Details
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0", color: "#fff" }}>
                  {selectedReg.applicantName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><strong>Application ID:</strong> <span style={{ color: "#e5b869" }}>{selectedReg.id}</span></div>
                <div><strong>Account Type:</strong> <span style={{ color: "#fff" }}>{selectedReg.accountType}</span></div>
                <div><strong>Email:</strong> <span style={{ color: "#fff" }}>{selectedReg.applicantEmail}</span></div>
                <div><strong>Phone:</strong> <span style={{ color: "#fff" }}>{selectedReg.applicantPhone}</span></div>
                <div><strong>Current Status:</strong> <span style={{ color: "#fff" }}>{selectedReg.status}</span></div>
                <div><strong>Submitted:</strong> <span style={{ color: "#fff" }}>{new Date(selectedReg.submittedAt).toLocaleString()}</span></div>
              </div>

              {selectedReg.practiceDetails && (
                <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 10 }}>
                  <h4 style={{ margin: "0 0 8px", color: "#e5b869", fontSize: 13, textTransform: "uppercase" }}>
                    Doctor Practice Details
                  </h4>
                  <p style={{ margin: "0 0 4px" }}>Specialty: {selectedReg.practiceDetails.primarySpecialty}</p>
                  <p style={{ margin: "0 0 4px" }}>Experience: {selectedReg.practiceDetails.yearsOfExperience} years</p>
                  {selectedReg.practiceDetails.chamberLocations?.length > 0 && (
                    <p style={{ margin: 0 }}>
                      Chamber: {selectedReg.practiceDetails.chamberLocations[0].facilityName} ({selectedReg.practiceDetails.chamberLocations[0].city})
                    </p>
                  )}
                </div>
              )}

              {selectedReg.facilityDetails && (
                <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 10 }}>
                  <h4 style={{ margin: "0 0 8px", color: "#e5b869", fontSize: 13, textTransform: "uppercase" }}>
                    Hospital Facility Details
                  </h4>
                  <p style={{ margin: "0 0 4px" }}>Type: {selectedReg.facilityDetails.facilityType}</p>
                  <p style={{ margin: "0 0 4px" }}>City: {selectedReg.facilityDetails.location?.city}</p>
                  <p style={{ margin: 0 }}>Bed Capacity: {selectedReg.facilityDetails.bedCapacity || "N/A"}</p>
                </div>
              )}

              {selectedReg.documents?.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 10px", color: "#e5b869", fontSize: 13, textTransform: "uppercase" }}>
                    Uploaded Verification Documents
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedReg.documents.map((doc: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          padding: "10px 14px",
                          borderRadius: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong>{doc.title || doc.documentType}</strong>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            Doc #: {doc.documentNumber} | Issued By: {doc.issuedBy}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: doc.isVerified ? "rgba(16,185,129,0.15)" : "rgba(229,184,105,0.15)",
                            color: doc.isVerified ? "#10b981" : "#e5b869",
                          }}
                        >
                          {doc.isVerified ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReg.status === "PENDING" && (
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button
                    onClick={() => handleApprove(selectedReg)}
                    disabled={submittingAction}
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "#fff",
                      padding: "12px",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Approve Application
                  </button>
                  <button
                    onClick={() => {
                      setRejectingReg(selectedReg);
                      setSelectedReg(null);
                    }}
                    disabled={submittingAction}
                    style={{
                      flex: 1,
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      padding: "12px",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Reject Application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingReg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: 28,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Reject Registration Application
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 16px" }}>
              Please provide a clear reason for rejecting <strong>{rejectingReg.applicantName}</strong>. This reason will be recorded in the audit log and returned to the applicant.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Expired medical license document or invalid facility registration credentials..."
              rows={4}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "12px",
                color: "#fff",
                fontSize: 14,
                marginBottom: 16,
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setRejectingReg(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "#94a3b8",
                  padding: "10px 18px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={submittingAction || !rejectionReason.trim()}
                style={{
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {submittingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL SUCCESS MODAL WITH INVITATION TOKEN */}
      {approvedResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0b1325",
              border: "1px solid rgba(16,185,129,0.4)",
              borderRadius: 18,
              maxWidth: 550,
              width: "100%",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                background: "rgba(16,185,129,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#10b981",
              }}
            >
              <UserCheck size={32} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Account Successfully Created!
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px" }}>
              <strong>{approvedResult.registration.applicantName}</strong> has been approved. A real database record and a 14-day AED trial subscription have been initialized in MongoDB Atlas.
            </p>

            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "16px 20px",
                textAlign: "left",
                marginBottom: 20,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div><strong>Account ID:</strong> <code style={{ color: "#e5b869" }}>{approvedResult.createdAccount?.accountId}</code></div>
              <div><strong>Entity ID:</strong> <code style={{ color: "#38bdf8" }}>{approvedResult.createdAccount?.entityId}</code></div>
              <div><strong>Status:</strong> <span style={{ color: "#10b981" }}>TRIAL (14 Days)</span></div>
              <div><strong>Currency:</strong> <span style={{ color: "#fff" }}>AED</span></div>
              
              <div style={{ marginTop: 8 }}>
                <strong>Secure Invitation Token:</strong>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <span>{approvedResult.createdAccount?.invitationToken}</span>
                  <button
                    onClick={() => copyInvitationToken(approvedResult.createdAccount?.invitationToken)}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedToken ? "#10b981" : "#e5b869",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginLeft: 8,
                    }}
                  >
                    {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setApprovedResult(null)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #e5b869 0%, #b88628 100%)",
                border: "none",
                color: "#060b13",
                padding: "12px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Done & Return to Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
