import { pageMetadata } from "@/lib/utils/metadata";
import { PAGE_CONTENT } from "@/config/page-content";
import { DoctorsManager } from "@/components/admin/doctors-manager";

const content = PAGE_CONTENT.adminDoctors;
export const metadata = pageMetadata("Doctors & Specialists", content.description);

export default function Page() {
  return <DoctorsManager />;
}
