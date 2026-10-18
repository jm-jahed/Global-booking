import type { ReactNode } from "react";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalTopBar } from "@/components/portal/portal-topbar";
import "@/app/portal.css";

export default function PortalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="portal-layout-container">
      <PortalSidebar />
      <div className="portal-main-wrapper">
        <PortalTopBar />
        <main className="portal-main-content">{children}</main>
      </div>
    </div>
  );
}
