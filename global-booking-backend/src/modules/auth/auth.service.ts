import bcrypt from "bcryptjs";
import type { AdminUserRecord, SafeAdminProfile } from "./auth.types.js";

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Normalizes email address to prevent duplicate case-variant accounts.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hashes a plaintext password using bcrypt with minimum 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be a string with at least 8 characters.");
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Sanitizes an internal database record into a safe, client-facing profile.
 * Never exposes the passwordHash or internal MongoDB _id.
 */
export function sanitizeAdminProfile(record: AdminUserRecord): SafeAdminProfile {
  return {
    id: record.adminId,
    email: record.email,
    name: record.name,
    role: record.role,
    permissions: Object.freeze([...record.permissions]),
    isActive: record.isActive,
    lastLoginAt: record.lastLoginAt,
    createdAt: record.createdAt,
  };
}
