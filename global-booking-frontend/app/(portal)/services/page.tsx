import { pageMetadata } from "@/lib/utils/metadata";
import { ServicesView } from "@/components/portal/services/services-view";

export const metadata = pageMetadata(
  "Clinical Services Catalog",
  "Browse, manage, and book hospital clinical specialties, tariffs, and specialist allocation."
);

export default function ServicesPage() {
  return <ServicesView />;
}
