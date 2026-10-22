import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { PAGE_CONTENT } from "@/config/page-content";
import { pageMetadata } from "@/lib/utils/metadata";

const content = PAGE_CONTENT.adminUsers;
export const metadata = pageMetadata("Admin Users & Permissions", content.description);

export default function AdminUsersPage() {
  return <AdminUsersManager />;
}
