import { BackendHealthError } from "./api-error";
import { validateBackendHealth } from "./health";
import type { BackendHealth } from "@/types/api";

function healthEndpoint(apiBaseUrl: string): URL {
  const normalizedBaseUrl = apiBaseUrl.trim();

  if (normalizedBaseUrl.length === 0) {
    throw new BackendHealthError("configuration", "API_BASE_URL must be configured.");
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(normalizedBaseUrl);
  } catch (error) {
    throw new BackendHealthError(
      "configuration",
      "API_BASE_URL must be a valid absolute URL.",
      { cause: error },
    );
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new BackendHealthError(
      "configuration",
      "API_BASE_URL must use HTTP or HTTPS.",
    );
  }

  return new URL("/health", baseUrl);
}

export async function fetchBackendHealth(options: {
  readonly apiBaseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly timeoutMilliseconds?: number;
} = {}): Promise<BackendHealth> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.API_BASE_URL ?? "";
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const timeoutMilliseconds = options.timeoutMilliseconds ?? 5_000;
  const endpoint = healthEndpoint(apiBaseUrl);

  let response: Response;

  try {
    response = await fetchImplementation(endpoint, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMilliseconds),
    });
  } catch (error) {
    throw new BackendHealthError(
      "connection",
      "The backend health endpoint is unavailable.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new BackendHealthError(
      "upstream-response",
      `The backend health endpoint returned HTTP ${response.status}.`,
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new BackendHealthError(
      "invalid-response",
      "The backend health response was not valid JSON.",
      { cause: error },
    );
  }

  return validateBackendHealth(payload);
}
