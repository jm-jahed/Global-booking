# Industry Categories

Category configuration is centralized in `src/shared/configuration/industry-categories.ts`. Shared application code must use category identifiers and neutral domain concepts; visible terminology must be resolved from the selected category.

| Category | Primary recipient | Additional role | Queue | Record label |
|---|---|---|---|---|
| Doctors / Specialists | Patient | None | Available | Patient Records |
| Hospitals / Clinics | Patient | None | Available | Patient Records |
| Salons / Spas | Customer | None | Available | Customer Records |
| Mechanics / Auto Service | Customer | Vehicle Owner | Available | Customer and Vehicle Records |
| Consultants / Professionals | Client | None | Not enabled by default | Client Records |
| Other Businesses | Customer or Client, tenant-configurable | None | Available | Matches configured terminology |

## Medical terminology rule

Doctors / Specialists and Hospitals / Clinics must use:

- Patient Management
- Patient Registration
- Patient Profile
- Patient Appointments
- Patient Follow-ups
- Patient Queue / Serial Number
- Patient Notifications
- Patient History
- Patient Records

Customer and Client are prohibited as visible service-recipient terms in medical-category features. Startup validation and automated tests guard this rule.

## Sensitive information

The configuration identifies medical records as sensitive but defines no clinical fields. Any later patient-record design requires an approved purpose, data-minimization review, least-privilege roles, tenant isolation, access auditing, retention rules, and applicable legal review.

## Future extensibility

Each category can later configure service types, booking requirements, scheduling, queue availability, staff terminology, recipient terminology, record requirements, and public landing-page behavior. Category configuration must be extended instead of copying booking logic into industry-specific modules.
