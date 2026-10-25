/**
 * GLOBAL BOOKING — Notification & Practice Alert Types
 */

export type NotificationType = "appointment" | "queue" | "patient" | "system" | "billing";
export type NotificationPriority = "urgent" | "normal" | "info";

export interface NotificationRecord {
  id: string; // Unique identifier
  doctorId: string; // Multi-tenant primary doctor ID
  hospitalId?: string | undefined;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  chamberId?: string | undefined;
  chamberName?: string | undefined;
  patientName?: string | undefined;
  patientPhone?: string | undefined;
  tokenNumber?: string | undefined;
  actionLink?: string | undefined;
  actionLabel?: string | undefined;
  eventRef?: string | undefined; // Idempotency reference for duplicate prevention
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface NotificationPreferencesRecord {
  id: string;
  doctorId: string;
  soundAlerts: boolean;
  browserPush: boolean;
  queueAlerts: boolean;
  appointmentAlerts: boolean;
  whatsappAlerts: boolean;
  smsAlerts: boolean;
  emailDigest: boolean;
  securityAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeNotificationPreferences = Omit<NotificationPreferencesRecord, "_id">;

export const DEFAULT_NOTIFICATION_PREFERENCES_VALUES = {
  soundAlerts: true,
  browserPush: true,
  queueAlerts: true,
  appointmentAlerts: true,
  whatsappAlerts: true,
  smsAlerts: true,
  emailDigest: false,
  securityAlerts: true,
} as const;

export interface NotificationsQueryInput {
  type?: string;
  read?: string;
  priority?: string;
  chamberId?: string;
  search?: string;
  page?: string;
  limit?: string;
}
