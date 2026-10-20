"use client";

import { useState } from "react";
import { X, User, Mail, Phone, Calendar, HeartPulse, Shield, AlertTriangle, FileText } from "lucide-react";
import { Patient, BloodGroup, PatientStatus } from "@/types/patient";

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (patient: Patient) => void;
}

const DOCTORS = [
  { name: "Dr. Sarah Khan", department: "General Medicine / Cardiology" },
  { name: "Dr. James Wilson", department: "Dental & Oral Surgery" },
  { name: "Dr. Emily Davis", department: "Dermatology & Aesthetics" },
  { name: "Dr. Michael Brown", department: "Orthopedics & Spine" },
];

export function NewPatientModal({ isOpen, onClose, onAddPatient }: NewPatientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("1995-05-15");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Female");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0].name);
  const [insurance, setInsurance] = useState("Daman National Health");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("Spouse");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const doctorObj = DOCTORS.find((d) => d.name === selectedDoctor) || DOCTORS[0];
    const randNum = Math.floor(1013 + Math.random() * 500);
    const birthYear = parseInt(dob.split("-")[0], 10) || 1995;
    const currentYear = new Date().getFullYear();
    const calculatedAge = Math.max(1, currentYear - birthYear);

    const newPatient: Patient = {
      id: `PT-${randNum}`,
      mrn: `GB-MRN-${randNum}`,
      name: name.trim(),
      avatar: "/avatars/alex-johnson.jpg",
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: phone.trim() || "+971 50 000 1234",
      dob,
      age: calculatedAge,
      gender,
      bloodGroup,
      primaryDoctor: doctorObj.name,
      department: doctorObj.department,
      lastVisit: "Today (Registered)",
      nextAppointment: "Pending Schedule",
      status: "New" as PatientStatus,
      insuranceProvider: insurance || "Self-Pay / Private",
      emergencyContact: {
        name: emergencyName || "Not Provided",
        phone: emergencyPhone || phone || "+971 50 000 0000",
        relation: emergencyRelation,
      },
      allergies: allergies ? allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      chronicConditions: [],
      vitals: {
        bloodPressure: "120/80 mmHg",
        heartRate: 72,
        temperature: "36.7 °C",
        bloodSugar: "95 mg/dL",
        weightKg: 65,
      },
      notes: notes || "Newly onboarded patient in directory.",
      totalAppointments: 1,
      registeredDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    };

    onAddPatient(newPatient);
    onClose();
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <User size={18} className="text-gold" />
            </div>
            <div>
              <h2 className="modal-heading">Register New Patient</h2>
              <p className="modal-subheading">Create patient clinical file & record identity</p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          {/* Row 1: Name & Gender */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Patient Full Name *</label>
              <div className="modal-input-wrap">
                <User size={15} className="modal-input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Layla Al-Rashid"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="modal-select modal-input-plain"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Email Address</label>
              <div className="modal-input-wrap">
                <Mail size={15} className="modal-input-icon" />
                <input
                  type="email"
                  placeholder="layla.rashid@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Mobile Phone (UAE / Int)</label>
              <div className="modal-input-wrap">
                <Phone size={15} className="modal-input-icon" />
                <input
                  type="tel"
                  placeholder="+971 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>
          </div>

          {/* Row 3: DOB & Blood Group */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Date of Birth</label>
              <div className="modal-input-wrap">
                <Calendar size={15} className="modal-input-icon" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="modal-select modal-input-plain"
              >
                <option value="O+">O Positive (O+)</option>
                <option value="A+">A Positive (A+)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Primary Doctor & Insurance */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Assigned Specialist / Doctor</label>
              <div className="modal-input-wrap">
                <HeartPulse size={15} className="modal-input-icon" />
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="modal-select"
                >
                  {DOCTORS.map((doc) => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name} ({doc.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Insurance Provider</label>
              <div className="modal-input-wrap">
                <Shield size={15} className="modal-input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Daman / AXA / Self-Pay"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Emergency Contact */}
          <div className="modal-grid-two">
            <div className="modal-field">
              <label className="modal-label">Emergency Contact Name</label>
              <input
                type="text"
                placeholder="Contact person name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="modal-input modal-input-plain"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Relationship</label>
              <input
                type="text"
                placeholder="e.g. Spouse / Parent"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="modal-input modal-input-plain"
              />
            </div>
          </div>

          {/* Row 6: Allergies / Known Conditions */}
          <div className="modal-field">
            <label className="modal-label">Known Allergies (comma separated)</label>
            <div className="modal-input-wrap">
              <AlertTriangle size={15} className="modal-input-icon text-gold" />
              <input
                type="text"
                placeholder="e.g. Penicillin, Latex, Sulfa (Leave empty if none)"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="modal-input"
              />
            </div>
          </div>

          {/* Row 7: Clinical Notes */}
          <div className="modal-field">
            <label className="modal-label">Clinical Notes / Intake Remarks</label>
            <div className="modal-input-wrap">
              <FileText size={15} className="modal-input-icon" style={{ top: 12 }} />
              <textarea
                rows={2}
                placeholder="Any special medical conditions, intake observations, or treatment goals..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="modal-textarea"
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="modal-actions-footer">
            <button type="button" className="secondary-action-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-gold-button">
              <span>Save & Register Patient</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
