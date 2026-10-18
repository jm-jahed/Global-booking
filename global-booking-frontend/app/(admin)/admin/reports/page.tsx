import { FoundationPage } from "@/components/shared/foundation-page";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";
const content = PAGE_CONTENT.adminReports;
export const metadata = pageMetadata("Admin reports", content.description);
export default function Page() { return <FoundationPage {...content} />; }
