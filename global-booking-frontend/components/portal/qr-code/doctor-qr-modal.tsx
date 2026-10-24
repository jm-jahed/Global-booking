"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  QrCode,
  Globe,
  Calendar,
  Copy,
  Check,
  Download,
  Printer,
  X,
  ExternalLink,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  Settings,
  Lock,
} from "lucide-react";
import { generateQrMatrix, qrMatrixToSvg, drawQrCardToCanvas } from "@/lib/utils/qr-code";
import { getDoctorProfile, getStoredPortalUser, type DoctorProfileRecord } from "@/lib/api/admin-client";

export interface DoctorQrModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialProfile?: DoctorProfileRecord | null;
}

type ViewMode = "BOTH" | "PORTFOLIO" | "BOOKING";

export function DoctorQrModal({ isOpen, onClose, initialProfile }: DoctorQrModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("BOTH");
  const [profile, setProfile] = useState<DoctorProfileRecord | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch doctor profile if not provided
  useEffect(() => {
    if (!isOpen) return;

    if (!profile) {
      setLoading(true);
      getDoctorProfile()
        .then((res) => {
          if (res?.doctor) {
            setProfile(res.doctor);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Determine correct public frontend origin dynamically from runtime browser origin
  const rawOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://booking.webstudioae.com" : "http://localhost:3000"));
  const origin = rawOrigin.replace(/\/+$/, "");

  const storedUser = typeof window !== "undefined" ? getStoredPortalUser() : null;
  const isPublished = profile ? profile.isPublished === true : true;
  const doctorSlug =
    (typeof profile?.slug === "string" && profile.slug.trim().toLowerCase()) ||
    (typeof storedUser?.slug === "string" && storedUser.slug.trim().toLowerCase()) ||
    "";
  const hasConfiguredSlug = doctorSlug.length > 0;

  const doctorName = profile?.fullName || storedUser?.fullName || storedUser?.name || "Doctor Practice";
  const doctorSpecialty = profile?.specialty || storedUser?.specialty || "Medical Specialist";

  const portfolioUrl = hasConfiguredSlug ? `${origin}/${doctorSlug}` : "";
  const bookingUrl = hasConfiguredSlug ? `${origin}/${doctorSlug}/book` : "";

  // Generate standard, unoccluded QR matrices (>= 4 module quiet zone, zero center overlays)
  let portfolioMatrix: boolean[][] = [];
  let portfolioSvg = "";
  let bookingMatrix: boolean[][] = [];
  let bookingSvg = "";

  if (hasConfiguredSlug) {
    try {
      portfolioMatrix = generateQrMatrix(portfolioUrl);
      portfolioSvg = qrMatrixToSvg(portfolioMatrix, {
        size: 190,
        darkColor: "#07131f",
        lightColor: "#ffffff",
        margin: 4,
      });

      bookingMatrix = generateQrMatrix(bookingUrl);
      bookingSvg = qrMatrixToSvg(bookingMatrix, {
        size: 190,
        darkColor: "#07131f",
        lightColor: "#ffffff",
        margin: 4,
      });
    } catch (err) {
      console.error("QR Generation error:", err);
    }
  }

  const handleCopy = (url: string, key: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadPng = (
    type: "PORTFOLIO" | "BOOKING",
    matrix: boolean[][],
    url: string,
    label: string,
    accent: string,
  ) => {
    if (!canvasRef.current || matrix.length === 0 || !url) return;

    drawQrCardToCanvas(canvasRef.current, matrix, {
      doctorName,
      specialty: doctorSpecialty,
      qrLabel: label,
      destinationUrl: url,
      accentColor: accent,
    });

    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${doctorSlug}-${type.toLowerCase()}-qr-card.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="qr-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px 16px",
      }}
      onClick={onClose}
    >
      {/* Hidden canvas for high-resolution PNG rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        className="qr-modal-dialog"
        style={{
          background: "#081220",
          border: "1px solid rgba(229,184,105,0.35)",
          borderRadius: 22,
          width: "100%",
          maxWidth: viewMode === "BOTH" ? 960 : 540,
          padding: "26px 30px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
          transition: "max-width 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className="qr-modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(229,184,105,0.15)",
                border: "1px solid rgba(229,184,105,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5b869",
                flexShrink: 0,
              }}
            >
              <QrCode size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  Doctor Dual QR Codes & Direct Links
                </h2>
                <span
                  style={{
                    background: "rgba(229,184,105,0.15)",
                    border: "1px solid rgba(229,184,105,0.3)",
                    color: "#e5b869",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Standard QR
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Doctor practice cards for clinic reception stands, prescription pads & patient
                sharing.
              </p>
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasConfiguredSlug && (
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#cbd5e1",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Printer size={14} />
                Print Cards
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 4,
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONDITION 1: Missing Public Slug */}
        {!hasConfiguredSlug ? (
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.15)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                color: "#fbbf24",
              }}
            >
              <Settings size={24} />
            </div>

            <h3 style={{ fontSize: 18, color: "#ffffff", fontWeight: 700, margin: "0 0 8px" }}>
              Public Profile Slug Not Configured
            </h3>

            <p
              style={{
                fontSize: 14,
                color: "#cbd5e1",
                maxWidth: 520,
                margin: "0 auto 20px",
                lineHeight: 1.6,
              }}
            >
              To generate genuine, permanent QR codes and public links, please configure and save
              your unique practice URL slug (e.g. <code>dr-sarah-khan</code>) in your Doctor Profile
              settings.
            </p>

            <Link
              href="/settings"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                color: "#07131f",
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Settings size={15} />
              Configure Profile & Slug in Settings
            </Link>
          </div>
        ) : (
          <>
            {/* View Mode Switcher */}
            <div
              className="no-print qr-viewmode-switcher"
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("BOTH")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: viewMode === "BOTH" ? "rgba(255,255,255,0.15)" : "transparent",
                  color: viewMode === "BOTH" ? "#ffffff" : "#94a3b8",
                }}
              >
                <Sparkles size={14} color="#e5b869" />
                Both QR Codes (Side-by-Side)
              </button>

              <button
                type="button"
                onClick={() => setViewMode("PORTFOLIO")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    viewMode === "PORTFOLIO"
                      ? "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)"
                      : "transparent",
                  color: viewMode === "PORTFOLIO" ? "#07131f" : "#94a3b8",
                }}
              >
                <Globe size={14} />
                1. Live Portfolio QR
              </button>

              <button
                type="button"
                onClick={() => setViewMode("BOOKING")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    viewMode === "BOOKING"
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "transparent",
                  color: viewMode === "BOOKING" ? "#ffffff" : "#94a3b8",
                }}
              >
                <Calendar size={14} />
                2. Appointment Booking QR
              </button>
            </div>

            {/* Unpublished Profile Banner (treat every profile where isPublished !== true as unpublished) */}
            {!isPublished && (
              <div
                style={{
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  fontSize: 13,
                  color: "#fbbf24",
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, lineHeight: 1.5 }}>
                  <strong>Draft Mode — Profile Unpublished:</strong> Your doctor profile is
                  currently unpublished. Patients scanning your public portfolio QR code will see a
                  private profile notice. To make your profile publicly accessible, enable
                  publishing in{" "}
                  <Link
                    href="/settings"
                    onClick={onClose}
                    style={{ color: "#ffffff", textDecoration: "underline", fontWeight: 600 }}
                  >
                    Doctor Settings (My Profile & Portfolio)
                  </Link>
                  .
                </div>
              </div>
            )}

            {/* DUAL QR CARDS GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: viewMode === "BOTH" ? "1fr 1fr" : "1fr",
                gap: 18,
                marginBottom: 18,
              }}
              className="qr-cards-grid"
            >
              {/* CARD 1: DOCTOR PORTFOLIO QR */}
              {(viewMode === "BOTH" || viewMode === "PORTFOLIO") && (
                <div
                  className="qr-card-print"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(229,184,105,0.08) 0%, #0d1726 100%)",
                    border: "1px solid rgba(229,184,105,0.35)",
                    borderRadius: 18,
                    padding: "22px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Card Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(229,184,105,0.18)",
                      border: "1px solid rgba(229,184,105,0.4)",
                      color: "#e5b869",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    <Globe size={12} />
                    Doctor Public Portfolio
                  </div>

                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      margin: "0 0 4px",
                      color: "#ffffff",
                    }}
                  >
                    {doctorName}
                  </h3>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 14px" }}>
                    Doctor Bio, Qualifications & Chamber Locations
                  </p>

                  {/* Scannable Clean QR Frame */}
                  <div
                    style={{
                      background: "#ffffff",
                      padding: 12,
                      borderRadius: 16,
                      display: "inline-block",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                      border: "2px solid #e5b869",
                      marginBottom: 12,
                    }}
                    dangerouslySetInnerHTML={{ __html: portfolioSvg }}
                  />

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: isPublished ? "#e5b869" : "#fbbf24",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    {isPublished ? (
                      <span>✓ Scans to public doctor portfolio</span>
                    ) : (
                      <span>⚠ Draft Mode — currently private until published</span>
                    )}
                  </div>

                  {/* Destination URL Display */}
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="text"
                      readOnly
                      value={portfolioUrl}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: "#cbd5e1",
                        fontSize: 11,
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(portfolioUrl, "portfolio")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background:
                          copiedKey === "portfolio"
                            ? "#10b981"
                            : "rgba(229,184,105,0.25)",
                        border: `1px solid ${
                          copiedKey === "portfolio"
                            ? "#10b981"
                            : "rgba(229,184,105,0.5)"
                        }`,
                        color: copiedKey === "portfolio" ? "#ffffff" : "#e5b869",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {copiedKey === "portfolio" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === "portfolio" ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#94a3b8", display: "inline-flex", padding: 2 }}
                      title="Open portfolio link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {/* Download PNG Button */}
                  <button
                    type="button"
                    className="no-print"
                    onClick={() =>
                      handleDownloadPng(
                        "PORTFOLIO",
                        portfolioMatrix,
                        portfolioUrl,
                        "Doctor Public Portfolio",
                        "#e5b869",
                      )
                    }
                    style={{
                      width: "100%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                      color: "#07131f",
                      padding: "9px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(229,184,105,0.2)",
                    }}
                  >
                    <Download size={14} />
                    Download Card PNG (800x1050)
                  </button>
                </div>
              )}

              {/* CARD 2: APPOINTMENT BOOKING QR */}
              {(viewMode === "BOTH" || viewMode === "BOOKING") && (
                <div
                  className="qr-card-print"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(16,185,129,0.08) 0%, #0d1726 100%)",
                    border: "1px solid rgba(16,185,129,0.35)",
                    borderRadius: 18,
                    padding: "22px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Card Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(16,185,129,0.18)",
                      border: "1px solid rgba(16,185,129,0.4)",
                      color: "#34d399",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    <Calendar size={12} />
                    Direct Appointment Booking
                  </div>

                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      margin: "0 0 4px",
                      color: "#ffffff",
                    }}
                  >
                    {doctorName}
                  </h3>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 14px" }}>
                    Chamber Visiting Hours, Fee & Online Booking Status
                  </p>

                  {/* Scannable Clean QR Frame */}
                  <div
                    style={{
                      background: "#ffffff",
                      padding: 12,
                      borderRadius: 16,
                      display: "inline-block",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                      border: "2px solid #10b981",
                      marginBottom: 12,
                    }}
                    dangerouslySetInnerHTML={{ __html: bookingSvg }}
                  />

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#34d399",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    <span>✓ Scans to appointment booking information</span>
                  </div>

                  {/* Destination URL Display */}
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="text"
                      readOnly
                      value={bookingUrl}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: "#cbd5e1",
                        fontSize: 11,
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(bookingUrl, "booking")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background:
                          copiedKey === "booking"
                            ? "#10b981"
                            : "rgba(16,185,129,0.25)",
                        border: `1px solid ${
                          copiedKey === "booking"
                            ? "#10b981"
                            : "rgba(16,185,129,0.5)"
                        }`,
                        color: copiedKey === "booking" ? "#ffffff" : "#34d399",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {copiedKey === "booking" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === "booking" ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#94a3b8", display: "inline-flex", padding: 2 }}
                      title="Open booking link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {/* Download PNG Button */}
                  <button
                    type="button"
                    className="no-print"
                    onClick={() =>
                      handleDownloadPng(
                        "BOOKING",
                        bookingMatrix,
                        bookingUrl,
                        "Appointment Booking Link",
                        "#10b981",
                      )
                    }
                    style={{
                      width: "100%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      padding: "9px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(16,185,129,0.2)",
                    }}
                  >
                    <Download size={14} />
                    Download Card PNG (800x1050)
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Staff Phone Booking Note */}
        <div
          className="no-print"
          style={{
            background: "rgba(229,184,105,0.08)",
            border: "1px solid rgba(229,184,105,0.25)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            color: "#e5b869",
            textAlign: "left",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <PhoneCall size={15} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong>Staff Phone Booking Authorization:</strong>
            <p style={{ margin: "2px 0 0", color: "#cbd5e1", lineHeight: 1.4 }}>
              Authorized clinic staff can directly register phone-in patient appointments into
              Appointments & Live Queue without requiring external QR submission.
            </p>
          </div>
        </div>
      </div>

      {/* Scoped Responsive & Print Stylesheet */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .qr-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media print {
          /* Force clean white paper presentation */
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .qr-modal-overlay {
            position: static !important;
            background: none !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            display: block !important;
          }
          .qr-modal-dialog {
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            color: #000000 !important;
            padding: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .qr-modal-header h2,
          .qr-modal-header p {
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .qr-card-print {
            background: #ffffff !important;
            border: 2px solid #0f172a !important;
            color: #000000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
          }
          .qr-card-print h3,
          .qr-card-print p,
          .qr-card-print span,
          .qr-card-print strong {
            color: #000000 !important;
          }
          .qr-card-print input {
            color: #000000 !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
}
