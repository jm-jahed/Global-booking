# Implementation Roadmap

## Phase 1 — Foundation

- Establish strict TypeScript and Fastify localhost execution.
- Define centralized industry and terminology configuration.
- Add health and configuration validation tests.
- Document architecture, management, public-site, security, database, and deployment boundaries.

Phase 1 does not implement business workflows or external integrations.

## Recommended next phase — Domain and security design

Before building UI or persistence, define approved domain contracts for tenants, branches, staff, roles, permissions, services, bookings, queues, and notifications. Complete a specific patient-data threat and privacy review before defining any medical record fields.

## Later phases

1. Implement approved authentication, tenant isolation, authorization, and audit foundations.
2. Add a MongoDB adapter, schemas, indexes, migration strategy, and integration tests after database approval.
3. Implement shared booking capabilities and category-specific configuration behavior.
4. Implement Super Admin workflows and UI after design approval.
5. Implement the public website and booking experiences after design approval.
6. Prepare production deployment and separately configure Cloudflare, domains, DNS, TLS, proxy behavior, observability, backup, and incident procedures.

## Release gates

Each phase requires successful type checking, automated tests, build verification, security review proportional to its data, and an explicit deployment decision. No phase implicitly authorizes production data changes or external-service configuration.
