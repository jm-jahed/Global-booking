import { FoundationPage } from "@/components/shared/foundation-page";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";
const content = PAGE_CONTENT.admin;
export const metadata = pageMetadata("Administration", content.description);
export default function Page() { return <FoundationPage {...content} />; }
