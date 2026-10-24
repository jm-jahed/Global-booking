/**
 * GLOBAL BOOKING — Day-End Queue Automatic Scheduler
 * 
 * Rules:
 * 1. Respects each doctor's and clinic's configured IANA timezone (e.g. "Asia/Dhaka", "Asia/Dubai").
 * 2. Multi-instance concurrency safe: uses atomic run-tokens in MongoDB to prevent duplicate runs across instances.
 * 3. Completely idempotent: retrying never deletes or duplicates records.
 * 4. Preserves all tickets, appointments, and patient histories.
 */

import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { getChamberBusinessDate, isValidIanaTimezone } from "./queue.timezone.js";
import { archiveDoctorQueueDayEnd } from "./queue.service.js";
import type { DoctorChamberDetail } from "../admin/admin.types.js";

let schedulerTimer: NodeJS.Timeout | null = null;
let isExecuting = false;

export interface DayEndRunResult {
  totalDoctorsProcessed: number;
  totalChambersProcessed: number;
  totalTicketsArchived: number;
  totalPatientsSynced: number;
  errors: string[];
}

export const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface DayEndRunOptions {
  leaseDurationMs?: number;
  workerId?: string;
}

/**
 * Executes system-wide day-end cleanup across all registered doctors and chambers.
 * Checks each chamber's authoritative local timezone and archives prior-day queue tickets.
 * Uses atomic distributed lease ownership with crash recovery for expired or failed leases.
 */
export async function runSystemDayEndCleanup(
  options: DayEndRunOptions = {},
): Promise<DayEndRunResult> {
  if (isExecuting) {
    return {
      totalDoctorsProcessed: 0,
      totalChambersProcessed: 0,
      totalTicketsArchived: 0,
      totalPatientsSynced: 0,
      errors: ["Scheduler already executing in this process."],
    };
  }

  if (!mongoAdapter.isConnected()) {
    return {
      totalDoctorsProcessed: 0,
      totalChambersProcessed: 0,
      totalTicketsArchived: 0,
      totalPatientsSynced: 0,
      errors: ["Database not connected."],
    };
  }

  isExecuting = true;
  const result: DayEndRunResult = {
    totalDoctorsProcessed: 0,
    totalChambersProcessed: 0,
    totalTicketsArchived: 0,
    totalPatientsSynced: 0,
    errors: [],
  };

  const leaseMs = options.leaseDurationMs || DEFAULT_LEASE_DURATION_MS;
  const currentWorkerId =
    options.workerId ||
    `worker-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const docCol = mongoAdapter.getDoctorCollection();
    const db = mongoAdapter.getDb();
    const runsCol = db.collection("queue_day_end_runs");

    const doctors = await docCol.find({ accountStatus: "ACTIVE" }).toArray();

    for (const doc of doctors) {
      result.totalDoctorsProcessed++;
      const chambers = (doc.chambers || []).length > 0
        ? doc.chambers!
        : [{ id: "main-chamber", facilityName: "Main Chamber", timezone: "Asia/Dhaka" } as DoctorChamberDetail];

      for (const chm of chambers) {
        result.totalChambersProcessed++;
        const tz = chm.timezone && isValidIanaTimezone(chm.timezone) ? chm.timezone : "Asia/Dhaka";
        const todayKey = getChamberBusinessDate(tz, new Date());
        const runLockId = `${doc.doctorId}:${chm.id}:${todayKey}`;

        const now = new Date();
        const nowIso = now.toISOString();
        const expiredBeforeIso = new Date(now.getTime() - leaseMs).toISOString();

        try {
          if (typeof runsCol.updateOne === "function") {
            let acquired = false;

            // Step 1: Attempt to acquire lock if no record exists for today
            const insertRes = await runsCol.updateOne(
              { id: runLockId },
              {
                $setOnInsert: {
                  id: runLockId,
                  doctorId: doc.doctorId,
                  chamberId: chm.id,
                  dateKey: todayKey,
                  timezone: tz,
                  lockedAt: nowIso,
                  workerId: currentWorkerId,
                  status: "RUNNING",
                },
              },
              { upsert: true },
            ).catch(() => null);

            if (insertRes && (insertRes as any).upsertedCount > 0) {
              acquired = true;
            } else {
              // Step 2: Lock record already exists. Check if we can safely take over an expired lease or retry a failed run.
              // Takeover conditions:
              //   a) status is "FAILED"
              //   b) status is "RUNNING" but lockedAt < expiredBeforeIso (crashed/abandoned worker)
              const takeoverRes = await runsCol.updateOne(
                {
                  id: runLockId,
                  $or: [
                    { status: "FAILED" },
                    { status: "RUNNING", lockedAt: { $lt: expiredBeforeIso } },
                  ],
                },
                {
                  $set: {
                    status: "RUNNING",
                    workerId: currentWorkerId,
                    lockedAt: nowIso,
                    recoveredAt: nowIso,
                  },
                },
              ).catch(() => null);

              if (takeoverRes && (takeoverRes as any).modifiedCount > 0) {
                acquired = true;
              }
            }

            if (!acquired) {
              // Lock is actively held by a live worker or already successfully COMPLETED today
              continue;
            }
          }

          const cleanupRes = await archiveDoctorQueueDayEnd(doc.doctorId, {
            chamberId: chm.id,
          });

          result.totalTicketsArchived += cleanupRes.archivedCount;
          result.totalPatientsSynced += cleanupRes.patientsSyncedCount;

          if (typeof runsCol.updateOne === "function") {
            await runsCol.updateOne(
              { id: runLockId, workerId: currentWorkerId },
              {
                $set: {
                  status: "COMPLETED",
                  archivedCount: cleanupRes.archivedCount,
                  patientsSyncedCount: cleanupRes.patientsSyncedCount,
                  completedAt: new Date().toISOString(),
                },
              },
            ).catch(() => null);
          }
        } catch (err: any) {
          result.errors.push(`Doc ${doc.doctorId} Chamber ${chm.id}: ${err.message}`);
          if (typeof runsCol.updateOne === "function") {
            await runsCol.updateOne(
              { id: runLockId, workerId: currentWorkerId },
              {
                $set: {
                  status: "FAILED",
                  lastError: err.message,
                  failedAt: new Date().toISOString(),
                },
              },
            ).catch(() => null);
          }
        }
      }
    }
  } finally {
    isExecuting = false;
  }

  return result;
}

/**
 * Initializes the background scheduler to run periodically.
 */
export function startDayEndQueueScheduler(intervalMs = 30 * 60 * 1000): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  // Periodic trigger
  schedulerTimer = setInterval(() => {
    runSystemDayEndCleanup().catch(() => {});
  }, intervalMs);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
}

/**
 * Stops the background scheduler cleanly.
 */
export function stopDayEndQueueScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
