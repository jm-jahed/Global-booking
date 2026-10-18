# GLOBAL BOOKING Project Blueprint

## Purpose

GLOBAL BOOKING is planned as a multi-tenant, multi-industry appointment and queue platform. Phase 1 establishes only a locally runnable technical foundation, centralized configuration, architectural boundaries, and specifications.

## Foundation scope

- A Node.js 20-compatible TypeScript service using Fastify.
- A non-UI health endpoint.
- Centralized category and terminology configuration.
- Configuration metadata for future management and public entry points.
- A driver-neutral persistence boundary.
- Security and permissions requirements.
- Automated health and terminology validation.

## Planned platform areas

Future, separately approved work may add shared booking orchestration, tenant and branch management, Super Admin operations, industry-specific workflows, a public website, authentication, notifications, subscriptions, reporting, and persistence.

The shared domain must use neutral concepts internally. Each category supplies visible staff and service-recipient labels. Doctors / Specialists and Hospitals / Clinics always display Patient terminology.

## Explicit exclusions

Phase 1 does not include UI, functional booking or queue workflows, login or registration, business data, MongoDB connectivity, Cloudflare configuration, deployment, DNS, production infrastructure, or GitHub operations.

## Approval boundary

Documentation and configuration in this foundation describe future behavior; they do not authorize implementation of those capabilities. Each subsequent phase requires its own scope and security review.
