# Frontend API routes

This directory contains Next.js Route Handlers owned by the frontend application.

`GET /api/backend-health` is the only implemented handler. It calls the separate Fastify backend over server-side HTTP, validates the health response, and returns a controlled error when the backend is unavailable or invalid.

Business APIs are not implemented here. Authentication, authorization, tenant isolation, booking transactions, and data persistence remain backend responsibilities.
