import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BackendHealthError,
  fetchBackendHealth,
} from "../lib/backend-api";

test("accepts a valid backend health response", async () => {
  const timestamp = new Date().toISOString();
  const fetchImplementation: typeof fetch = async () =>
    Response.json({ status: "ok", service: "global-booking", timestamp });

  const health = await fetchBackendHealth({
    apiBaseUrl: "http://127.0.0.1:3001",
    fetchImplementation,
  });

  assert.deepEqual(health, {
    status: "ok",
    service: "global-booking",
    timestamp,
  });
});

test("rejects an invalid backend health response", async () => {
  const fetchImplementation: typeof fetch = async () =>
    Response.json({
      status: "ok",
      service: "unexpected-service",
      timestamp: new Date().toISOString(),
    });

  await assert.rejects(
    fetchBackendHealth({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImplementation,
    }),
    (error: unknown) =>
      error instanceof BackendHealthError && error.kind === "invalid-response",
  );
});

test("reports a controlled connection failure", async () => {
  const fetchImplementation: typeof fetch = async () => {
    throw new TypeError("connection refused");
  };

  await assert.rejects(
    fetchBackendHealth({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImplementation,
    }),
    (error: unknown) =>
      error instanceof BackendHealthError && error.kind === "connection",
  );
});
