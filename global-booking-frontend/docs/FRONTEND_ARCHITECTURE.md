# Frontend Architecture

## Purpose

This independent Next.js application provides the GLOBAL BOOKING presentation and route foundation. It does not contain database access, authentication enforcement, tenant authorization, or booking transaction logic.

## Boundaries

- `app/` owns App Router pages, shared error/loading states, and frontend Route Handlers.
- `components/` owns reusable visual composition and layout.
- `config/` owns controlled routes, navigation, site copy, and industry terminology.
- `lib/api/` owns the server-side HTTP boundary to the separate Fastify backend.
- `lib/validation/` validates untrusted URL parameters before rendering controlled routes.
- `types/` owns frontend contracts only.
- `tests/` protects API response validation, route coverage, and terminology rules.

The legacy `lib/backend-api.ts` path remains as a compatibility re-export for the Phase 1 test and any existing imports. The implementation lives under `lib/api/`.

## Rendering model

The site uses the Next.js App Router. Static informational routes use Server Components. The root error boundary is the only Client Component. Dynamic industry routes validate parameters against the controlled industry configuration; arbitrary category strings are rejected with the not-found state.

## Visual system

The visual direction uses dark navy, warm paper neutrals, restrained gold accents, editorial serif display typography, and system sans-serif body typography. CSS is local to `app/globals.css`; no UI framework or remote font dependency is used.

No placeholder image files or favicon were added because no approved brand assets were supplied. The GB letter mark is rendered in accessible HTML/CSS and can later be replaced by approved artwork.

## Security

Frontend route visibility is not authorization. The Fastify backend must eventually enforce authentication, role-based permissions, tenant isolation, and auditability. Patient information must never be rendered until an approved, least-privilege backend contract exists.
