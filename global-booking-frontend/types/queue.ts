export type QueueStatus = "Serving" | "Next" | "Waiting" | "Delayed" | "Completed";
export type PriorityLevel = "Standard" | "VIP" | "Urgent";
export type CheckInChannel = "Online Booking" | "QR Walk-In" | "Kiosk Check-In";

export interface QueueItem {
  id: string;
  ticketNumber: string; // e.g. "#012"
  clientName: string;
  clientAvatar: string;
  service: string;
  specialist: string;
  counterName: string;
  checkInTime: string;
  estWaitMinutes: number;
  status: QueueStatus;
  priority: PriorityLevel;
  channel: CheckInChannel;
  notes?: string;
  appointmentRef?: string;
}

export interface CounterStation {
  id: string;
  name: string;
  room: string;
  specialist: string;
  specialistRole: string;
  specialistAvatar: string;
  status: "Active" | "Break" | "Closed";
  currentTicket?: string;
  totalServedToday: number;
}
