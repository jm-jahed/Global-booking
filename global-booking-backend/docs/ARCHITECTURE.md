# Architecture

## Technology choice

The foundation uses Node.js 20, strict TypeScript, and Fastify. Fastify provides a small HTTP core, typed extension points, built-in request injection for testing, and room for modular growth without requiring a website framework or UI. The only runtime dependency is Fastify.

## Module boundaries

- `src/config/` validates process-level server settings.
- `src/modules/` contains executable HTTP modules. Phase 1 includes health only.
- `src/shared/` owns cross-industry types, identifiers, configuration, and validation.
- `src/management/` contains specification-level management metadata only.
- `src/public-website/` contains future entry-point metadata only; it has no pages.
- `src/infrastructure/` isolates external adapters from future business logic.

Dependencies should point from delivery and infrastructure code toward shared contracts, never from shared domain contracts toward a database or deployment provider.

## Multi-tenancy and security

Future tenant-aware storage and services must enforce tenant isolation at every access boundary. Authorization must be role-based and least-privilege. Security-relevant administrative actions and access to sensitive patient records must be auditable. Patient information must not be exposed to unauthorized roles or other tenants.

Authentication, authorization enforcement, session handling, and audit-log storage are not implemented in Phase 1.

## Database boundary

`DatabasePort` defines an adapter boundary without selecting or loading a driver. A later MongoDB adapter may implement that contract after approval. Business rules must not import MongoDB-specific APIs. No connection, schema, collection, migration, or seed data exists now.

## Cloudflare boundary

The HTTP application does not contain domain, public IP, DNS, TLS, proxy, tunnel, or Cloudflare credentials. A future deployment may place the service behind Cloudflare while forwarding standard HTTP headers through explicitly reviewed proxy configuration. Cloudflare and production routing remain unconfigured.
