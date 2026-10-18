# Route Map

Route-group directory names do not appear in public URLs.

## Public website

| Path | Purpose |
|---|---|
| `/` | Responsive GLOBAL BOOKING homepage |
| `/about` | Platform purpose and boundaries |
| `/industries` | Controlled industry directory |
| `/features` | Foundation capabilities |
| `/how-it-works` | Planned booking journey |
| `/pricing` | Safe pre-pricing state |
| `/contact` | Safe inquiry introduction |
| `/privacy` | Privacy principles and current data status |
| `/terms` | Pre-legal approval state |

## Booking discovery

| Path | Purpose |
|---|---|
| `/book` | Booking discovery entry point |
| `/booking/confirmation` | Future backend-confirmed result route |
| `/booking/status` | Future protected status lookup route |

## Industry and business discovery

| Pattern | Purpose |
|---|---|
| `/[industry]` | Controlled industry overview |
| `/[industry]/[businessSlug]` | Safe business profile foundation |
| `/[industry]/[businessSlug]/book` | Business booking route foundation |
| `/[industry]/[businessSlug]/services` | Business services route foundation |

Configured industry slugs are `/doctors`, `/hospitals`, `/salons`, `/mechanics`, `/consultants`, and `/other-businesses`. Arbitrary industry values return the not-found state. `example-business` is used only to demonstrate route shape; it is not a live business claim.

## Account

`/login`, `/register`, `/forgot-password`, and `/reset-password` are safe introductory states. They collect no credentials and do not claim that authentication exists.

## Business portal

`/dashboard`, `/appointments`, `/appointments/[appointmentId]`, `/patients`, `/customers`, `/clients`, `/services`, `/staff`, `/availability`, `/locations`, `/notifications`, and `/settings` render explicit unconnected states. Route visibility does not grant access.

## Platform administration

`/admin`, `/admin/businesses`, `/admin/users`, `/admin/industries`, `/admin/appointments`, `/admin/reports`, and `/admin/settings` render explicit unconnected states. Backend authorization and auditability are required before operational data is introduced.

## Technical route

`GET /api/backend-health` is the only frontend API Route Handler.
