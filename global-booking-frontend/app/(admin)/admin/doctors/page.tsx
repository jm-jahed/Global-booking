import { FoundationPage } from "@/components/shared/foundation-page";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";

const content = PAGE_CONTENT.adminDoctors;
export const metadata = pageMetadata("Doctors & Specialists", content.description);

export default function Page() {
  return <FoundationPage {...content} />;
}
