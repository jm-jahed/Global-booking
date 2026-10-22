import { pageMetadata } from "@/lib/utils/metadata";
import { PAGE_CONTENT } from "@/config/page-content";
import { RegistrationsManager } from "@/components/admin/registrations-manager";

const content = PAGE_CONTENT.adminRegistrations;
export const metadata = pageMetadata("New Registration Requests", content.description);

export default function Page() {
  return <RegistrationsManager />;
}
