# Super Admin Specification

This document describes future requirements only. No management capability is implemented in Phase 1.

## Planned capabilities

1. Platform overview with operational summaries and actionable system conditions.
2. Business and tenant registration, review, and lifecycle management.
3. Central industry-category management with protected medical terminology rules.
4. Business activation, suspension, and status transitions with reasons and audit entries.
5. Tenant-scoped branch management.
6. Staff, roles, permissions, and least-privilege access management.
7. Tenant and category-aware booking platform settings.
8. Subscription and plan definitions with controlled lifecycle changes.
9. Platform-wide notification policy and delivery-provider configuration.
10. Tamper-resistant administrative audit logs and security review tools.

## Access requirements

Super Admin access must not imply unrestricted routine access to patient records. Permissions should separate platform operations, tenant administration, clinical or service operations, billing, support, and audit review. Sensitive access and status changes must record actor, tenant, action, target, timestamp, and outcome.

## Tenant safety

All tenant-owned records, settings, branches, staff, and future bookings must remain isolated. Cross-tenant operations require an explicit platform permission and an auditable business purpose.

## Deferred implementation

There are no dashboards, routes, repositories, workflows, subscriptions, notifications, or audit persistence in this phase. Their data models and APIs require later approval.
