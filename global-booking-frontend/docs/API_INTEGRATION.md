# API Integration

## Current integration

The frontend uses the server-only environment variable:

```text
API_BASE_URL=http://127.0.0.1:3001
```

`GET /api/backend-health` calls `GET /health` on the independent Fastify backend. The client accepts a response only when it contains:

- `status: "ok"`
- `service: "global-booking"`
- A valid timestamp string

Invalid JSON, invalid health data, non-success HTTP responses, timeouts, and connection failures produce controlled frontend errors. The upstream address and raw failure details are not exposed to visitors.

## CORS

CORS is not required because the browser calls the Next.js origin and the Next.js server calls Fastify. `API_BASE_URL` must not be renamed with a `NEXT_PUBLIC_` prefix.

## Deferred APIs

No industry directory, business, account, appointment, patient, customer, client, service, staff, reporting, or administration API is invented by this frontend. These require separate backend contracts and authorization design.
