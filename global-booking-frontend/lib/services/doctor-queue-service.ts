/**
 * GLOBAL BOOKING — Doctor Live OPD Queue Service
 * Connects Live Queue directly with Dr. Jahedul Islam's practice appointments
 * and online patient bookings from public website.
 */

import { QueueItem, CounterStation, QueueStatus, PriorityLevel, CheckInChannel } from "@/types/queue";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  getActiveDoctorContext,
  type DoctorAppointment,
} from "./doctor-appointments-service";

const QUEUE_STORAGE_KEY = "global_booking_doctor_live_queue";

export function getDoctorChamberCounters(): CounterStation[] {
  const ctx = getActiveDoctorContext();
  const chamberTitle = ctx.chamber || "Main Consultation Chamber";
  return [
    {
      id: "cnt-1",
      name: chamberTitle,
      room: chamberTitle,
      specialist: ctx.name || "Doctor Practice",
      specialistRole: ctx.specialty || "Specialist Physician",
      specialistAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
      status: "Active",
      currentTicket: "#01",
      totalServedToday: 12,
    },
  ];
}

export const DOCTOR_CHAMBER_COUNTERS: CounterStation[] = [
  {
    id: "cnt-1",
    name: "Main Consultation Chamber",
    room: "Consultation Chamber",
    specialist: "Doctor Practice",
    specialistRole: "Specialist Physician",
    specialistAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80",
    status: "Active",
    currentTicket: "#01",
    totalServedToday: 12,
  },
];

/**
 * Map Doctor Appointments to Live Queue items with real-time status and wait time
 */
export function getDoctorLiveQueue(): QueueItem[] {
  const ctx = getActiveDoctorContext();
  const apts = getDoctorAppointments();

  // Sort strictly by daily serial number (#01, #02, #03, #04, #05, #06, #07...)
  const sortedApts = [...apts].sort((a, b) => {
    const numA = parseInt(a.serialNumber.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.serialNumber.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  const servingIdx = sortedApts.findIndex((a) => a.status === "In Consultation");
  let nextAssigned = false;

  return sortedApts.map((apt, index) => {
    let qStatus: QueueStatus = "Waiting";
    let estWait = 15;

    if (apt.status === "In Consultation") {
      qStatus = "Serving";
      estWait = 0;
    } else if (apt.status === "Completed") {
      qStatus = "Completed";
      estWait = 0;
    } else if (!nextAssigned && (servingIdx === -1 || index > servingIdx)) {
      qStatus = "Next";
      estWait = 5;
      nextAssigned = true;
    } else if (servingIdx >= 0 && index > servingIdx) {
      estWait = (index - servingIdx) * 15;
    }

    let priority: PriorityLevel = "Standard";
    if (apt.service.toLowerCase().includes("chest pain") || apt.service.toLowerCase().includes("urgent") || apt.service.toLowerCase().includes("emergency")) {
      priority = "Urgent";
    } else if (apt.isOnlineBooking) {
      priority = "VIP";
    }

    let cleanTicket = apt.serialNumber;
    if (cleanTicket.startsWith("TK-") || cleanTicket.startsWith("TK")) {
      const num = parseInt(cleanTicket.replace(/\D/g, ""), 10);
      cleanTicket = `#${(!isNaN(num) && num > 0 && num < 100 ? num : index + 1).toString().padStart(2, "0")}`;
    } else if (!cleanTicket.startsWith("#")) {
      cleanTicket = `#${cleanTicket}`;
    }

    return {
      id: `queue-${apt.id}`,
      ticketNumber: cleanTicket,
      clientName: apt.patientName,
      patientName: apt.patientName,
      clientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      service: apt.service,
      specialist: apt.doctorName || ctx.name || "Doctor Practice",
      counterName: apt.chamberLocation || ctx.chamber || "Main Consultation Chamber",
      checkInTime: apt.time,
      estWaitMinutes: estWait,
      status: qStatus,
      priority,
      channel: "Chamber Visit",
      notes: apt.notes,
      appointmentRef: apt.referenceNumber,
      patientPhone: apt.patientPhone || "+880 1712 345678",
      patientAgeGender: apt.patientAgeGender || "34 / Female",
      patientId: apt.referenceNumber ? `#OPD-${apt.referenceNumber.replace(/\D/g, "") || "45872"}` : "#OPD-45872",
    };
  });
}

/**
 * Call Next patient in line to a specific station
 */
export function callNextQueuePatient(stationName?: string): { updatedQueue: QueueItem[]; calledItem: QueueItem | null } {
  const currentQueue = getDoctorLiveQueue();
  const nextItem = currentQueue.find((q) => q.status === "Next" || q.status === "Waiting");

  if (!nextItem) {
    return { updatedQueue: currentQueue, calledItem: null };
  }

  // Update corresponding appointment status in appointment service
  const realAptId = nextItem.id.replace("queue-", "");
  updateAppointmentStatus(realAptId, "In Consultation");

  const updatedQueue = getDoctorLiveQueue();
  return { updatedQueue, calledItem: nextItem };
}

/**
 * Finish consultation for current serving patient at station
 */
export function finishQueuePatient(stationName?: string): QueueItem[] {
  const currentQueue = getDoctorLiveQueue();
  const servingItem = currentQueue.find((q) => q.status === "Serving");

  if (servingItem) {
    const realAptId = servingItem.id.replace("queue-", "");
    updateAppointmentStatus(realAptId, "Completed");
  }

  return getDoctorLiveQueue();
}
