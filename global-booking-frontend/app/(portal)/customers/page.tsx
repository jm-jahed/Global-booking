import { FoundationPage } from "@/components/shared/foundation-page";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";
const content = PAGE_CONTENT.customers;
export const metadata = pageMetadata("Patients", content.description);
export default function Page() { return <FoundationPage {...content} />; }
