# GLOBAL BOOKING Frontend

This is the independent Next.js App Router frontend for GLOBAL BOOKING. It provides a responsive homepage, documented public and application route foundations, controlled industry terminology, and the server-side integration endpoint `GET /api/backend-health`.

The frontend and backend remain separate projects. The frontend communicates with the backend only through HTTP and does not import backend source files. Authentication, authorization, tenant isolation, booking transactions, and persistence remain deferred backend responsibilities.

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer
- The backend project at `/Users/mdtaijulislam/Projects/global-booking-backend/`

Check that local ports 3001 and 3002 are available before starting either server:

```sh
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
```

Do not stop an unrelated process. Choose other available ports and update `API_BASE_URL` if either port is occupied.

## Install each project independently

Backend:

```sh
cd /Users/mdtaijulislam/Projects/global-booking-backend
npm ci
npm run validate
```

Frontend:

```sh
cd /Users/mdtaijulislam/Projects/global-booking-frontend
npm ci
npm run typecheck
npm test
npm run build
```

## Start local development servers

Terminal 1 — backend:

```sh
cd /Users/mdtaijulislam/Projects/global-booking-backend
HOST=127.0.0.1 PORT=3001 npm run dev
```

Terminal 2 — frontend:

```sh
cd /Users/mdtaijulislam/Projects/global-booking-frontend
API_BASE_URL=http://127.0.0.1:3001 npm run dev -- --port 3002
```

`API_BASE_URL` is server-only. Do not rename it with a `NEXT_PUBLIC_` prefix.

## Verify the integration

```sh
curl --fail http://127.0.0.1:3001/health
curl --fail http://localhost:3002/api/backend-health
```

Both responses should contain `status: "ok"`, `service: "global-booking"`, and a valid timestamp. If the backend is unavailable or returns an invalid response, the frontend route returns a controlled JSON error with HTTP 502.

The example environment configuration is documented in `.env.example`. You may copy it to the ignored `.env.local` for local development, or provide `API_BASE_URL` directly when starting the frontend as shown above.

## Routes and architecture

- `docs/ROUTE_MAP.md` lists every page and route pattern.
- `docs/FRONTEND_ARCHITECTURE.md` explains rendering, configuration, and security boundaries.
- `docs/API_INTEGRATION.md` documents the Fastify health integration.

No placeholder images or favicon are included because no approved brand assets were supplied. The current GB mark is rendered with HTML and CSS.
