import { FoundationPage } from "@/components/shared/foundation-page";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";
const content = PAGE_CONTENT.adminSettings;
export const metadata = pageMetadata("Admin settings", content.description);
export default function Page() { return <FoundationPage {...content} />; }
