import { notFound } from "next/navigation";
import { AppointmentDetailView } from "@/components/portal/appointments/appointment-detail-view";
import { MOCK_APPOINTMENTS } from "@/lib/data/mock-appointments";
import { isSafeSlug } from "@/lib/validation/route-params";
import { pageMetadata } from "@/lib/utils/metadata";
import { Appointment } from "@/types/appointment";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  return pageMetadata(
    `Appointment ${appointmentId.toUpperCase()}`,
    `Detailed schedule, patient profile, and operational notes for appointment ${appointmentId}.`
  );
}

export default async function Page({
  params,
}: {
  readonly params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const normalizedId = appointmentId.toLowerCase();

  if (!isSafeSlug(normalizedId)) {
    notFound();
  }

  // Find matching appointment in mock data
  const foundAppointment = MOCK_APPOINTMENTS.find(
    (apt) =>
      apt.id.toLowerCase() === normalizedId ||
      apt.referenceNumber.toLowerCase() === normalizedId
  );

  // If not found in default list, construct a realistic fallback based on ID
  const appointment: Appointment = foundAppointment || {
    id: appointmentId.toUpperCase(),
    referenceNumber: appointmentId.toUpperCase(),
    clientName: "Valued Patient",
    clientEmail: "patient@example.com",
    clientPhone: "+1 (555) 234-5678",
    clientAvatar: "/avatars/alex-johnson.jpg",
    patientName: "Valued Patient",
    patientEmail: "patient@example.com",
    patientPhone: "+1 (555) 234-5678",
    patientAvatar: "/avatars/alex-johnson.jpg",
    service: "General Consultation",
    serviceCategory: "Medical & Health",
    durationMinutes: 45,
    price: 150,
    staffName: "Dr. Sarah Khan",
    staffRole: "Chief Physician",
    staffAvatar: "/avatars/dr-sarah-khan.jpg",
    date: "2025-04-15",
    time: "10:30 AM",
    endTime: "11:15 AM",
    status: "Confirmed",
    type: "In-Person",
    paymentStatus: "Paid",
    roomOrLink: "Consultation Suite 302",
    notes: "Appointment details and verified schedule.",
    serialNumber: "#012",
  };

  return <AppointmentDetailView appointment={appointment} />;
}
