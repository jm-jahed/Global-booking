import { BackendHealthError } from "./api-error";
import type { BackendHealth } from "@/types/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateBackendHealth(value: unknown): BackendHealth {
  if (
    !isRecord(value) ||
    value.status !== "ok" ||
    value.service !== "global-booking" ||
    typeof value.timestamp !== "string" ||
    Number.isNaN(Date.parse(value.timestamp))
  ) {
    throw new BackendHealthError(
      "invalid-response",
      "The backend returned an invalid health response.",
    );
  }

  return {
    status: value.status,
    service: value.service,
    timestamp: value.timestamp,
  };
}
