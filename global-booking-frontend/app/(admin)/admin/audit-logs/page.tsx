import { pageMetadata } from "@/lib/utils/metadata";
import { PAGE_CONTENT } from "@/config/page-content";
import { AuditLogsManager } from "@/components/admin/audit-logs-manager";

const content = PAGE_CONTENT.adminAuditLogs;
export const metadata = pageMetadata("Security & Audit Logs", content.description);

export default function Page() {
  return <AuditLogsManager />;
}
