import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";
import "@/app/admin.css";

export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
