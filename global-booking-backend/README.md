# GLOBAL BOOKING

GLOBAL BOOKING is a planned multi-industry appointment booking platform. This repository currently contains only the approved Phase 1 technical foundation: a typed Fastify service, centralized industry configuration, a health endpoint, tests, and specifications.

No dashboard, website UI, authentication, booking workflow, database connection, Cloudflare setup, deployment, or production configuration is included.

## Requirements

- Node.js 20
- npm 10 or a compatible npm release

## Local setup

```sh
npm install
npm run dev
```

The server defaults to `http://127.0.0.1:3000`. Check it with:

```sh
curl http://127.0.0.1:3000/health
```

`HOST` and `PORT` can be set in the process environment. `.env.example` documents the supported values; the application does not load `.env` automatically, so no environment-loading dependency is required.

## Validation and production-style execution

```sh
npm run typecheck
npm test
npm run build
npm start
```

Run all static and automated checks with:

```sh
npm run validate
```

## Architecture boundaries

- Industry-specific visible terminology is defined in `src/shared/configuration/industry-categories.ts`.
- Shared booking concepts remain industry-neutral.
- Medical categories are validated to use Patient terminology and protected medical-record classification.
- `src/infrastructure/database/database.port.ts` is a driver-neutral future boundary. It does not connect to MongoDB.
- Cloudflare, DNS, proxying, TLS, domains, and deployment remain future work documented under `docs/`.

See `docs/PROJECT_BLUEPRINT.md` and `docs/ARCHITECTURE.md` for the complete Phase 1 scope.
