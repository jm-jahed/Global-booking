/**
 * GLOBAL BOOKING — Real Super Admin Backend API Client
 * Connects frontend to the real Fastify + MongoDB Atlas backend (port 3003).
 * Uses HTTP-only cookie credentials (gb_admin_session).
 */

export function getApiBaseUrl(): string {
  // 1. Prioritize explicitly configured NEXT_PUBLIC_API_URL
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(configuredUrl);
        const isConfigLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        const isCurrentLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (isConfigLocal && isCurrentLocal && parsed.hostname !== window.location.hostname) {
          parsed.hostname = window.location.hostname;
          return parsed.origin;
        }
      } catch {}
    }
    return configuredUrl.replace(/\/+$/, "");
  }

  // 2. Client-side browser resolution
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const hostname = window.location.hostname || "localhost";
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local");

    // Localhost development: allow default port 3003
    if (isLocalhost) {
      return `http://${hostname}:3003`;
    }

    // In production (HTTPS or remote host): fail clearly if NEXT_PUBLIC_API_URL is missing
    if (isHttps || process.env.NODE_ENV === "production") {
      throw new Error(
        "API base URL configuration missing. Please configure NEXT_PUBLIC_API_URL in production."
      );
    }

    return `http://${hostname}:3003`;
  }

  // 3. Server-side resolution
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "API base URL configuration missing. Please configure NEXT_PUBLIC_API_URL in production."
    );
  }

  return "http://127.0.0.1:3003";
}

export interface ApiResponse<T> {
  statusCode: number;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegistrationsResponse {
  statusCode: number;
  items: any[];
  pagination: PaginationMeta;
  pendingCount: number;
}

export interface DoctorsResponse {
  statusCode: number;
  items: any[];
  pagination: PaginationMeta;
}

export interface HospitalsResponse {
  statusCode: number;
  items: any[];
  pagination: PaginationMeta;
}

export interface AuditLogsResponse {
  statusCode: number;
  items: any[];
  pagination: PaginationMeta;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Dual auth: Attach Bearer token if present in localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gb_admin_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for HTTP-only cookies
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = body?.message || body?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return body as T;
}

/* =========================================================================
   REGISTRATION REQUESTS API
   ========================================================================= */

export async function getRegistrations(params?: {
  status?: string;
  accountType?: string;
  page?: number;
  limit?: number;
}): Promise<RegistrationsResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.accountType) query.set("accountType", params.accountType);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<RegistrationsResponse>(`/api/v1/admin/registrations${qs}`);
}

export async function getRegistrationById(id: string): Promise<{ statusCode: number; registration: any }> {
  return request(`/api/v1/admin/registrations/${id}`);
}

export async function approveRegistration(
  id: string,
  body?: { consultationFeeAed?: number },
): Promise<{
  statusCode: number;
  success: boolean;
  message: string;
  createdAccount: {
    accountId: string;
    entityId: string;
    accountType: string;
    invitationToken: string;
    invitationTokenExpiresAt: string;
  };
}> {
  return request(`/api/v1/admin/registrations/${id}/approve`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function rejectRegistration(
  id: string,
  body: { reason: string; notes?: string },
): Promise<{ statusCode: number; success: boolean; message: string }> {
  return request(`/api/v1/admin/registrations/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* =========================================================================
   DOCTORS & SPECIALISTS API
   ========================================================================= */

export async function getDoctors(params?: {
  search?: string;
  status?: string;
  specialty?: string;
  page?: number;
  limit?: number;
}): Promise<DoctorsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.specialty) query.set("specialty", params.specialty);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<DoctorsResponse>(`/api/v1/admin/doctors${qs}`);
}

export async function getDoctorById(id: string): Promise<{ statusCode: number; doctor: any; subscription: any }> {
  return request(`/api/v1/admin/doctors/${id}`);
}

export interface CreateDoctorPayload {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  medicalDegrees?: string[];
  chamberLocationsSummary?: string;
  consultationFeeAed?: number;
  accountStatus?: "TRIAL" | "ACTIVE" | "PENDING_APPROVAL";
}

export async function createDoctor(payload: CreateDoctorPayload): Promise<{
  statusCode: number;
  success: boolean;
  message: string;
  doctor: any;
  subscription: any;
  credentials?: {
    email: string;
    password: string;
    loginUrl: string;
  };
  invitation: { token: string; expiresAt: string };
}> {
  return request("/api/v1/admin/doctors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDoctorStatus(
  id: string,
  payload: { status: "ACTIVE" | "SUSPENDED" | "TRIAL"; reason?: string },
): Promise<{ statusCode: number; success: boolean; message: string; previousStatus: string; newStatus: string }> {
  return request(`/api/v1/admin/doctors/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* =========================================================================
   HOSPITALS & CLINICS API
   ========================================================================= */

export async function getHospitals(params?: {
  search?: string;
  status?: string;
  city?: string;
  page?: number;
  limit?: number;
}): Promise<HospitalsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.city) query.set("city", params.city);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<HospitalsResponse>(`/api/v1/admin/hospitals${qs}`);
}

export async function getHospitalById(id: string): Promise<{ statusCode: number; hospital: any; subscription: any }> {
  return request(`/api/v1/admin/hospitals/${id}`);
}

export interface CreateHospitalPayload {
  institutionName: string;
  email: string;
  password?: string;
  phone: string;
  facilityType?: string;
  licenseNumber?: string;
  city?: string;
  emirateOrState?: string;
  addressLine1?: string;
  departments?: string[];
  bedCapacity?: number;
  emergencyUnitAvailable?: boolean;
  accountStatus?: "TRIAL" | "ACTIVE" | "PENDING_APPROVAL";
}

export async function createHospital(payload: CreateHospitalPayload): Promise<{
  statusCode: number;
  success: boolean;
  message: string;
  hospital: any;
  subscription: any;
  credentials?: {
    email: string;
    password: string;
    loginUrl: string;
  };
  invitation: { token: string; expiresAt: string };
}> {
  return request("/api/v1/admin/hospitals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateHospitalStatus(
  id: string,
  payload: { status: "ACTIVE" | "SUSPENDED" | "TRIAL"; reason?: string },
): Promise<{ statusCode: number; success: boolean; message: string; previousStatus: string; newStatus: string }> {
  return request(`/api/v1/admin/hospitals/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* =========================================================================
   SECURITY & AUDIT LOGS API
   ========================================================================= */

export async function getAuditLogs(params?: {
  category?: string;
  action?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogsResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.action) query.set("action", params.action);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<AuditLogsResponse>(`/api/v1/admin/audit-logs${qs}`);
}

/* =========================================================================
   ADMIN AUTHENTICATION API
   ========================================================================= */

export async function adminLogin(credentials: {
  email: string;
  password: string;
}): Promise<{ statusCode: number; token?: string; user: any }> {
  const res = await request<{ statusCode: number; token?: string; user: any }>("/api/v1/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (typeof window !== "undefined") {
    if (res?.token) {
      localStorage.setItem("gb_admin_token", res.token);
    }
    if (res?.user) {
      localStorage.setItem("gb_portal_user", JSON.stringify(res.user));
      localStorage.setItem("gb_account_type", res.user.role || "DOCTOR");
    }
  }
  return res;
}

export async function getAdminMe(): Promise<{ statusCode: number; user: any }> {
  return request("/api/v1/auth/admin/me");
}

export async function adminLogout(): Promise<{ statusCode: number; success: boolean }> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("gb_admin_token");
    localStorage.removeItem("gb_portal_user");
    localStorage.removeItem("gb_account_type");
    window.dispatchEvent(new CustomEvent("global-booking-updated"));
  }
  return request("/api/v1/auth/admin/logout", {
    method: "POST",
  });
}

export function getStoredPortalUser(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("gb_portal_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredAccountType(): "DOCTOR" | "HOSPITAL" | "STAFF" {
  if (typeof window === "undefined") return "DOCTOR";
  const stored = localStorage.getItem("gb_account_type");
  if (stored === "HOSPITAL" || stored === "STAFF" || stored === "DOCTOR") {
    return stored;
  }
  return "DOCTOR";
}

export function setStoredAccountType(type: "DOCTOR" | "HOSPITAL" | "STAFF"): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("gb_account_type", type);
  }
}

/* =========================================================================
   ADMIN USERS & PERMISSIONS API
   ========================================================================= */

export type SuperAdminRole =
  | "SUPER_ADMIN"
  | "OPS_ADMIN"
  | "COMPLIANCE_OFFICER"
  | "SUPPORT_LEAD"
  | "AUDIT_VIEWER";

export type AdminPermission =
  | "MANAGE_ADMIN_USERS"
  | "MANAGE_REGISTRATIONS"
  | "MANAGE_DOCTORS"
  | "VIEW_DOCTORS"
  | "MANAGE_HOSPITALS"
  | "VIEW_HOSPITALS"
  | "MANAGE_SUBSCRIPTIONS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_PLATFORM_SETTINGS";

export interface AdminUserItem {
  adminId: string;
  email: string;
  name: string;
  role: SuperAdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  statusCode: number;
  items: AdminUserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminUsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role) query.set("role", params.role);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<AdminUsersResponse>(`/api/v1/admin/users${qs}`);
}

export async function getAdminUserById(id: string): Promise<{ statusCode: number; user: AdminUserItem }> {
  return request<{ statusCode: number; user: AdminUserItem }>(`/api/v1/admin/users/${id}`);
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
  role: SuperAdminRole;
  permissions?: AdminPermission[];
}): Promise<{ statusCode: number; success: boolean; message: string; user: AdminUserItem }> {
  return request("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminUserStatus(
  id: string,
  data: { isActive: boolean; reason?: string },
): Promise<{ statusCode: number; success: boolean; message: string; user: AdminUserItem }> {
  return request(`/api/v1/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateAdminUserPermissions(
  id: string,
  data: { role?: SuperAdminRole; permissions: AdminPermission[]; reason?: string },
): Promise<{ statusCode: number; success: boolean; message: string; user: AdminUserItem }> {
  return request(`/api/v1/admin/users/${id}/permissions`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* =========================================================================
   PLATFORM SETTINGS API
   ========================================================================= */

export interface PlatformSettings {
  id: "PLATFORM_SETTINGS";
  platformName: string;
  supportEmail: string;
  defaultCurrency: "AED";
  maintenanceMode: boolean;
  registrationAutoReviewEnabled: boolean;
  securityPolicies: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutHours: number;
    requireStrongPassword: boolean;
  };
  providerOnboardingPolicies: {
    requireLicenseVerification: boolean;
    defaultTrialDays: number;
    allowInstantDoctorAccess: boolean;
  };
  updatedAt: string;
  updatedByAdminName?: string;
  updatedByAdminId?: string;
}

export async function getPlatformSettings(): Promise<{ statusCode: number; settings: PlatformSettings }> {
  return request<{ statusCode: number; settings: PlatformSettings }>("/api/v1/admin/settings");
}

export async function updatePlatformSettings(
  data: Partial<PlatformSettings>,
): Promise<{ statusCode: number; success: boolean; message: string; settings: PlatformSettings }> {
  return request<{ statusCode: number; success: boolean; message: string; settings: PlatformSettings }>("/api/v1/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* =========================================================================
   DOCTOR PORTAL SELF-SERVICE API
   ========================================================================= */

export interface DaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
  maxPatients?: number;
}

export interface DoctorChamberDetail {
  id: string;
  facilityName: string;
  city: string;
  address?: string;
  roomNumber?: string;
  visitingSchedule?: string;
  weeklySchedule?: Record<string, DaySchedule>;
  contactPhone?: string;
  timezone?: string;
}

export interface DoctorServiceItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
}

export interface DoctorEducationItem {
  id: string;
  degree: string;
  institution: string;
  graduationYear?: string;
  fieldOfStudy?: string;
}

export interface DoctorExperienceItem {
  id: string;
  role: string;
  organization: string;
  department?: string;
  startYear: string;
  endYear?: string;
  isCurrent?: boolean;
}

export interface DoctorAwardItem {
  id: string;
  title: string;
  issuingBody: string;
  year?: string;
  description?: string;
}

export interface DoctorPublicationItem {
  id: string;
  title: string;
  journal?: string;
  year?: string;
  url?: string;
  abstract?: string;
}

export interface DoctorMembershipItem {
  id: string;
  organizationName: string;
  role?: string;
  sinceYear?: string;
}

export interface DoctorPublicContact {
  clinicPhone?: string;
  inquiryWhatsApp?: string;
  publicEmail?: string;
}

export interface DoctorPortfolioSectionSetting {
  isVisible: boolean;
  order?: number;
  customTitle?: string;
}

export type DoctorPortfolioSections = Record<string, DoctorPortfolioSectionSetting>;

export interface DoctorPublicDocumentRef {
  id: string;
  title: string;
  documentType: string;
  url: string;
}

export interface DoctorProfileRecord {
  id: string;
  doctorId: string;
  fullName: string;
  email: string;
  phone: string;
  avatar: string;
  specialty: string;
  licenseNumber: string;
  accountStatus: string;
  approvedAt: string;
  subscriptionId: string;
  assignedPatientCount: number;
  totalBookingsCount: number;
  chamberLocationsSummary: string;
  yearsOfExperience: number;
  medicalDegrees: string[];
  consultationFee: {
    amountInFils: number;
    currency: "AED";
    formatted: string;
  };
  slug?: string;
  bio?: string;
  languages?: string[];
  chambers?: DoctorChamberDetail[];
  services?: DoctorServiceItem[];
  education?: DoctorEducationItem[];
  experience?: DoctorExperienceItem[];
  awards?: DoctorAwardItem[];
  publications?: DoctorPublicationItem[];
  memberships?: DoctorMembershipItem[];
  publicContact?: DoctorPublicContact;
  portfolioSections?: DoctorPortfolioSections;
  publicDocuments?: DoctorPublicDocumentRef[];
  isPublished?: boolean;
  customTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDoctorProfilePayload {
  fullName?: string;
  specialty?: string;
  bio?: string;
  avatar?: string;
  yearsOfExperience?: number;
  medicalDegrees?: string[];
  chamberLocationsSummary?: string;
  consultationFeeAed?: number;
  languages?: string[];
  chambers?: DoctorChamberDetail[];
  services?: DoctorServiceItem[];
  education?: DoctorEducationItem[];
  experience?: DoctorExperienceItem[];
  awards?: DoctorAwardItem[];
  publications?: DoctorPublicationItem[];
  memberships?: DoctorMembershipItem[];
  publicContact?: DoctorPublicContact;
  portfolioSections?: DoctorPortfolioSections;
  publicDocuments?: DoctorPublicDocumentRef[];
  slug?: string;
  isPublished?: boolean;
  customTitle?: string;
}

export async function getDoctorProfile(): Promise<{ statusCode: number; doctor: DoctorProfileRecord }> {
  return request<{ statusCode: number; doctor: DoctorProfileRecord }>("/api/v1/portal/doctor/profile");
}

export async function updateDoctorProfile(
  payload: UpdateDoctorProfilePayload,
): Promise<{ statusCode: number; success: boolean; message: string; doctor: DoctorProfileRecord }> {
  return request<{ statusCode: number; success: boolean; message: string; doctor: DoctorProfileRecord }>(
    "/api/v1/portal/doctor/profile",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export interface BackendStaffRecord {
  id: string;
  name: string;
  email: string;
  role: "STAFF";
  staffRole: "Receptionist / Front Desk" | "Clinical Nurse" | "Chamber Manager" | "Billing Coordinator";
  tenantType: "DOCTOR" | "HOSPITAL";
  doctorId?: string;
  hospitalId?: string;
  chamberLocation?: string;
  phone?: string;
  permissions: {
    canManageQueue: boolean;
    canBookPhoneAppointments: boolean;
    canViewPatientHistory: boolean;
    canCollectPayments: boolean;
  };
  accountStatus: "ACTIVE" | "SUSPENDED";
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  chamberLocation?: string;
  permissions?: {
    canManageQueue?: boolean;
    canBookPhoneAppointments?: boolean;
    canViewPatientHistory?: boolean;
    canCollectPayments?: boolean;
  };
}

export interface UpdateStaffPayload {
  name?: string;
  phone?: string;
  role?: string;
  chamberLocation?: string;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  password?: string;
  permissions?: {
    canManageQueue?: boolean;
    canBookPhoneAppointments?: boolean;
    canViewPatientHistory?: boolean;
    canCollectPayments?: boolean;
  };
}

export async function getDoctorStaff(): Promise<{ statusCode: number; staff: BackendStaffRecord[] }> {
  return request<{ statusCode: number; staff: BackendStaffRecord[] }>("/api/v1/portal/doctor/staff");
}

export async function createDoctorStaff(
  payload: CreateStaffPayload,
): Promise<{ statusCode: number; success: boolean; message: string; staff: BackendStaffRecord }> {
  return request<{ statusCode: number; success: boolean; message: string; staff: BackendStaffRecord }>(
    "/api/v1/portal/doctor/staff",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateDoctorStaff(
  id: string,
  payload: UpdateStaffPayload,
): Promise<{ statusCode: number; success: boolean; message: string; staff: BackendStaffRecord }> {
  return request<{ statusCode: number; success: boolean; message: string; staff: BackendStaffRecord }>(
    `/api/v1/portal/doctor/staff/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteDoctorStaff(
  id: string,
): Promise<{ statusCode: number; success: boolean; message: string }> {
  return request<{ statusCode: number; success: boolean; message: string }>(
    `/api/v1/portal/doctor/staff/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}

export interface BackendNotificationItem {
  id: string;
  doctorId: string;
  type: "appointment" | "queue" | "patient" | "system" | "billing";
  priority: "urgent" | "normal" | "info";
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
  eventRef?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BackendNotificationPreferences {
  doctorId?: string;
  soundAlerts: boolean;
  browserPush: boolean;
  queueAlerts: boolean;
  appointmentAlerts: boolean;
  whatsappAlerts: boolean;
  smsAlerts: boolean;
  emailDigest: boolean;
  securityAlerts: boolean;
  updatedAt?: string;
}

export interface NotificationsListResponse {
  statusCode: number;
  notifications: BackendNotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

export interface NotificationsQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  read?: boolean;
  chamber?: string;
  priority?: string;
  search?: string;
}

export async function getDoctorNotifications(
  params?: NotificationsQueryParams
): Promise<NotificationsListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.category) query.set("category", params.category);
  if (params?.read !== undefined) query.set("read", String(params.read));
  if (params?.chamber) query.set("chamber", params.chamber);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return request<NotificationsListResponse>(
    `/api/v1/portal/doctor/notifications${qs ? `?${qs}` : ""}`
  );
}

export async function updateNotificationReadStatus(
  id: string,
  read: boolean
): Promise<{ statusCode: number; success: boolean; notification: BackendNotificationItem }> {
  return request<{ statusCode: number; success: boolean; notification: BackendNotificationItem }>(
    `/api/v1/portal/doctor/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
      body: JSON.stringify({ read }),
    }
  );
}

export async function markAllNotificationsAsRead(): Promise<{
  statusCode: number;
  success: boolean;
  modifiedCount: number;
  message: string;
}> {
  return request<{
    statusCode: number;
    success: boolean;
    modifiedCount: number;
    message: string;
  }>("/api/v1/portal/doctor/notifications/mark-all-read", {
    method: "POST",
  });
}

export async function deleteDoctorNotification(
  id: string
): Promise<{ statusCode: number; success: boolean; message: string }> {
  return request<{ statusCode: number; success: boolean; message: string }>(
    `/api/v1/portal/doctor/notifications/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

export async function clearAllReadNotifications(): Promise<{
  statusCode: number;
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  return request<{
    statusCode: number;
    success: boolean;
    deletedCount: number;
    message: string;
  }>("/api/v1/portal/doctor/notifications/clear-read", {
    method: "DELETE",
  });
}

export async function getDoctorNotificationPreferences(): Promise<{
  statusCode: number;
  preferences: BackendNotificationPreferences;
}> {
  return request<{
    statusCode: number;
    preferences: BackendNotificationPreferences;
  }>("/api/v1/portal/doctor/notifications/preferences");
}

export async function updateDoctorNotificationPreferences(
  preferences: Partial<BackendNotificationPreferences>
): Promise<{
  statusCode: number;
  success: boolean;
  preferences: BackendNotificationPreferences;
}> {
  return request<{
    statusCode: number;
    success: boolean;
    preferences: BackendNotificationPreferences;
  }>("/api/v1/portal/doctor/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}



