import type { ReactNode } from "react";
import { PortalLayoutClient } from "@/components/portal/portal-layout-client";
import "@/app/portal.css";

export default function PortalLayout({ children }: { readonly children: ReactNode }) {
  return <PortalLayoutClient>{children}</PortalLayoutClient>;
}
