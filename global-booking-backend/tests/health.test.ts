import assert from "node:assert/strict";
import { test } from "node:test";

import { buildApp } from "../src/app.js";

test("GET /health reports service readiness", async (context) => {
  const app = buildApp();
  context.after(async () => app.close());

  const response = await app.inject({ method: "GET", url: "/health" });
  const payload = response.json<{
    status: string;
    service: string;
    timestamp: string;
  }>();

  assert.equal(response.statusCode, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "global-booking");
  assert.ok(!Number.isNaN(Date.parse(payload.timestamp)));
});
