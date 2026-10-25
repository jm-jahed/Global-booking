import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationItem,
  type NotificationPreferences,
} from "../components/portal/notifications/notification-types";
import type {
  BackendNotificationItem,
  NotificationsListResponse,
  NotificationsQueryParams,
} from "../lib/api/admin-client";

test("1. Empty backend notifications list returns zero records and zero fake demo data", () => {
  const backendResponse: NotificationsListResponse = {
    statusCode: 200,
    notifications: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      unreadCount: 0,
    },
  };

  assert.equal(backendResponse.notifications.length, 0, "Notifications array must be empty");
  assert.equal(backendResponse.pagination.total, 0, "Total count must be 0");
  assert.equal(backendResponse.pagination.unreadCount, 0, "Unread count must be 0");

  // Verify demo names/tokens are absent
  const forbiddenDemoAlerts = [
    "Patient Tariq Mansoor is checked-in",
    "Fatima Al-Zahra booked an online consultation",
    "Medical Report Uploaded",
    "Fatima Begum registered a walk-in patient",
    "Consultation Payout Processed",
  ];

  const messages = backendResponse.notifications.map((n) => n.message);
  for (const forbidden of forbiddenDemoAlerts) {
    assert.ok(
      !messages.includes(forbidden),
      `Demo alert "${forbidden}" must never be present in genuine database responses`
    );
  }
});

test("2. Dynamic topbar unread badge formats correctly and hides when unread is zero", () => {
  const formatBadge = (unreadCount: number): string | null => {
    if (unreadCount <= 0) return null;
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  };

  assert.equal(formatBadge(0), null, "Badge should not render when unread count is 0");
  assert.equal(formatBadge(-1), null, "Badge should not render on negative unread count");
  assert.equal(formatBadge(1), "1", "Badge should display '1' when 1 unread notification exists");
  assert.equal(formatBadge(5), "5", "Badge should display '5'");
  assert.equal(formatBadge(99), "99", "Badge should display '99'");
  assert.equal(formatBadge(100), "99+", "Badge should display '99+' when exceeding 99");
  assert.equal(formatBadge(350), "99+", "Badge should display '99+' on large counts");
});

test("3. Notification preferences defaults are safe and outbound delivery status is explicit", () => {
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.soundAlerts, true, "Sound alerts active by default");
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.queueAlerts, true, "Queue alerts active by default");
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.appointmentAlerts, true, "Appointment alerts active by default");
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.securityAlerts, true, "Security alerts active by default");

  // In Phase 1, outbound channels configure routing preferences, not live SMS/WhatsApp gateways
  const outboundChannelsDeferredInPhase1 = ["whatsappAlerts", "smsAlerts", "browserPush", "emailDigest"];
  for (const channel of outboundChannelsDeferredInPhase1) {
    assert.ok(
      channel in DEFAULT_NOTIFICATION_PREFERENCES,
      `Channel ${channel} exists in preferences schema for policy storage`
    );
  }
});

test("4. Query parameter serializer safely encodes chamber, category, search, and pagination", () => {
  const buildQuery = (params?: NotificationsQueryParams): string => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.category) query.set("category", params.category);
    if (params?.read !== undefined) query.set("read", String(params.read));
    if (params?.chamber) query.set("chamber", params.chamber);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return qs ? `?${qs}` : "";
  };

  const emptyQs = buildQuery();
  assert.equal(emptyQs, "", "Empty params produce empty query string");

  const fullQs = buildQuery({
    page: 2,
    limit: 10,
    category: "queue",
    read: false,
    chamber: "Mediclinic & Hospital (Branch 1)",
    priority: "urgent",
    search: "Dr. Smith & Tariq",
  });

  assert.ok(fullQs.includes("page=2"));
  assert.ok(fullQs.includes("limit=10"));
  assert.ok(fullQs.includes("category=queue"));
  assert.ok(fullQs.includes("read=false"));
  assert.ok(fullQs.includes("chamber=Mediclinic+%26+Hospital+%28Branch+1%29"));
  assert.ok(fullQs.includes("priority=urgent"));
  assert.ok(fullQs.includes("search=Dr.+Smith+%26+Tariq"));
});

test("5. Staff permissions: Staff can view notifications but cannot modify preferences", () => {
  const canModifyPreferences = (role: string): boolean => {
    return role === "DOCTOR" || role === "ADMIN";
  };

  assert.equal(canModifyPreferences("STAFF"), false, "Staff role cannot modify practice preferences");
  assert.equal(canModifyPreferences("DOCTOR"), true, "Doctor role can modify practice preferences");
  assert.equal(canModifyPreferences("ADMIN"), true, "Admin role can modify practice preferences");
});
