"use client";

import { useState } from "react";
import { X, Sparkles, Clock, DollarSign, Shield, Stethoscope, Tag, FileText, CheckCircle2 } from "lucide-react";
import { ClinicalService, ServiceCategory, ServiceStatus } from "@/types/service";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: ClinicalService) => void;
}

const CATEGORIES: ServiceCategory[] = [
  "General Medicine",
  "Cardiology & Vascular",
  "Dental & Oral Surgery",
  "Dermatology & Aesthetics",
  "Orthopedics & Spine",
  "Diagnostics & Radiology",
  "Pediatrics",
  "Rehabilitation & Physio",
];

const SPECIALISTS = [
  { name: "Dr. Sarah Khan", role: "Chief Medical Consultant / Cardiologist", avatar: "/avatars/dr-sarah-khan.jpg" },
  { name: "Dr. James Wilson", role: "Lead Dental Surgeon", avatar: "/avatars/noah-bennett.jpg" },
  { name: "Dr. Emily Davis", role: "Consultant Dermatologist", avatar: "/avatars/sophia-wilson.jpg" },
  { name: "Dr. Michael Brown", role: "Senior Orthopedic Surgeon", avatar: "/avatars/alex-johnson.jpg" },
];

export function NewServiceModal({ isOpen, onClose, onAddService }: NewServiceModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("General Medicine");
  const [duration, setDuration] = useState(45);
  const [priceAED, setPriceAED] = useState(500);
  const [insuranceCovered, setInsuranceCovered] = useState(true);
  const [coPay, setCoPay] = useState(15);
  const [selectedSpecialist, setSelectedSpecialist] = useState(SPECIALISTS[0].name);
  const [room, setRoom] = useState("Consultation Suite 302");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const specialistObj = SPECIALISTS.find((s) => s.name === selectedSpecialist) || SPECIALISTS[0];
    const generatedId = `SRV-${Math.floor(113 + Math.random() * 800)}`;
    const generatedCode = code.trim().toUpperCase() || `${category.slice(0, 4).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const newService: ClinicalService = {
      id: generatedId,
      code: generatedCode,
      name: name.trim(),
      category,
      description: description.trim() || "Comprehensive clinical service provided by certified specialists.",
      durationMinutes: Number(duration) || 30,
      priceAED: Number(priceAED) || 350,
      priceUSD: Math.round((Number(priceAED) || 350) / 3.67),
      status: "Active" as ServiceStatus,
      insuranceCovered,
      coPayPercentage: insuranceCovered ? Number(coPay) : undefined,
      primarySpecialist: specialistObj.name,
      specialistRole: specialistObj.role,
      specialistAvatar: specialistObj.avatar,
      room: room.trim() || "Main Clinic Suite",
      bookingsCount: 0,
      rating: 5.0,
      prepInstructions: [
        "Arrive 10 minutes prior for initial telemetry & triage",
        "Bring government ID & health insurance card",
      ],
      tags: tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : ["Clinical", "Outpatient"],
    };

    onAddService(newService);
    onClose();
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 660, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Sparkles size={18} className="text-gold" />
            </div>
            <div>
              <h2 className="modal-heading">Add Clinical Service</h2>
              <p className="modal-subheading">Define procedure, specialist allocation, and pricing schedule</p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          {/* Row 1: Service Name */}
          <div className="modal-field">
            <label className="modal-label">Service Title / Procedure Name *</label>
            <div className="modal-input-wrap">
              <Stethoscope size={15} className="modal-input-icon text-gold" />
              <input
                type="text"
                required
                placeholder="e.g. Comprehensive Echocardiogram & Doppler"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modal-input"
                autoFocus
              />
            </div>
          </div>

          {/* Row 2: Category & Service Code */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Specialty Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="modal-select modal-input-plain"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Internal Code (CPT / Clinical)</label>
              <input
                type="text"
                placeholder="e.g. CARD-ECHO-01 (Auto if blank)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="modal-input modal-input-plain"
              />
            </div>
          </div>

          {/* Row 3: Duration & Price */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Duration (Minutes)</label>
              <div className="modal-input-wrap">
                <Clock size={15} className="modal-input-icon" />
                <input
                  type="number"
                  min={10}
                  max={240}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Standard Price (AED)</label>
              <div className="modal-input-wrap">
                <DollarSign size={15} className="modal-input-icon" />
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={priceAED}
                  onChange={(e) => setPriceAED(Number(e.target.value))}
                  className="modal-input"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Insurance Coverage */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Insurance Covered?</label>
              <select
                value={insuranceCovered ? "yes" : "no"}
                onChange={(e) => setInsuranceCovered(e.target.value === "yes")}
                className="modal-select modal-input-plain"
              >
                <option value="yes">Yes — Covered by UAE Insurance Networks</option>
                <option value="no">No — Self-Pay / Private Only</option>
              </select>
            </div>

            {insuranceCovered && (
              <div className="modal-field">
                <label className="modal-label">Standard Patient Co-Pay (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={coPay}
                  onChange={(e) => setCoPay(Number(e.target.value))}
                  className="modal-input modal-input-plain"
                />
              </div>
            )}
          </div>

          {/* Row 5: Specialist & Room */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Assigned Consultant / Specialist</label>
              <select
                value={selectedSpecialist}
                onChange={(e) => setSelectedSpecialist(e.target.value)}
                className="modal-select modal-input-plain"
              >
                {SPECIALISTS.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.role.split("/")[0].trim()})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Location / Room Number</label>
              <input
                type="text"
                placeholder="e.g. Cardiology Center, Room 104"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="modal-input modal-input-plain"
              />
            </div>
          </div>

          {/* Row 6: Description */}
          <div className="modal-field">
            <label className="modal-label">Clinical Description & Scope</label>
            <div className="modal-input-wrap">
              <FileText size={15} className="modal-input-icon" style={{ top: 12 }} />
              <textarea
                rows={2}
                placeholder="Brief clinical description of what is performed during this procedure..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="modal-textarea"
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>

          {/* Row 7: Tags */}
          <div className="modal-field">
            <label className="modal-label">Search Tags (comma separated)</label>
            <div className="modal-input-wrap">
              <Tag size={15} className="modal-input-icon" />
              <input
                type="text"
                placeholder="e.g. Diagnostic, Laser, Non-Invasive"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="modal-input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions-footer">
            <button type="button" className="secondary-action-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-gold-button">
              <CheckCircle2 size={16} />
              <span>Register Service</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
