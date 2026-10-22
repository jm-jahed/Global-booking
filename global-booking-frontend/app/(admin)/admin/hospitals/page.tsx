import { pageMetadata } from "@/lib/utils/metadata";
import { PAGE_CONTENT } from "@/config/page-content";
import { HospitalsManager } from "@/components/admin/hospitals-manager";

const content = PAGE_CONTENT.adminHospitals;
export const metadata = pageMetadata("Hospitals & Clinics", content.description);

export default function Page() {
  return <HospitalsManager />;
}
