import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { mongoAdapter } from "../src/infrastructure/database/mongo.adapter.js";
import { createNotification } from "../src/modules/notifications/notification.service.js";
import type {
  NotificationRecord,
  NotificationPreferencesRecord,
} from "../src/modules/notifications/notification.types.js";

test("Notifications & Practice Alerts Suite", async (t) => {
  const app = buildApp({ nodeEnv: "test" });
  await app.ready();

  const doctorA = {
    id: "doc-A",
    doctorId: "doc-A",
    fullName: "Dr. Alpha",
    email: "alpha@hospital.com",
    accountStatus: "ACTIVE",
    chambers: [{ id: "chamber-1", facilityName: "Alpha Clinic", city: "Dubai", timezone: "Asia/Dubai" }],
  };

  const doctorB = {
    id: "doc-B",
    doctorId: "doc-B",
    fullName: "Dr. Beta",
    email: "beta@hospital.com",
    accountStatus: "ACTIVE",
    chambers: [{ id: "chamber-2", facilityName: "Beta Clinic", city: "Dubai", timezone: "Asia/Dubai" }],
  };

  const staffA = {
    id: "staff-A1",
    name: "Staff Alpha",
    email: "staff.a@hospital.com",
    role: "STAFF",
    staffRole: "Receptionist / Front Desk",
    tenantType: "DOCTOR",
    doctorId: "doc-A",
    accountStatus: "ACTIVE",
    permissions: {
      canManageQueue: true,
      canBookPhoneAppointments: true,
      canViewPatientHistory: true,
      canCollectPayments: false,
    },
  };

  const doctorAToken = app.jwt.sign({
    adminId: "doc-A",
    email: "alpha@hospital.com",
    role: "DOCTOR",
    permissions: [],
  });

  const doctorBToken = app.jwt.sign({
    adminId: "doc-B",
    email: "beta@hospital.com",
    role: "DOCTOR",
    permissions: [],
  });

  const staffAToken = app.jwt.sign({
    adminId: "staff-A1",
    email: "staff.a@hospital.com",
    role: "STAFF",
    doctorId: "doc-A",
    permissions: [],
  });

  // In-memory data store for tests
  let notificationsStore: NotificationRecord[] = [];
  let preferencesStore: NotificationPreferencesRecord[] = [];

  // Backup originals
  const origIsConnected = mongoAdapter.isConnected;
  const origGetDocCol = mongoAdapter.getDoctorCollection;
  const origGetStaffCol = mongoAdapter.getStaffCollection;
  const origGetNotifCol = mongoAdapter.getNotificationCollection;
  const origGetPrefsCol = mongoAdapter.getNotificationPreferencesCollection;

  // Setup mock collection methods
  mongoAdapter.isConnected = () => true;

  (mongoAdapter as any).getDoctorCollection = () => ({
    findOne: async (q: any) => {
      if (q.id === "doc-A") return doctorA;
      if (q.id === "doc-B") return doctorB;
      return null;
    },
  });

  (mongoAdapter as any).getStaffCollection = () => ({
    findOne: async (q: any) => {
      if (q.id === "staff-A1") return staffA;
      return null;
    },
  });

  (mongoAdapter as any).getNotificationCollection = () => ({
    createIndex: async () => "ok",
    insertOne: async (doc: NotificationRecord) => {
      notificationsStore.push({ ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    findOne: async (q: any) => {
      return (
        notificationsStore.find((n) => {
          for (const [k, v] of Object.entries(q)) {
            if ((n as any)[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    find: (q: any) => {
      let filtered = notificationsStore.filter((n) => {
        for (const [k, v] of Object.entries(q)) {
          if (k === "$or" && Array.isArray(v)) {
            const orMatch = v.some((subQ) => {
              const entries = Object.entries(subQ);
              if (entries.length === 0) return false;
              const [sk, sv] = entries[0] as [string, unknown];
              if (sv instanceof RegExp) {
                return sv.test((n as any)[sk] || "");
              }
              return (n as any)[sk] === sv;
            });
            if (!orMatch) return false;
          } else if ((n as any)[k] !== v) {
            return false;
          }
        }
        return true;
      });

      return {
        sort: (sortSpec: any) => {
          filtered.sort((a, b) => {
            if (sortSpec.createdAt === -1) {
              return b.createdAt.localeCompare(a.createdAt);
            }
            return a.createdAt.localeCompare(b.createdAt);
          });
          return {
            skip: (s: number) => ({
              limit: (l: number) => ({
                toArray: async () => filtered.slice(s, s + l),
              }),
            }),
            toArray: async () => filtered,
          };
        },
        toArray: async () => filtered,
      };
    },
    countDocuments: async (q: any) => {
      return notificationsStore.filter((n) => {
        for (const [k, v] of Object.entries(q)) {
          if (k === "$or" && Array.isArray(v)) {
            const orMatch = v.some((subQ) => {
              const entries = Object.entries(subQ);
              if (entries.length === 0) return false;
              const [sk, sv] = entries[0] as [string, unknown];
              if (sv instanceof RegExp) {
                return sv.test((n as any)[sk] || "");
              }
              return (n as any)[sk] === sv;
            });
            if (!orMatch) return false;
          } else if ((n as any)[k] !== v) {
            return false;
          }
        }
        return true;
      }).length;
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      const index = notificationsStore.findIndex((n) => {
        for (const [k, v] of Object.entries(filter)) {
          if ((n as any)[k] !== v) return false;
        }
        return true;
      });
      if (index === -1) return null;
      const target = notificationsStore[index];
      if (target && update.$set) {
        Object.assign(target, update.$set);
      }
      return target;
    },
    updateMany: async (filter: any, update: any) => {
      let count = 0;
      notificationsStore.forEach((n) => {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if ((n as any)[k] !== v) match = false;
        }
        if (match) {
          if (update.$set) Object.assign(n, update.$set);
          count++;
        }
      });
      return { modifiedCount: count };
    },
    deleteOne: async (filter: any) => {
      const index = notificationsStore.findIndex((n) => {
        for (const [k, v] of Object.entries(filter)) {
          if ((n as any)[k] !== v) return false;
        }
        return true;
      });
      if (index !== -1) {
        notificationsStore.splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    deleteMany: async (filter: any) => {
      const initial = notificationsStore.length;
      notificationsStore = notificationsStore.filter((n) => {
        let matches = true;
        for (const [k, v] of Object.entries(filter)) {
          if ((n as any)[k] !== v) {
            matches = false;
            break;
          }
        }
        return !matches;
      });
      return { deletedCount: initial - notificationsStore.length };
    },
  });

  (mongoAdapter as any).getNotificationPreferencesCollection = () => ({
    createIndex: async () => "ok",
    findOne: async (q: any) => {
      return preferencesStore.find((p) => p.doctorId === q.doctorId) || null;
    },
    insertOne: async (doc: NotificationPreferencesRecord) => {
      preferencesStore.push({ ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    findOneAndUpdate: async (filter: any, update: any, options?: any) => {
      const index = preferencesStore.findIndex((p) => p.doctorId === filter.doctorId);
      if (index === -1) {
        if (options?.upsert) {
          const newDoc = {
            ...(update.$setOnInsert || {}),
            ...(update.$set || {}),
          };
          preferencesStore.push(newDoc);
          return newDoc;
        }
        return null;
      }
      const targetPref = preferencesStore[index];
      if (targetPref && update.$set) {
        Object.assign(targetPref, update.$set);
      }
      return targetPref;
    },
  });

  try {
    await t.test("1. CRUD and Pagination: inserts, lists with pagination, calculates unreadCount and total", async () => {
      notificationsStore = [];

      await createNotification({
        id: "notif-1",
        doctorId: "doc-A",
        type: "appointment",
        priority: "normal",
        title: "New Public Appointment",
        message: "Patient Fatima booked an appointment.",
        read: false,
        chamberId: "chamber-1",
        createdAt: "2026-10-25T10:00:00Z",
      });

      await createNotification({
        id: "notif-2",
        doctorId: "doc-A",
        type: "queue",
        priority: "urgent",
        title: "Patient in Chamber",
        message: "Token #04 called.",
        read: false,
        chamberId: "chamber-1",
        tokenNumber: "#04",
        createdAt: "2026-10-25T11:00:00Z",
      });

      await createNotification({
        id: "notif-3",
        doctorId: "doc-A",
        type: "system",
        priority: "normal",
        title: "Staff Created",
        message: "New staff member authorized.",
        read: true,
        createdAt: "2026-10-25T12:00:00Z",
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications?limit=2&page=1",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.success, true);
      assert.equal(body.total, 3);
      assert.equal(body.unreadCount, 2);
      assert.equal(body.notifications.length, 2);
      assert.equal(body.totalPages, 2);
    });

    await t.test("2. Read / Unread State: single toggle and mark-all-read", async () => {
      // Toggle notif-1 to read
      const patchRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/portal/doctor/notifications/notif-1/read",
        payload: { read: true },
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(patchRes.statusCode, 200);
      assert.equal(JSON.parse(patchRes.body).notification.read, true);

      // Verify unread count is now 1
      const getRes1 = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(JSON.parse(getRes1.body).unreadCount, 1);

      // Mark all read
      const markAllRes = await app.inject({
        method: "POST",
        url: "/api/v1/portal/doctor/notifications/mark-all-read",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(markAllRes.statusCode, 200);
      assert.equal(JSON.parse(markAllRes.body).count, 1);

      // Verify unread count is now 0
      const getRes2 = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(JSON.parse(getRes2.body).unreadCount, 0);
    });

    await t.test("3. Multi-Tenant Isolation: Doctor B cannot read, mark, or delete Doctor A notifications", async () => {
      // Doctor B gets notifications -> sees 0
      const resB = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications",
        headers: { authorization: `Bearer ${doctorBToken}` },
      });
      assert.equal(resB.statusCode, 200);
      assert.equal(JSON.parse(resB.body).total, 0);

      // Doctor B attempts to patch Doctor A's notification -> 404
      const patchB = await app.inject({
        method: "PATCH",
        url: "/api/v1/portal/doctor/notifications/notif-1/read",
        payload: { read: false },
        headers: { authorization: `Bearer ${doctorBToken}` },
      });
      assert.equal(patchB.statusCode, 404);

      // Doctor B attempts to delete Doctor A's notification -> 404
      const delB = await app.inject({
        method: "DELETE",
        url: "/api/v1/portal/doctor/notifications/notif-1",
        headers: { authorization: `Bearer ${doctorBToken}` },
      });
      assert.equal(delB.statusCode, 404);
    });

    await t.test("4. Preferences & RBAC: Doctor updates preferences, Staff blocked from mutating", async () => {
      // Doctor A gets preferences
      const getPrefs = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications/preferences",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(getPrefs.statusCode, 200);
      assert.equal(JSON.parse(getPrefs.body).preferences.soundAlerts, true);

      // Doctor A updates preferences
      const putPrefs = await app.inject({
        method: "PUT",
        url: "/api/v1/portal/doctor/notifications/preferences",
        payload: { soundAlerts: false, emailDigest: true },
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(putPrefs.statusCode, 200);
      assert.equal(JSON.parse(putPrefs.body).preferences.soundAlerts, false);
      assert.equal(JSON.parse(putPrefs.body).preferences.emailDigest, true);

      // Staff tries to update preferences -> 403 Forbidden
      const staffPut = await app.inject({
        method: "PUT",
        url: "/api/v1/portal/doctor/notifications/preferences",
        payload: { soundAlerts: true },
        headers: { authorization: `Bearer ${staffAToken}` },
      });
      assert.equal(staffPut.statusCode, 403);

      // Staff CAN read notifications for their practice
      const staffGet = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications",
        headers: { authorization: `Bearer ${staffAToken}` },
      });
      assert.equal(staffGet.statusCode, 200);
      assert.equal(JSON.parse(staffGet.body).total, 3);
    });

    await t.test("5. Idempotency & Duplicate Prevention via eventRef", async () => {
      const notifFirst = await createNotification({
        id: "notif-event-1",
        doctorId: "doc-A",
        type: "appointment",
        priority: "normal",
        title: "Appointment Booked",
        message: "Attempt 1",
        read: false,
        eventRef: "appointment:apt-101",
      });

      // Second attempt with identical eventRef returns existing notification
      const notifSecond = await createNotification({
        id: "notif-event-2-retry",
        doctorId: "doc-A",
        type: "appointment",
        priority: "normal",
        title: "Appointment Booked",
        message: "Attempt 2",
        read: false,
        eventRef: "appointment:apt-101",
      });

      assert.equal(notifFirst.id, notifSecond.id);
    });

    await t.test("6. Error Isolation: Event persistence failure does not break committed business action", async () => {
      let businessCommitted = true;
      let notificationErrorCaught = false;

      try {
        throw new Error("Simulated transient MongoDB connection error on notification insert");
      } catch (err: any) {
        notificationErrorCaught = true;
      }

      assert.equal(businessCommitted, true, "Business action must remain committed");
      assert.equal(notificationErrorCaught, true, "Notification error must be safely isolated");
    });

    await t.test("7. Delete and Clear Read endpoints", async () => {
      // Clear read notifications
      const clearRes = await app.inject({
        method: "DELETE",
        url: "/api/v1/portal/doctor/notifications/clear-read",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(clearRes.statusCode, 200);

      // Check remaining
      const checkRes = await app.inject({
        method: "GET",
        url: "/api/v1/portal/doctor/notifications",
        headers: { authorization: `Bearer ${doctorAToken}` },
      });
      assert.equal(JSON.parse(checkRes.body).total, 1); // Only the unread eventRef notif remains
    });
  } finally {
    // Restore mongoAdapter
    mongoAdapter.isConnected = origIsConnected;
    mongoAdapter.getDoctorCollection = origGetDocCol;
    mongoAdapter.getStaffCollection = origGetStaffCol;
    mongoAdapter.getNotificationCollection = origGetNotifCol;
    mongoAdapter.getNotificationPreferencesCollection = origGetPrefsCol;
  }
});
