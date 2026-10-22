import { AdminSettingsManager } from "@/components/admin/admin-settings-manager";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";

const content = PAGE_CONTENT.adminSettings;
export const metadata = pageMetadata("Platform Settings & Governance", content.description);

export default function AdminSettingsPage() {
  return <AdminSettingsManager />;
}
