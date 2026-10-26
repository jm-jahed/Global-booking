"use client";

import { useState, useEffect } from "react";
import {
  UserCircle,
  Stethoscope,
  GraduationCap,
  Building2,
  Globe,
  CreditCard,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Save,
  RotateCw,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  Award,
  BookOpen,
  Users,
  Phone,
  MessageCircle,
  Mail,
  FileText,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  getDoctorProfile,
  updateDoctorProfile,
  type DoctorProfileRecord,
  type DoctorChamberDetail,
  type DoctorServiceItem,
  type DoctorEducationItem,
  type DoctorExperienceItem,
  type DoctorAwardItem,
  type DoctorPublicationItem,
  type DoctorMembershipItem,
  type DoctorPublicContact,
  type DoctorPortfolioSections,
  type DoctorPublicDocumentRef,
} from "@/lib/api/admin-client";
import { generateSafeDoctorSlug, isSafeSlug } from "@/lib/validation/route-params";

type LoadStatus = "loading" | "loaded" | "error";

export function DoctorSettingsEditor() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Profile Form States
  const [profile, setProfile] = useState<DoctorProfileRecord | null>(null);

  // 1. Basic Profile
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(0);
  const [medicalDegrees, setMedicalDegrees] = useState<string[]>([]);
  const [newDegreeTag, setNewDegreeTag] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState("");

  // 2. Services
  const [services, setServices] = useState<DoctorServiceItem[]>([]);

  // 3. Education
  const [education, setEducation] = useState<DoctorEducationItem[]>([]);

  // 4. Experience
  const [experience, setExperience] = useState<DoctorExperienceItem[]>([]);

  // 5. Awards
  const [awards, setAwards] = useState<DoctorAwardItem[]>([]);

  // 6. Publications
  const [publications, setPublications] = useState<DoctorPublicationItem[]>([]);

  // 7. Memberships
  const [memberships, setMemberships] = useState<DoctorMembershipItem[]>([]);

  // 8. Chambers & Fee
  const [consultationFeeAed, setConsultationFeeAed] = useState<number>(500);
  const [chamberSummary, setChamberSummary] = useState("");
  const [chambers, setChambers] = useState<DoctorChamberDetail[]>([]);

  // 9. Public Contact
  const [clinicPhone, setClinicPhone] = useState("");
  const [inquiryWhatsApp, setInquiryWhatsApp] = useState("");
  const [publicEmail, setPublicEmail] = useState("");

  // 10. Documents
  const [publicDocuments, setPublicDocuments] = useState<DoctorPublicDocumentRef[]>([]);

  // 11. Section Visibility & Custom Titles
  const [sections, setSections] = useState<DoctorPortfolioSections>({
    services: { isVisible: true, customTitle: "Comprehensive Clinical Care" },
    education: { isVisible: true, customTitle: "Academic Qualifications & Degrees" },
    experience: { isVisible: true, customTitle: "Clinical Appointments & Experience" },
    awards: { isVisible: true, customTitle: "Awards & Honors" },
    publications: { isVisible: true, customTitle: "Publications & Clinical Research" },
    memberships: { isVisible: true, customTitle: "Professional Societies & Fellowships" },
    chambers: { isVisible: true, customTitle: "Chamber & Visiting Schedule" },
    contact: { isVisible: true, customTitle: "Contact & Inquiries" },
  });

  // 12. Slug & Publishing
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Fetch real profile from MongoDB
  const fetchProfile = async () => {
    setLoadStatus("loading");
    setLoadError(null);
    setSaveError(null);
    try {
      const res = await getDoctorProfile();
      if (!res || !res.doctor || typeof res.doctor !== "object" || !res.doctor.id) {
        throw new Error("Received an invalid or malformed profile response from server.");
      }
      const doc = res.doctor;
      setProfile(doc);
      setFullName(doc.fullName || "");
      setSpecialty(doc.specialty || "");
      setCustomTitle(doc.customTitle || "");
      setAvatar(doc.avatar || "");
      setBio(doc.bio || "");
      setYearsOfExperience(typeof doc.yearsOfExperience === "number" ? doc.yearsOfExperience : 0);
      setMedicalDegrees(Array.isArray(doc.medicalDegrees) && doc.medicalDegrees.length > 0 ? doc.medicalDegrees : ["MBBS"]);
      setLanguages(Array.isArray(doc.languages) && doc.languages.length > 0 ? doc.languages : ["English", "Arabic"]);

      // Fee: Distinguish a missing fee from a valid numeric zero
      const feeInFils = doc.consultationFee?.amountInFils;
      if (typeof feeInFils === "number" && !Number.isNaN(feeInFils)) {
        setConsultationFeeAed(feeInFils / 100);
      } else {
        setConsultationFeeAed(500);
      }
      setChamberSummary(doc.chamberLocationsSummary || "");
      setChambers(Array.isArray(doc.chambers) ? doc.chambers : []);

      // Rich Sections
      setServices(Array.isArray(doc.services) ? doc.services : []);
      setEducation(Array.isArray(doc.education) ? doc.education : []);
      setExperience(Array.isArray(doc.experience) ? doc.experience : []);
      setAwards(Array.isArray(doc.awards) ? doc.awards : []);
      setPublications(Array.isArray(doc.publications) ? doc.publications : []);
      setMemberships(Array.isArray(doc.memberships) ? doc.memberships : []);
      setPublicDocuments(Array.isArray(doc.publicDocuments) ? doc.publicDocuments : []);

      // Public Contact
      if (doc.publicContact) {
        setClinicPhone(doc.publicContact.clinicPhone || "");
        setInquiryWhatsApp(doc.publicContact.inquiryWhatsApp || "");
        setPublicEmail(doc.publicContact.publicEmail || "");
      } else {
        setClinicPhone("");
        setInquiryWhatsApp("");
        setPublicEmail("");
      }

      // Section Settings
      if (doc.portfolioSections && Object.keys(doc.portfolioSections).length > 0) {
        setSections((prev) => ({ ...prev, ...doc.portfolioSections }));
      }

      setSlug(doc.slug || "");
      setIsPublished(doc.isPublished !== false);
      setLoadStatus("loaded");
    } catch (err) {
      setProfile(null);
      setLoadStatus("error");
      setLoadError(err instanceof Error ? err.message : "Failed to load doctor profile.");
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  // Degree Tag Handlers
  const handleAddDegreeTag = () => {
    const trimmed = newDegreeTag.trim();
    if (trimmed && !medicalDegrees.includes(trimmed)) {
      setMedicalDegrees([...medicalDegrees, trimmed]);
      setNewDegreeTag("");
    }
  };

  const handleRemoveDegreeTag = (indexToRemove: number) => {
    setMedicalDegrees(medicalDegrees.filter((_, idx) => idx !== indexToRemove));
  };

  // Language Handlers
  const handleAddLanguage = () => {
    const trimmed = newLanguage.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
      setNewLanguage("");
    }
  };

  const handleRemoveLanguage = (indexToRemove: number) => {
    setLanguages(languages.filter((_, idx) => idx !== indexToRemove));
  };

  // Services Handlers
  const handleAddService = () => {
    setServices([
      ...services,
      {
        id: `SRV-${Date.now().toString().slice(-4)}`,
        title: "",
        category: "Clinical Care",
        description: "",
      },
    ]);
  };

  const handleUpdateService = (index: number, field: keyof DoctorServiceItem, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, idx) => idx !== index));
  };

  // Education Handlers
  const handleAddEducation = () => {
    setEducation([
      ...education,
      {
        id: `EDU-${Date.now().toString().slice(-4)}`,
        degree: "",
        institution: "",
        graduationYear: new Date().getFullYear().toString(),
        fieldOfStudy: "",
      },
    ]);
  };

  const handleUpdateEducation = (index: number, field: keyof DoctorEducationItem, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const handleRemoveEducation = (index: number) => {
    setEducation(education.filter((_, idx) => idx !== index));
  };

  // Experience Handlers
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      {
        id: `EXP-${Date.now().toString().slice(-4)}`,
        role: "",
        organization: "",
        department: "",
        startYear: new Date().getFullYear().toString(),
        endYear: "",
        isCurrent: true,
      },
    ]);
  };

  const handleUpdateExperience = (
    index: number,
    field: keyof DoctorExperienceItem,
    value: string | boolean | undefined
  ) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    setExperience(updated);
  };

  const handleRemoveExperience = (index: number) => {
    setExperience(experience.filter((_, idx) => idx !== index));
  };

  // Awards Handlers
  const handleAddAward = () => {
    setAwards([
      ...awards,
      {
        id: `AWD-${Date.now().toString().slice(-4)}`,
        title: "",
        issuingBody: "",
        year: new Date().getFullYear().toString(),
        description: "",
      },
    ]);
  };

  const handleUpdateAward = (index: number, field: keyof DoctorAwardItem, value: string) => {
    const updated = [...awards];
    updated[index] = { ...updated[index], [field]: value };
    setAwards(updated);
  };

  const handleRemoveAward = (index: number) => {
    setAwards(awards.filter((_, idx) => idx !== index));
  };

  // Publications Handlers
  const handleAddPublication = () => {
    setPublications([
      ...publications,
      {
        id: `PUB-${Date.now().toString().slice(-4)}`,
        title: "",
        journal: "",
        year: new Date().getFullYear().toString(),
        url: "",
      },
    ]);
  };

  const handleUpdatePublication = (index: number, field: keyof DoctorPublicationItem, value: string) => {
    const updated = [...publications];
    updated[index] = { ...updated[index], [field]: value };
    setPublications(updated);
  };

  const handleRemovePublication = (index: number) => {
    setPublications(publications.filter((_, idx) => idx !== index));
  };

  // Memberships Handlers
  const handleAddMembership = () => {
    setMemberships([
      ...memberships,
      {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        organizationName: "",
        role: "Active Member",
        sinceYear: new Date().getFullYear().toString(),
      },
    ]);
  };

  const handleUpdateMembership = (index: number, field: keyof DoctorMembershipItem, value: string) => {
    const updated = [...memberships];
    updated[index] = { ...updated[index], [field]: value };
    setMemberships(updated);
  };

  const handleRemoveMembership = (index: number) => {
    setMemberships(memberships.filter((_, idx) => idx !== index));
  };

  // Chamber Management
  const handleAddChamber = () => {
    const existingTz = chambers.find((c) => c.timezone?.trim())?.timezone;
    const defaultTimezone =
      existingTz ||
      (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Dubai");

    setChambers([
      ...chambers,
      {
        id: `CH-${Date.now().toString().slice(-4)}`,
        facilityName: "",
        city: "",
        visitingSchedule: "Mon - Thu: 5:00 PM - 9:00 PM",
        roomNumber: "",
        contactPhone: "",
        timezone: defaultTimezone,
      },
    ]);
  };

  const handleUpdateChamber = (index: number, field: keyof DoctorChamberDetail, value: string) => {
    const updated = [...chambers];
    updated[index] = { ...updated[index], [field]: value };
    setChambers(updated);
  };

  const handleRemoveChamber = (index: number) => {
    setChambers(chambers.filter((_, idx) => idx !== index));
  };

  // Documents Handlers
  const handleAddDocument = () => {
    setPublicDocuments([
      ...publicDocuments,
      {
        id: `DOC-${Date.now().toString().slice(-4)}`,
        title: "",
        documentType: "Medical License",
        url: "",
      },
    ]);
  };

  const handleUpdateDocument = (index: number, field: keyof DoctorPublicDocumentRef, value: string) => {
    const updated = [...publicDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setPublicDocuments(updated);
  };

  const handleRemoveDocument = (index: number) => {
    setPublicDocuments(publicDocuments.filter((_, idx) => idx !== index));
  };

  // Section Toggle
  const handleToggleSection = (sectionKey: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        isVisible: !prev[sectionKey]?.isVisible,
      },
    }));
  };

  const handleUpdateSectionTitle = (sectionKey: string, customTitle: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        customTitle,
        isVisible: prev[sectionKey]?.isVisible ?? true,
      },
    }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loadStatus !== "loaded" || !profile) {
      setSaveError("Cannot save profile because the profile has not finished loading. Please reload.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      let targetSlug = slug.trim().toLowerCase();
      if (!targetSlug) {
        targetSlug = generateSafeDoctorSlug(fullName, profile.doctorId || profile.id);
      }

      if (!targetSlug || !isSafeSlug(targetSlug)) {
        setSaveError("A valid doctor URL slug is required (e.g. 'dr-sarah-khan').");
        setSaving(false);
        return;
      }

      const publicContactPayload: DoctorPublicContact = {
        clinicPhone: clinicPhone.trim() || undefined,
        inquiryWhatsApp: inquiryWhatsApp.trim() || undefined,
        publicEmail: publicEmail.trim().toLowerCase() || undefined,
      };

      const res = await updateDoctorProfile({
        fullName: fullName.trim(),
        specialty: specialty.trim(),
        customTitle: customTitle.trim() || undefined,
        avatar: avatar.trim(),
        bio: bio.trim(),
        yearsOfExperience: Number(yearsOfExperience) || 0,
        medicalDegrees: medicalDegrees.filter((d) => d.trim().length > 0),
        consultationFeeAed: typeof consultationFeeAed === "number" ? consultationFeeAed : Number(consultationFeeAed) || 0,
        chamberLocationsSummary: chamberSummary.trim(),
        languages: languages.filter((l) => l.trim().length > 0),
        slug: targetSlug,
        isPublished,
        chambers: chambers
          .filter((ch) => ch.facilityName.trim().length > 0)
          .map((ch) => ({
            ...ch,
            timezone: ch.timezone?.trim() || undefined,
          })),
        services: services.filter((s) => s.title.trim().length > 0),
        education: education.filter((e) => e.degree.trim().length > 0),
        experience: experience.filter((exp) => exp.role.trim().length > 0),
        awards: awards.filter((a) => a.title.trim().length > 0),
        publications: publications.filter((p) => p.title.trim().length > 0),
        memberships: memberships.filter((m) => m.organizationName.trim().length > 0),
        publicContact: publicContactPayload,
        publicDocuments: publicDocuments.filter((d) => d.title.trim().length > 0),
        portfolioSections: sections,
      });

      if (res?.success && res.doctor) {
        setProfile(res.doctor);
        setSlug(res.doctor.slug || targetSlug);
        if (typeof window !== "undefined") {
          try {
            const currentStored = JSON.parse(localStorage.getItem("gb_portal_user") || "{}");
            const updatedUser = {
              ...currentStored,
              ...res.doctor,
              name: res.doctor.fullName || currentStored.name,
              avatar: res.doctor.avatar,
            };
            localStorage.setItem("gb_portal_user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("portal-user-updated", { detail: updatedUser }));
            window.dispatchEvent(new Event("global-booking-updated"));
          } catch {}
        }
        setSuccessMessage("All profile settings and portfolio sections saved successfully to database!");
        setShowSuccessModal(true);
        setTimeout(() => setSuccessMessage(null), 6000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loadStatus === "loading") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          gap: 16,
          color: "#94a3b8",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            border: "3px solid rgba(229,184,105,0.25)",
            borderTopColor: "#e5b869",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: 14 }}>Loading doctor profile and portfolio settings from database...</p>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: "0 20px" }}>
        <div
          role="alert"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 16,
            padding: "32px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f87171",
            }}
          >
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Unable to Load Doctor Profile
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", maxWidth: 520, lineHeight: 1.5 }}>
              {loadError || "An error occurred while loading your profile data from the database. Save actions have been blocked to protect your profile from accidental data loss."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
              color: "#07131f",
              padding: "10px 22px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
              boxShadow: "0 4px 12px rgba(229,184,105,0.25)",
            }}
          >
            <RotateCw size={15} />
            <span>Retry Loading Profile</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 80 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(229,184,105,0.14) 0%, rgba(11,19,37,0.92) 100%)",
          border: "1px solid rgba(229,184,105,0.3)",
          borderRadius: 18,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 18,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(229,184,105,0.15)",
              border: "2px solid rgba(229,184,105,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5b869",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <UserCircle size={40} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                {profile?.fullName || "Doctor Profile Settings"}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: isPublished ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)",
                  color: isPublished ? "#34d399" : "#f87171",
                  border: `1px solid ${isPublished ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isPublished ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}
                {isPublished ? "Live Published" : "Draft Hidden"}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>
              {customTitle || profile?.specialty} • License #{profile?.licenseNumber} • Account ID: {profile?.doctorId}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {slug && (
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                color: "#07131f",
                padding: "9px 16px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(229,184,105,0.25)",
              }}
            >
              <ExternalLink size={14} />
              <span>View Live Website</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => void fetchProfile()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#cbd5e1",
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <RotateCw size={13} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveError && (
        <div
          role="alert"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#f87171",
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{saveError}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            background: "rgba(16,185,129,0.14)",
            border: "1px solid rgba(16,185,129,0.35)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#34d399",
            fontSize: 13,
          }}
        >
          <Check size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* =========================================================================
              01. BASIC IDENTITY & PRACTICE
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <Stethoscope size={20} color="#e5b869" />
              1. Professional Identity & Practice Overview
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. Dr Jahedul Islam"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Primary Medical Specialty *
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. Cardiology"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Custom Professional Title (Public Headline)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. Consultant Interventional Cardiologist"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Years of Clinical Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Profile Photo URL
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  {avatar && (
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid #e5b869",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                Doctor Biography & Philosophy of Patient Care
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
                placeholder="Share your clinical background, specialized diagnostic approaches, patient-centered care philosophy, and hospital affiliations..."
              />
            </div>

            {/* Quick Degree Tags & Languages */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginTop: 18 }}>
              {/* Credentials Badges */}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Quick Credential Badges ({medicalDegrees.length})
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {medicalDegrees.map((deg, idx) => (
                    <span
                      key={deg + idx}
                      style={{
                        background: "rgba(229,184,105,0.12)",
                        border: "1px solid rgba(229,184,105,0.3)",
                        color: "#e5b869",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {deg}
                      <button
                        type="button"
                        onClick={() => handleRemoveDegreeTag(idx)}
                        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newDegreeTag}
                    onChange={(e) => setNewDegreeTag(e.target.value)}
                    placeholder="e.g. FRCP (London), MD"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDegreeTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDegreeTag}
                    style={{
                      background: "rgba(229,184,105,0.2)",
                      border: "1px solid rgba(229,184,105,0.4)",
                      color: "#e5b869",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </div>
              </div>

              {/* Languages Spoken */}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Languages Spoken with Patients ({languages.length})
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {languages.map((lang, idx) => (
                    <span
                      key={lang + idx}
                      style={{
                        background: "rgba(59,130,246,0.12)",
                        border: "1px solid rgba(59,130,246,0.3)",
                        color: "#60a5fa",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(idx)}
                        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="e.g. English, Arabic, Bengali"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLanguage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    style={{
                      background: "rgba(59,130,246,0.2)",
                      border: "1px solid rgba(59,130,246,0.4)",
                      color: "#60a5fa",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              02. CLINICAL SERVICES & SPECIALTIES
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={20} color="#e5b869" />
                  2. Clinical Services & Medical Expertise ({services.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Add your genuine clinical services. These render in the primary 4-card service grid on your website.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddService}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Service
              </button>
            </div>

            {services.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No custom services added yet. Default services matching your specialty will be shown if left empty.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {services.map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Service #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Service Title *
                        </label>
                        <input
                          type="text"
                          value={srv.title}
                          onChange={(e) => handleUpdateService(idx, "title", e.target.value)}
                          placeholder="e.g. Comprehensive Cardiac Evaluation"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Category / Subheadline
                        </label>
                        <input
                          type="text"
                          value={srv.category || ""}
                          onChange={(e) => handleUpdateService(idx, "category", e.target.value)}
                          placeholder="e.g. Diagnostic & Clinical Care"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        Service Description
                      </label>
                      <input
                        type="text"
                        value={srv.description || ""}
                        onChange={(e) => handleUpdateService(idx, "description", e.target.value)}
                        placeholder="e.g. Thorough clinical examination, ECG evaluation, hypertension control..."
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              03. EDUCATION & ACADEMIC CREDENTIALS
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <GraduationCap size={20} color="#e5b869" />
                  3. Academic Degrees & Medical Qualifications ({education.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Detailed degrees, medical colleges, institutions, and graduation years.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEducation}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Degree
              </button>
            </div>

            {education.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No structured qualifications added yet. Add your medical degrees to display verified credentials.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {education.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Degree #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Degree / Credential Name *
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                          placeholder="e.g. MBBS — Bachelor of Medicine, Bachelor of Surgery"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Institution / Medical College *
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => handleUpdateEducation(idx, "institution", e.target.value)}
                          placeholder="e.g. Dhaka Medical College & Hospital"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Graduation Year
                        </label>
                        <input
                          type="text"
                          value={edu.graduationYear || ""}
                          onChange={(e) => handleUpdateEducation(idx, "graduationYear", e.target.value)}
                          placeholder="e.g. 2010"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Field of Study
                        </label>
                        <input
                          type="text"
                          value={edu.fieldOfStudy || ""}
                          onChange={(e) => handleUpdateEducation(idx, "fieldOfStudy", e.target.value)}
                          placeholder="e.g. Cardiology"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              04. PROFESSIONAL EXPERIENCE & APPOINTMENTS
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={20} color="#e5b869" />
                  4. Clinical Appointments & Experience ({experience.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Record clinical roles, hospitals, healthcare institutions, and timelines.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddExperience}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Appointment
              </button>
            </div>

            {experience.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No experience entries added yet. Add past and current clinical appointments.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {experience.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Appointment #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Role / Clinical Position *
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                          placeholder="e.g. Consultant Interventional Cardiologist"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Hospital / Organization *
                        </label>
                        <input
                          type="text"
                          value={exp.organization}
                          onChange={(e) => handleUpdateExperience(idx, "organization", e.target.value)}
                          placeholder="e.g. Mediclinic City Hospital"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Department
                        </label>
                        <input
                          type="text"
                          value={exp.department || ""}
                          onChange={(e) => handleUpdateExperience(idx, "department", e.target.value)}
                          placeholder="e.g. Cardiology Suite"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Start Year
                          </label>
                          <input
                            type="text"
                            value={exp.startYear}
                            onChange={(e) => handleUpdateExperience(idx, "startYear", e.target.value)}
                            placeholder="e.g. 2021"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "8px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            End Year
                          </label>
                          <input
                            type="text"
                            disabled={exp.isCurrent}
                            value={exp.isCurrent ? "Present" : exp.endYear || ""}
                            onChange={(e) => handleUpdateExperience(idx, "endYear", e.target.value)}
                            placeholder="e.g. 2024"
                            style={{
                              width: "100%",
                              background: exp.isCurrent ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "8px 10px",
                              color: exp.isCurrent ? "#94a3b8" : "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={exp.isCurrent ?? false}
                          onChange={(e) => handleUpdateExperience(idx, "isCurrent", e.target.checked)}
                          style={{ accentColor: "#e5b869" }}
                        />
                        <span>Currently active in this position</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              05. AWARDS, HONORS & RECOGNITIONS
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <Award size={20} color="#e5b869" />
                  5. Awards, Honors & Recognitions ({awards.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Clinical excellence awards, medical board distinctions, and investigator honors.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddAward}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Award
              </button>
            </div>

            {awards.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No awards added yet. Add distinctions to showcase on your profile.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {awards.map((awd, idx) => (
                  <div
                    key={awd.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Award #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAward(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Award / Honor Title *
                        </label>
                        <input
                          type="text"
                          value={awd.title}
                          onChange={(e) => handleUpdateAward(idx, "title", e.target.value)}
                          placeholder="e.g. Excellence in Clinical Cardiology"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Issuing Body / Organization *
                        </label>
                        <input
                          type="text"
                          value={awd.issuingBody}
                          onChange={(e) => handleUpdateAward(idx, "issuingBody", e.target.value)}
                          placeholder="e.g. National Healthcare Excellence Awards"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Year
                        </label>
                        <input
                          type="text"
                          value={awd.year || ""}
                          onChange={(e) => handleUpdateAward(idx, "year", e.target.value)}
                          placeholder="e.g. 2023"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        Brief Description / Context
                      </label>
                      <input
                        type="text"
                        value={awd.description || ""}
                        onChange={(e) => handleUpdateAward(idx, "description", e.target.value)}
                        placeholder="e.g. Recognized for clinical distinction and exceptional patient outcomes..."
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              06. PUBLICATIONS & RESEARCH
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <BookOpen size={20} color="#e5b869" />
                  6. Publications & Clinical Research ({publications.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Medical papers, journal articles, and clinical study publications.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPublication}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Publication
              </button>
            </div>

            {publications.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No publications added yet. Add your clinical research to establish academic authority.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {publications.map((pub, idx) => (
                  <div
                    key={pub.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Publication #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePublication(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        Article / Paper Title *
                      </label>
                      <input
                        type="text"
                        value={pub.title}
                        onChange={(e) => handleUpdatePublication(idx, "title", e.target.value)}
                        placeholder="e.g. Clinical Outcomes of Transradial PCI in Acute Coronary Syndrome"
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Journal / Conference
                        </label>
                        <input
                          type="text"
                          value={pub.journal || ""}
                          onChange={(e) => handleUpdatePublication(idx, "journal", e.target.value)}
                          placeholder="e.g. Journal of the American College of Cardiology"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Year
                        </label>
                        <input
                          type="text"
                          value={pub.year || ""}
                          onChange={(e) => handleUpdatePublication(idx, "year", e.target.value)}
                          placeholder="e.g. 2022"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          URL / PubMed Link
                        </label>
                        <input
                          type="text"
                          value={pub.url || ""}
                          onChange={(e) => handleUpdatePublication(idx, "url", e.target.value)}
                          placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              07. PROFESSIONAL MEMBERSHIPS & SOCIETIES
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={20} color="#e5b869" />
                  7. Professional Memberships & Fellowships ({memberships.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Medical societies, specialty boards, and international cardiology colleges.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMembership}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Society
              </button>
            </div>

            {memberships.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No memberships added yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {memberships.map((mem, idx) => (
                  <div
                    key={mem.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Membership #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMembership(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Organization / College Name *
                        </label>
                        <input
                          type="text"
                          value={mem.organizationName}
                          onChange={(e) => handleUpdateMembership(idx, "organizationName", e.target.value)}
                          placeholder="e.g. European Society of Cardiology (ESC)"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Fellowship / Membership Role
                        </label>
                        <input
                          type="text"
                          value={mem.role || ""}
                          onChange={(e) => handleUpdateMembership(idx, "role", e.target.value)}
                          placeholder="e.g. Fellow (FESC) or Active Member"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Member Since
                        </label>
                        <input
                          type="text"
                          value={mem.sinceYear || ""}
                          onChange={(e) => handleUpdateMembership(idx, "sinceYear", e.target.value)}
                          placeholder="e.g. 2018"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              08. CONSULTATION FEES & CHAMBER LOCATIONS
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <CreditCard size={20} color="#e5b869" />
              8. Consultation Fee & Chamber Locations
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Initial Consultation Fee
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={consultationFeeAed}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setConsultationFeeAed(0);
                      } else {
                        const num = Number(val);
                        setConsultationFeeAed(Number.isNaN(num) ? 0 : num);
                      }
                    }}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
                  Follow-up fee is automatically calculated at 75% ({Math.round(consultationFeeAed * 0.75)}).
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Primary Chamber Summary
                </label>
                <input
                  type="text"
                  value={chamberSummary}
                  onChange={(e) => setChamberSummary(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. City General Hospital, Central Medical Wing"
                />
              </div>
            </div>

            {/* Detailed Chamber List */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  Visiting Chamber Locations ({chambers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddChamber}
                  style={{
                    background: "rgba(229,184,105,0.15)",
                    border: "1px solid rgba(229,184,105,0.35)",
                    color: "#e5b869",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={13} />
                  Add Chamber
                </button>
              </div>

              {chambers.length === 0 ? (
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                  No structured chambers added yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {chambers.map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                          Chamber #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChamber(idx)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Hospital / Clinic Facility Name *
                          </label>
                          <input
                            type="text"
                            value={ch.facilityName}
                            onChange={(e) => handleUpdateChamber(idx, "facilityName", e.target.value)}
                            placeholder="e.g. Mediclinic City Hospital"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            City / State / Region
                          </label>
                          <input
                            type="text"
                            value={ch.city}
                            onChange={(e) => handleUpdateChamber(idx, "city", e.target.value)}
                            placeholder="e.g. Downtown Central"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Visiting Schedule / Hours
                          </label>
                          <input
                            type="text"
                            value={ch.visitingSchedule || ""}
                            onChange={(e) => handleUpdateChamber(idx, "visitingSchedule", e.target.value)}
                            placeholder="e.g. Mon - Wed: 9:00 AM - 1:00 PM"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Room / Suite & Floor
                          </label>
                          <input
                            type="text"
                            value={ch.roomNumber || ""}
                            onChange={(e) => handleUpdateChamber(idx, "roomNumber", e.target.value)}
                            placeholder="e.g. Suite 405, 4th Floor"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Clinic Direct Phone
                          </label>
                          <input
                            type="text"
                            value={ch.contactPhone || ""}
                            onChange={(e) => handleUpdateChamber(idx, "contactPhone", e.target.value)}
                            placeholder="e.g. +1 555 123 4567"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            Chamber Timezone (IANA)
                          </label>
                          <input
                            type="text"
                            value={ch.timezone || ""}
                            onChange={(e) => handleUpdateChamber(idx, "timezone", e.target.value)}
                            placeholder="e.g. Asia/Dubai or Asia/Dhaka"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6,
                              padding: "7px 10px",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              09. PUBLIC PATIENT CONTACT & INQUIRIES
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
              <Phone size={20} color="#e5b869" />
              9. Direct Patient Inquiries & Contact Channels
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#94a3b8" }}>
              These public contact details are strictly displayed on your portfolio website for patients. Your personal login credentials remain completely private.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Clinic Desk Phone
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    placeholder="e.g. +1 555 123 4567"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "10px 12px 10px 36px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <Phone size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: 13 }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Patient Inquiry WhatsApp
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={inquiryWhatsApp}
                    onChange={(e) => setInquiryWhatsApp(e.target.value)}
                    placeholder="e.g. +1 555 987 6543"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "10px 12px 10px 36px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <MessageCircle size={15} color="#10b981" style={{ position: "absolute", left: 12, top: 13 }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Public Patient Email
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={publicEmail}
                    onChange={(e) => setPublicEmail(e.target.value)}
                    placeholder="e.g. dr.jahedul.cardiology@booking.com"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "10px 12px 10px 36px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <Mail size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: 13 }} />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              10. CREDENTIAL DOCUMENTS & CERTIFICATES
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={20} color="#e5b869" />
                  10. Credential Certificates & Public Verification Files ({publicDocuments.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Attach public verification references (e.g. Medical Board License, Fellowship Diploma, Patient Brochures).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDocument}
                style={{
                  background: "rgba(229,184,105,0.18)",
                  border: "1px solid rgba(229,184,105,0.4)",
                  color: "#e5b869",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Add Document
              </button>
            </div>

            {publicDocuments.length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                No credential documents attached yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {publicDocuments.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5b869" }}>
                        Credential #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 2.5fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Document Title *
                        </label>
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => handleUpdateDocument(idx, "title", e.target.value)}
                          placeholder="e.g. Medical Board Specialist License"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Document Type
                        </label>
                        <input
                          type="text"
                          value={doc.documentType}
                          onChange={(e) => handleUpdateDocument(idx, "documentType", e.target.value)}
                          placeholder="e.g. Medical License"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          Document Link / File URL *
                        </label>
                        <input
                          type="text"
                          value={doc.url}
                          onChange={(e) => handleUpdateDocument(idx, "url", e.target.value)}
                          placeholder="https://example.com/licenses/license.pdf"
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              11. SECTION VISIBILITY & CUSTOM TITLES
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
              <Layers size={20} color="#e5b869" />
              11. Portfolio Section Visibility & Custom Titles
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#94a3b8" }}>
              Control which sections appear on your live public website and customize section headings.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              {[
                { key: "services", label: "Clinical Services Section", defaultTitle: "Comprehensive Clinical Care" },
                { key: "education", label: "Academic Qualifications", defaultTitle: "Academic Qualifications & Degrees" },
                { key: "experience", label: "Experience & Appointments", defaultTitle: "Clinical Appointments & Experience" },
                { key: "awards", label: "Awards & Honors Section", defaultTitle: "Awards & Honors" },
                { key: "publications", label: "Publications Section", defaultTitle: "Publications & Clinical Research" },
                { key: "memberships", label: "Memberships & Societies", defaultTitle: "Professional Societies & Fellowships" },
                { key: "chambers", label: "Chambers & Schedule", defaultTitle: "Chamber & Visiting Schedule" },
                { key: "contact", label: "Contact & Inquiries", defaultTitle: "Contact & Inquiries" },
              ].map((sec) => {
                const setting = sections[sec.key] || { isVisible: true, customTitle: sec.defaultTitle };
                return (
                  <div
                    key={sec.key}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        {sec.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSection(sec.key)}
                        style={{
                          background: setting.isVisible ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          border: `1px solid ${setting.isVisible ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                          color: setting.isVisible ? "#34d399" : "#f87171",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {setting.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {setting.isVisible ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
                        Custom Heading
                      </label>
                      <input
                        type="text"
                        value={setting.customTitle || ""}
                        onChange={(e) => handleUpdateSectionTitle(sec.key, e.target.value)}
                        placeholder={sec.defaultTitle}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: "6px 10px",
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              12. WEBSITE SLUG & VISIBILITY
              ========================================================================= */}
          <div
            style={{
              background: "#0c1527",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={20} color="#e5b869" />
              12. Public Portfolio Link & Publishing Status
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "center" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Doctor Website Slug
                </label>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0 10px" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      padding: "10px 8px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                    placeholder="dr-jahedul-islam"
                  />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
                  Unique address for your public doctor profile and booking link.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>
                  Public Visibility
                </label>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: isPublished ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isPublished ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)"}`,
                    color: isPublished ? "#34d399" : "#94a3b8",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                  <span>{isPublished ? "Published (Visible at Public URL)" : "Unpublished (Draft Mode)"}</span>
                </button>
              </div>
            </div>

            {slug && (
              <div
                style={{
                  marginTop: 18,
                  padding: "16px 20px",
                  background: "rgba(229,184,105,0.08)",
                  border: "1px solid rgba(229,184,105,0.3)",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e5b869", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Your Dedicated Personal Doctor Website
                  </div>
                  <div style={{ fontSize: 15, color: "#fff", fontWeight: 800, marginTop: 4 }}>
                    /{slug}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Every doctor receives a distinct, unique personal profile link. All your profile settings are published dynamically to this address.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <a
                    href={`/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                      color: "#07131f",
                      padding: "9px 18px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>View Live Website</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SUBMIT ACTION BUTTON BAR
              ========================================================================= */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="submit"
              disabled={saving || loadStatus !== "loaded"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                color: "#0b1325",
                fontWeight: 800,
                fontSize: 15,
                padding: "14px 34px",
                borderRadius: 12,
                border: "none",
                cursor: saving || loadStatus !== "loaded" ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(229,184,105,0.3)",
                opacity: saving || loadStatus !== "loaded" ? 0.6 : 1,
              }}
            >
              <Save size={18} />
              <span>{saving ? "Saving All Changes to Database..." : "Save All Profile & Portfolio Changes"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* =========================================================================
          PREMIUM CONFIRMATION POPUP MODAL
          ========================================================================= */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: 520,
              width: "100%",
              background: "linear-gradient(145deg, #0f172a 0%, #070c14 100%)",
              borderRadius: 24,
              border: "1px solid rgba(229, 184, 105, 0.45)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(229, 184, 105, 0.2)",
              padding: "36px 30px 28px",
              textAlign: "center",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold ambient glow */}
            <div
              style={{
                position: "absolute",
                top: -60,
                left: "50%",
                transform: "translateX(-50%)",
                width: 240,
                height: 120,
                background: "radial-gradient(circle, rgba(229, 184, 105, 0.28) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              aria-label="Close modal"
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "50%",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <X size={18} />
            </button>

            {/* Glowing Icon Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(229, 184, 105, 0.22) 0%, rgba(229, 184, 105, 0.06) 100%)",
                border: "2px solid rgba(229, 184, 105, 0.5)",
                boxShadow: "0 0 30px rgba(229, 184, 105, 0.28)",
                marginBottom: 20,
              }}
            >
              <CheckCircle2 size={42} color="#e5b869" />
            </div>

            {/* Modal Heading */}
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 22,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!
            </h3>
            <p
              style={{
                margin: "0 0 22px",
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 1.5,
              }}
            >
              Profile Settings, Photos & Portfolio Synchronized Successfully
            </p>

            {/* Doctor Profile Card Inside Modal */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(229, 184, 105, 0.25)",
                borderRadius: 16,
                padding: "16px 18px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2.5px solid #e5b869",
                  boxShadow: "0 4px 14px rgba(229, 184, 105, 0.35)",
                  flexShrink: 0,
                  backgroundColor: "#1e293b",
                }}
              >
                <img
                  src={avatar?.trim() || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400"}
                  alt={fullName || "Doctor Profile"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400";
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {fullName || "Doctor"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#e5b869",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 2,
                  }}
                >
                  {specialty || "Medical Specialist"}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "#34d399",
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                      boxShadow: "0 0 6px #10b981",
                    }}
                  />
                  <span>Sidebar, Topbar & Live Portfolio Synchronized</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const targetUrl = `/${slug}`;
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #e5b869 0%, #c49a45 100%)",
                  color: "#0b1325",
                  fontWeight: 800,
                  fontSize: 14,
                  padding: "13px 20px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(229, 184, 105, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                <ExternalLink size={16} />
                <span>লাইভ প্রোফাইল দেখুন</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#e2e8f0",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "13px 24px",
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span>ঠিক আছে / সম্পন্ন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
