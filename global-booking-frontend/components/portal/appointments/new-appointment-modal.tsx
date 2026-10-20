"use client";

import { useState } from "react";
import { X, Calendar, Clock, User, Stethoscope, DollarSign, FileText } from "lucide-react";
import { Appointment, AppointmentType } from "@/types/appointment";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: (appointment: Appointment) => void;
}

const SERVICES = [
  { name: "General Consultation", category: "Medical & Health", price: 150, duration: 45 },
  { name: "Dental Checkup", category: "Dental & Oral", price: 120, duration: 30 },
  { name: "Skin Care Treatment", category: "Aesthetics & Dermatology", price: 180, duration: 60 },
  { name: "Physiotherapy", category: "Physical Therapy & Rehab", price: 130, duration: 45 },
  { name: "Hair Treatment", category: "Personal Care & Styling", price: 95, duration: 50 },
  { name: "Cardiology Review", category: "Medical & Health", price: 220, duration: 45 },
];

const STAFF_LIST = [
  { name: "Dr. Sarah Khan", role: "Chief Physician", avatar: "/avatars/dr-sarah-khan.jpg" },
  { name: "Dr. James Wilson", role: "Lead Dental Surgeon", avatar: "/avatars/noah-bennett.jpg" },
  { name: "Dr. Emily Davis", role: "Senior Dermatologist", avatar: "/avatars/emma-davis.jpg" },
  { name: "Dr. Michael Brown", role: "Physical Therapist", avatar: "/avatars/daniel-carter.jpg" },
  { name: "Sarah Johnson", role: "Senior Stylist", avatar: "/avatars/olivia-martin.jpg" },
];

export function NewAppointmentModal({ isOpen, onClose, onAddAppointment }: NewAppointmentModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedService, setSelectedService] = useState(SERVICES[0].name);
  const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0].name);
  const [date, setDate] = useState("2025-04-15");
  const [time, setTime] = useState("10:00 AM");
  const [type, setType] = useState<AppointmentType>("In-Person");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const serviceObj = SERVICES.find((s) => s.name === selectedService) || SERVICES[0];
    const staffObj = STAFF_LIST.find((st) => st.name === selectedStaff) || STAFF_LIST[0];
    const randId = `GB-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment: Appointment = {
      id: randId,
      referenceNumber: randId,
      clientName,
      clientEmail: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clientPhone: clientPhone || "+1 (555) 000-1122",
      clientAvatar: "/avatars/alex-johnson.jpg",
      service: serviceObj.name,
      serviceCategory: serviceObj.category,
      durationMinutes: serviceObj.duration,
      price: serviceObj.price,
      staffName: staffObj.name,
      staffRole: staffObj.role,
      staffAvatar: staffObj.avatar,
      date,
      time,
      endTime: "11:00 AM",
      status: "Confirmed",
      type,
      paymentStatus: "Pending",
      roomOrLink: type === "Virtual Video" ? "https://meet.globalbooking.io/" + randId.toLowerCase() : "Suite 204",
      notes: notes || "Newly scheduled patient appointment.",
      serialNumber: `#0${Math.floor(20 + Math.random() * 30)}`,
    };

    onAddAppointment(newAppointment);
    onClose();
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Calendar size={18} className="text-gold" />
            </div>
            <div>
              <h2 className="modal-heading">Book New Appointment</h2>
              <p className="modal-subheading">Schedule an appointment with real-time slot allocation.</p>
            </div>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-content">
          <div className="modal-grid-two">
            {/* Patient Name */}
            <div className="modal-field">
              <label className="modal-label">Patient Full Name *</label>
              <div className="modal-input-wrap">
                <User size={15} className="modal-input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Adams"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            {/* Patient Phone */}
            <div className="modal-field">
              <label className="modal-label">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 012-3456"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="modal-input modal-input-plain"
              />
            </div>
          </div>

          {/* Patient Email */}
          <div className="modal-field">
            <label className="modal-label">Patient Email</label>
            <input
              type="email"
              placeholder="patient@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="modal-input modal-input-plain"
            />
          </div>

          <div className="modal-grid-two">
            {/* Select Service */}
            <div className="modal-field">
              <label className="modal-label">Select Service *</label>
              <div className="modal-input-wrap">
                <Stethoscope size={15} className="modal-input-icon" />
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="modal-select"
                >
                  {SERVICES.map((srv) => (
                    <option key={srv.name} value={srv.name} className="modal-option">
                      {srv.name} (${srv.price} • {srv.duration} min)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Staff */}
            <div className="modal-field">
              <label className="modal-label">Assigned Specialist *</label>
              <div className="modal-input-wrap">
                <User size={15} className="modal-input-icon" />
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="modal-select"
                >
                  {STAFF_LIST.map((staff) => (
                    <option key={staff.name} value={staff.name} className="modal-option">
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-grid-three">
            {/* Date */}
            <div className="modal-field">
              <label className="modal-label">Date</label>
              <div className="modal-input-wrap">
                <Calendar size={14} className="modal-input-icon" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            {/* Time Slot */}
            <div className="modal-field">
              <label className="modal-label">Time Slot</label>
              <div className="modal-input-wrap">
                <Clock size={14} className="modal-input-icon" />
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="modal-select"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="09:45 AM">09:45 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:15 AM">11:15 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                </select>
              </div>
            </div>

            {/* Channel Type */}
            <div className="modal-field">
              <label className="modal-label">Channel</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className="modal-select modal-input-plain"
              >
                <option value="In-Person">In-Person</option>
                <option value="Virtual Video">Virtual Video</option>
                <option value="QR Walk-In">QR Walk-In</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="modal-field">
            <label className="modal-label">Special Notes / Medical Context</label>
            <textarea
              rows={2}
              placeholder="Optional notes or requirements for this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="modal-textarea"
            />
          </div>

          {/* Footer Actions */}
          <div className="modal-actions-footer">
            <button type="button" className="button-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-save-appointment">
              Confirm & Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
