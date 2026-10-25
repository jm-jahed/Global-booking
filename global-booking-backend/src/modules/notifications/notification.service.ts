import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import {
  type NotificationRecord,
  type NotificationPreferencesRecord,
  type NotificationsQueryInput,
  type NotificationType,
  type NotificationPriority,
  DEFAULT_NOTIFICATION_PREFERENCES_VALUES,
} from "./notification.types.js";

const VALID_TYPES: ReadonlySet<NotificationType> = new Set([
  "appointment",
  "queue",
  "patient",
  "system",
  "billing",
]);

const VALID_PRIORITIES: ReadonlySet<NotificationPriority> = new Set([
  "urgent",
  "normal",
  "info",
]);

export class NotificationServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

/**
 * Creates a persistent notification in MongoDB for a doctor.
 * Handles duplicate prevention when eventRef is provided.
 */
export async function createNotification(
  data: Omit<NotificationRecord, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<NotificationRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const {
    id,
    doctorId,
    type,
    priority,
    title,
    message,
    read = false,
    eventRef,
    chamberId,
    chamberName,
    patientName,
    patientPhone,
    tokenNumber,
    actionLink,
    actionLabel,
    hospitalId,
  } = data;

  if (!id || typeof id !== "string") {
    throw new NotificationServiceError(400, "INVALID_ID", "Notification ID is required.");
  }
  if (!doctorId || typeof doctorId !== "string") {
    throw new NotificationServiceError(400, "INVALID_DOCTOR_ID", "Doctor ID is required.");
  }
  if (!VALID_TYPES.has(type)) {
    throw new NotificationServiceError(400, "INVALID_TYPE", `Invalid notification type: ${type}`);
  }
  if (!VALID_PRIORITIES.has(priority)) {
    throw new NotificationServiceError(400, "INVALID_PRIORITY", `Invalid notification priority: ${priority}`);
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new NotificationServiceError(400, "INVALID_TITLE", "Title cannot be empty.");
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new NotificationServiceError(400, "INVALID_MESSAGE", "Message cannot be empty.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();

  // Deduplication check if eventRef is provided
  if (eventRef) {
    const existing = await notifCol.findOne({ doctorId, eventRef });
    if (existing) {
      return existing;
    }
  }

  const nowIso = new Date().toISOString();
  const record: NotificationRecord = {
    id,
    doctorId,
    hospitalId,
    type,
    priority,
    title: title.trim(),
    message: message.trim(),
    read: Boolean(read),
    chamberId,
    chamberName,
    patientName,
    patientPhone,
    tokenNumber,
    actionLink,
    actionLabel,
    eventRef,
    createdAt: data.createdAt || nowIso,
    updatedAt: data.updatedAt || nowIso,
  };

  try {
    await notifCol.insertOne(record);
    return record;
  } catch (err: any) {
    // If unique key collision on eventRef or id, return existing if available
    if (err?.code === 11000 && eventRef) {
      const existing = await notifCol.findOne({ doctorId, eventRef });
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Retrieves notifications for an authenticated doctor with filtering & pagination.
 */
export async function getDoctorNotifications(
  doctorId: string,
  query: NotificationsQueryInput = {},
): Promise<{
  notifications: NotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();

  const filter: any = { doctorId };

  if (query.type && query.type !== "all") {
    if (VALID_TYPES.has(query.type as NotificationType)) {
      filter.type = query.type;
    }
  }

  if (query.read === "true") {
    filter.read = true;
  } else if (query.read === "false") {
    filter.read = false;
  }

  if (query.priority && VALID_PRIORITIES.has(query.priority as NotificationPriority)) {
    filter.priority = query.priority;
  }

  if (query.chamberId && typeof query.chamberId === "string" && query.chamberId.trim()) {
    filter.chamberId = query.chamberId.trim();
  }

  if (query.search && typeof query.search === "string" && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { title: regex },
      { message: regex },
      { patientName: regex },
      { tokenNumber: regex },
      { chamberName: regex },
    ];
  }

  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    notifCol
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    notifCol.countDocuments(filter),
    notifCol.countDocuments({ doctorId, read: false }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    notifications,
    unreadCount,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Updates read status of a specific notification belonging to the doctor.
 */
export async function setNotificationReadStatus(
  doctorId: string,
  notificationId: string,
  read: boolean,
): Promise<NotificationRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();
  const nowIso = new Date().toISOString();

  const result = await notifCol.findOneAndUpdate(
    { id: notificationId, doctorId },
    { $set: { read: Boolean(read), updatedAt: nowIso } },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new NotificationServiceError(404, "NOT_FOUND", "Notification record not found or access denied.");
  }

  return result;
}

/**
 * Marks all notifications for a doctor as read.
 */
export async function markAllNotificationsRead(doctorId: string): Promise<number> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();
  const nowIso = new Date().toISOString();

  const result = await notifCol.updateMany(
    { doctorId, read: false },
    { $set: { read: true, updatedAt: nowIso } },
  );

  return result.modifiedCount;
}

/**
 * Deletes a single notification belonging to a doctor.
 */
export async function deleteNotification(doctorId: string, notificationId: string): Promise<boolean> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();
  const result = await notifCol.deleteOne({ id: notificationId, doctorId });
  return result.deletedCount > 0;
}

/**
 * Clears all read notifications for a doctor.
 */
export async function clearReadNotifications(doctorId: string): Promise<number> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const notifCol = mongoAdapter.getNotificationCollection();
  const result = await notifCol.deleteMany({ doctorId, read: true });
  return result.deletedCount;
}

/**
 * Retrieves notification preferences for a doctor, creating defaults if not yet persisted.
 */
export async function getDoctorNotificationPreferences(
  doctorId: string,
): Promise<NotificationPreferencesRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const prefsCol = mongoAdapter.getNotificationPreferencesCollection();
  const existing = await prefsCol.findOne({ doctorId });
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const defaultRecord: NotificationPreferencesRecord = {
    id: `pref_${doctorId}`,
    doctorId,
    ...DEFAULT_NOTIFICATION_PREFERENCES_VALUES,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await prefsCol.insertOne(defaultRecord);
    return defaultRecord;
  } catch (err: any) {
    if (err?.code === 11000) {
      const found = await prefsCol.findOne({ doctorId });
      if (found) return found;
    }
    throw err;
  }
}

/**
 * Updates notification preferences for a doctor.
 */
export async function updateDoctorNotificationPreferences(
  doctorId: string,
  payload: Partial<NotificationPreferencesRecord>,
): Promise<NotificationPreferencesRecord> {
  if (!mongoAdapter.isConnected()) {
    throw new NotificationServiceError(503, "DATABASE_UNAVAILABLE", "Database is not connected.");
  }

  const prefsCol = mongoAdapter.getNotificationPreferencesCollection();
  const nowIso = new Date().toISOString();

  const updateFields: any = { updatedAt: nowIso };

  const allowedKeys: (keyof typeof DEFAULT_NOTIFICATION_PREFERENCES_VALUES)[] = [
    "soundAlerts",
    "browserPush",
    "queueAlerts",
    "appointmentAlerts",
    "whatsappAlerts",
    "smsAlerts",
    "emailDigest",
    "securityAlerts",
  ];

  for (const key of allowedKeys) {
    if (typeof (payload as any)[key] === "boolean") {
      updateFields[key] = (payload as any)[key];
    }
  }

  const result = await prefsCol.findOneAndUpdate(
    { doctorId },
    {
      $set: updateFields,
      $setOnInsert: {
        id: `pref_${doctorId}`,
        doctorId,
        ...DEFAULT_NOTIFICATION_PREFERENCES_VALUES,
        createdAt: nowIso,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  return result!;
}
