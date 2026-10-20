import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

/**
 * Server-side redirect from /admin landing page to the primary Super Admin module:
 * New Registration Requests (/admin/registrations).
 * Resolves the route/content mismatch identified in Phase 2 Final QA Audit.
 */
export default function Page() {
  redirect(ROUTES.adminRegistrations);
}
