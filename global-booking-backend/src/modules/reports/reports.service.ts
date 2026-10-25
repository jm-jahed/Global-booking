import { mongoAdapter } from "../../infrastructure/database/mongo.adapter.js";
import { normalizeContactNumber, normalizePatientName } from "../patients/patients.service.js";
import type {
  DoctorReportQuery,
  DoctorReportSummary,
  VisitTrendPoint,
  VisitTypeDistribution,
  DoctorReportEncounterItem,
  DoctorReportsResponse,
  ReportVisitType,
  ReportEncounterStatus,
} from "./reports.types.js";
import { ReportsServiceError } from "./reports.types.js";

/**
 * Validates whether a string is a strict YYYY-MM-DD calendar date.
 */
function isValidDateString(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const d = parts[2] ?? 0;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Formats YYYY-MM-DD into short display date e.g. "25 Oct"
 */
function formatShortDisplayDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split("-").map(Number);
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[m - 1] || "";
  return `${String(d).padStart(2, "0")} ${monthName}`;
}

/**
 * Resolves standard inclusive date range.
 * If not supplied, defaults to the current month from day 1 to today.
 */
function resolveDateRange(
  queryStart?: string,
  queryEnd?: string,
  now = new Date(),
): { startDate: string; endDate: string } {
  const currentIso = now.toISOString().slice(0, 10);
  const currentMonthStart = `${currentIso.slice(0, 7)}-01`;

  let startDate = queryStart?.trim() || currentMonthStart;
  let endDate = queryEnd?.trim() || currentIso;

  if (!isValidDateString(startDate)) {
    throw new ReportsServiceError(
      "INVALID_START_DATE",
      `Query parameter 'startDate' must be a valid calendar date in YYYY-MM-DD format (received: '${startDate}').`,
      400,
    );
  }

  if (!isValidDateString(endDate)) {
    throw new ReportsServiceError(
      "INVALID_END_DATE",
      `Query parameter 'endDate' must be a valid calendar date in YYYY-MM-DD format (received: '${endDate}').`,
      400,
    );
  }

  if (startDate > endDate) {
    throw new ReportsServiceError(
      "INVALID_DATE_RANGE",
      `'startDate' (${startDate}) cannot be after 'endDate' (${endDate}).`,
      400,
    );
  }

  return { startDate, endDate };
}

/**
 * Generates all calendar dates between startDate and endDate inclusive.
 */
function generateDateRangeArray(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const stop = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= stop && dates.length <= 90) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Aggregates doctor clinical reports directly from genuine persisted MongoDB collections:
 * - queue_tickets
 * - appointments
 * - patients
 * - doctors
 */
export async function getDoctorReportsData(
  doctorId: string,
  query: DoctorReportQuery,
): Promise<DoctorReportsResponse> {
  if (!mongoAdapter.isConnected()) {
    throw new ReportsServiceError("DATABASE_UNAVAILABLE", "Database persistence is currently unavailable.", 503);
  }

  const { startDate, endDate } = resolveDateRange(query.startDate, query.endDate);

  const docCol = mongoAdapter.getDoctorCollection();
  const queueCol = mongoAdapter.getQueueTicketCollection();
  const aptCol = mongoAdapter.getAppointmentCollection();
  const patientCol = mongoAdapter.getPatientCollection();

  // 1. Resolve Doctor Profile for verified Name & Consultation Fee
  const doctor = await docCol.findOne({
    $or: [{ id: doctorId }, { doctorId }],
  });
  const doctorName = doctor?.fullName || "Doctor";
  let feeAed = 0;
  if (doctor?.consultationFee?.amountInFils !== undefined) {
    feeAed = Math.round(doctor.consultationFee.amountInFils / 100);
  } else if (typeof (doctor as any)?.consultationFeeAed === "number") {
    feeAed = (doctor as any).consultationFeeAed;
  }

  // 2. Fetch existing Patient records for MRN & visit history matching
  const patients = await patientCol.find({ doctorId }).toArray();
  const patientByPhone = new Map<string, (typeof patients)[0]>();
  const patientByName = new Map<string, (typeof patients)[0]>();
  const patientById = new Map<string, (typeof patients)[0]>();

  for (const p of patients) {
    patientById.set(p.id, p);
    if (p.normalizedPhone) {
      patientByPhone.set(p.normalizedPhone, p);
    }
    const normName = normalizePatientName(p.name);
    if (normName) {
      patientByName.set(normName, p);
    }
  }

  // 3. Query queue tickets within date range
  const startClean = startDate.replace(/\D/g, "");
  const endClean = endDate.replace(/\D/g, "");

  const ticketQuery: Record<string, any> = {
    doctorId,
    $or: [
      { dateKey: { $gte: startDate, $lte: endDate } },
      { dateKey: { $gte: startClean, $lte: endClean } },
    ],
  };
  if (query.chamberId) {
    ticketQuery.chamberId = query.chamberId;
  }

  const rawTickets = await queueCol.find(ticketQuery).sort({ dateKey: -1, createdAt: -1 }).toArray();

  // 4. Query appointments within date range
  const aptQuery: Record<string, any> = {
    doctorId,
    appointmentDate: { $gte: startDate, $lte: endDate },
  };
  if (query.chamberId) {
    aptQuery.chamberId = query.chamberId;
  }

  const rawAppointments = await aptCol.find(aptQuery).sort({ appointmentDate: -1, createdAt: -1 }).toArray();

  // 5. Deduplication: Exclude appointments already represented by a queue ticket
  const ticketAptIds = new Set<string>();
  for (const t of rawTickets) {
    if (t.appointmentId) {
      ticketAptIds.add(t.appointmentId);
    }
  }

  const standaloneAppointments = rawAppointments.filter((a) => !ticketAptIds.has(a.id));

  // 6. Map encounters into unified domain encounter records
  interface RawEncounterItem {
    id: string;
    serialNumber: string;
    mrn: string;
    patientKey: string;
    patientName: string;
    phone: string;
    service: string;
    rawDate: string;
    timeDisplay: string;
    status: ReportEncounterStatus;
    feeAed: number;
    source: "QUEUE" | "APPOINTMENT";
    hadPriorAttendedHistory: boolean;
  }

  const rawList: RawEncounterItem[] = [];

  // 6a. Extract raw tickets
  for (const t of rawTickets) {
    const rawDate = t.dateKey?.includes("-")
      ? t.dateKey
      : `${t.dateKey?.slice(0, 4)}-${t.dateKey?.slice(4, 6)}-${t.dateKey?.slice(6, 8)}`;
    const normPhone = normalizeContactNumber(t.patientPhone);
    const normName = normalizePatientName(t.patientName);
    const patientKey = normPhone || normName || t.id;

    // Patient MRN lookup
    const matchedPatient =
      (t.patientOprId && patientById.get(t.patientOprId)) ||
      (normPhone && patientByPhone.get(normPhone)) ||
      (normName && patientByName.get(normName)) ||
      null;

    const mrn = matchedPatient?.mrn || (t.patientOprId ? `MRN-${t.patientOprId.slice(-4)}` : "—");

    let encounterStatus: ReportEncounterStatus = "Scheduled";
    if (t.status === "COMPLETED") encounterStatus = "Completed";
    else if (t.status === "IN_CONSULTATION") encounterStatus = "In Progress";
    else if (t.status === "CANCELLED" || t.status === "SKIPPED" || t.status === "NO_SHOW")
      encounterStatus = "Cancelled";

    const hadPriorAttendedHistory = Boolean(
      matchedPatient?.visitHistory?.some((v) => v.isAttended && v.date < rawDate),
    );

    rawList.push({
      id: t.id,
      serialNumber: t.ticketNumber || String(t.serialIndex || 1).padStart(2, "0"),
      mrn,
      patientKey,
      patientName: t.patientName || "Attending Patient",
      phone: t.patientPhone || "Not Provided",
      service: t.service || "General Consultation",
      rawDate,
      timeDisplay: t.checkInTime || "10:00 AM",
      status: encounterStatus,
      feeAed,
      source: "QUEUE",
      hadPriorAttendedHistory,
    });
  }

  // 6b. Extract raw standalone appointments
  for (const a of standaloneAppointments) {
    const rawDate = a.appointmentDate || startDate;
    const normPhone = normalizeContactNumber(a.patientPhone);
    const normName = normalizePatientName(a.patientName);
    const patientKey = normPhone || normName || a.id;

    const matchedPatient =
      (a.voucherId && patientById.get(a.voucherId)) ||
      (normPhone && patientByPhone.get(normPhone)) ||
      (normName && patientByName.get(normName)) ||
      null;

    const mrn = matchedPatient?.mrn || (a.voucherId ? `MRN-${a.voucherId.slice(-4)}` : "—");

    let encounterStatus: ReportEncounterStatus = "Scheduled";
    if (a.status === "COMPLETED") encounterStatus = "Completed";
    else if (a.status === "IN_CONSULTATION") encounterStatus = "In Progress";
    else if (a.status === "CANCELLED") encounterStatus = "Cancelled";

    const hadPriorAttendedHistory = Boolean(
      matchedPatient?.visitHistory?.some((v) => v.isAttended && v.date < rawDate),
    );

    rawList.push({
      id: a.id,
      serialNumber: a.bookingNumberDisplay || `#${String(a.bookingNumber || 1).padStart(2, "0")}`,
      mrn,
      patientKey,
      patientName: a.patientName || "Attending Patient",
      phone: a.patientPhone || "Not Provided",
      service: a.service || "Online Appointment",
      rawDate,
      timeDisplay: a.appointmentTime || "10:00 AM",
      status: encounterStatus,
      feeAed,
      source: "APPOINTMENT",
      hadPriorAttendedHistory,
    });
  }

  // 6c. Sort chronologically ascending to accurately determine patient first-visit vs follow-up
  rawList.sort((x, y) => (x.rawDate < y.rawDate ? -1 : x.rawDate > y.rawDate ? 1 : 0));

  const seenPatientKeys = new Set<string>();
  const allEncounters: DoctorReportEncounterItem[] = [];

  for (const item of rawList) {
    const srvLower = item.service.toLowerCase();
    let visitType: ReportVisitType = "Consultation";

    if (srvLower.includes("follow")) {
      visitType = "Follow Up";
    } else if (srvLower.includes("review") || srvLower.includes("lab report")) {
      visitType = "Review";
    } else if (
      item.hadPriorAttendedHistory ||
      seenPatientKeys.has(item.patientKey)
    ) {
      visitType = "Follow Up";
    } else {
      visitType = "Consultation";
    }

    if (item.status === "Completed") {
      seenPatientKeys.add(item.patientKey);
    }

    const dateDisplay = `${formatShortDisplayDate(item.rawDate)}, ${item.timeDisplay}`;

    allEncounters.push({
      id: item.id,
      serialNumber: item.serialNumber,
      mrn: item.mrn,
      patientName: item.patientName,
      phone: item.phone,
      visitType,
      dateTime: dateDisplay,
      rawDate: item.rawDate,
      doctorName,
      service: item.service,
      status: item.status,
      feeAed: item.feeAed,
      source: item.source,
    });
  }

  // Sort encounters chronologically descending
  allEncounters.sort((x, y) => (x.rawDate < y.rawDate ? 1 : x.rawDate > y.rawDate ? -1 : 0));

  // 7. Calculate Summary KPIs (strictly from completed visits)
  const completedEncounters = allEncounters.filter((e) => e.status === "Completed");
  const totalVisits = completedEncounters.length;

  const uniquePatientsSet = new Set<string>();
  for (const enc of completedEncounters) {
    const key = enc.phone !== "Not Provided" ? enc.phone : enc.patientName;
    uniquePatientsSet.add(key.toLowerCase().trim());
  }
  const totalPatients = uniquePatientsSet.size;

  const followUpVisits = completedEncounters.filter((e) => e.visitType === "Follow Up").length;
  const newPatientVisits = completedEncounters.filter((e) => e.visitType === "Consultation").length;

  // Average Return Interval Calculation from real consecutive visit dates
  // Groups completed encounters by patient identity and measures day intervals
  const patientDatesMap = new Map<string, string[]>();
  for (const enc of completedEncounters) {
    const key = enc.phone !== "Not Provided" ? enc.phone : enc.patientName;
    const existing = patientDatesMap.get(key) || [];
    existing.push(enc.rawDate);
    patientDatesMap.set(key, existing);
  }

  let totalIntervalSumDays = 0;
  let intervalCount = 0;

  for (const dates of patientDatesMap.values()) {
    if (dates.length >= 2) {
      // Sort dates ascending
      const sorted = [...dates].sort();
      for (let i = 1; i < sorted.length; i++) {
        const d1 = new Date(`${sorted[i - 1]}T00:00:00.000Z`).getTime();
        const d2 = new Date(`${sorted[i]}T00:00:00.000Z`).getTime();
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          totalIntervalSumDays += diffDays;
          intervalCount++;
        }
      }
    }
  }

  const averageIntervalDays =
    intervalCount > 0 ? Math.round(totalIntervalSumDays / intervalCount) : null;
  const hasSufficientIntervalData = intervalCount > 0;

  const summary: DoctorReportSummary = {
    totalVisits,
    totalPatients,
    followUpVisits,
    newPatientVisits,
    averageIntervalDays,
    hasSufficientIntervalData,
  };

  // 8. Visit Trend Points (Day-by-day continuous data for area chart)
  const dateList = generateDateRangeArray(startDate, endDate);
  const visitsByDate = new Map<string, { total: number; newP: number; followUp: number }>();

  for (const d of dateList) {
    visitsByDate.set(d, { total: 0, newP: 0, followUp: 0 });
  }

  for (const enc of completedEncounters) {
    const bucket = visitsByDate.get(enc.rawDate);
    if (bucket) {
      bucket.total++;
      if (enc.visitType === "Follow Up") {
        bucket.followUp++;
      } else {
        bucket.newP++;
      }
    }
  }

  const visitTrend: VisitTrendPoint[] = dateList.map((d) => {
    const data = visitsByDate.get(d) || { total: 0, newP: 0, followUp: 0 };
    return {
      date: d,
      displayDate: formatShortDisplayDate(d),
      totalVisits: data.total,
      newPatients: data.newP,
      followUps: data.followUp,
    };
  });

  // 9. Visit Type Breakdown
  const consultationCount = completedEncounters.filter((e) => e.visitType === "Consultation").length;
  const reviewCount = completedEncounters.filter((e) => e.visitType === "Review").length;
  const followUpCount = followUpVisits;

  const hasData = totalVisits > 0;
  const consultationPct = hasData ? Math.round((consultationCount / totalVisits) * 100) : 0;
  const followUpPct = hasData ? Math.round((followUpCount / totalVisits) * 100) : 0;
  const reviewPct = hasData ? Math.max(0, 100 - consultationPct - followUpPct) : 0;

  const visitTypeBreakdown: VisitTypeDistribution = {
    consultationCount,
    consultationPct,
    followUpCount,
    followUpPct,
    reviewCount,
    reviewPct,
    hasData,
  };

  // 10. Filter & Paginate Encounters Table
  let filtered = allEncounters;

  if (query.search?.trim()) {
    const term = query.search.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.patientName.toLowerCase().includes(term) ||
        e.phone.toLowerCase().includes(term) ||
        e.mrn.toLowerCase().includes(term),
    );
  }

  if (query.visitType && query.visitType !== "ALL") {
    filtered = filtered.filter((e) => e.visitType.toLowerCase() === query.visitType?.toLowerCase());
  }

  if (query.status && query.status !== "ALL") {
    filtered = filtered.filter((e) => e.status.toLowerCase() === query.status?.toLowerCase());
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return {
    statusCode: 200,
    doctorId,
    doctorName,
    dateRange: {
      startDate,
      endDate,
    },
    summary,
    visitTrend,
    visitTypeBreakdown,
    encounters: {
      items,
      total,
      page,
      pageSize: limit,
      totalPages,
    },
  };
}
