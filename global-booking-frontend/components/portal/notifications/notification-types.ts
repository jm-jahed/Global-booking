export type NotificationCategory =
  | "all"
  | "unread"
  | "appointment"
  | "queue"
  | "patient"
  | "system"
  | "billing";

export type NotificationPriority = "urgent" | "normal" | "info";

export interface NotificationItem {
  id: string;
  type: "appointment" | "queue" | "patient" | "system" | "billing";
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  relativeTime: string;
  dateGroup: "Today" | "Yesterday" | "Earlier This Week";
  read: boolean;
  chamber: string;
  patientName?: string;
  patientPhone?: string;
  tokenNumber?: string;
  actionLink?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  soundAlerts: boolean;
  browserPush: boolean;
  queueAlerts: boolean;
  appointmentAlerts: boolean;
  whatsappAlerts: boolean;
  smsAlerts: boolean;
  emailDigest: boolean;
  securityAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  soundAlerts: true,
  browserPush: true,
  queueAlerts: true,
  appointmentAlerts: true,
  whatsappAlerts: true,
  smsAlerts: true,
  emailDigest: false,
  securityAlerts: true,
};
