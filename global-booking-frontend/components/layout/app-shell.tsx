"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const PORTAL_ROUTES = [
  "/dashboard",
  "/appointments",
  "/live-queue",
  "/customers",
  "/services",
  "/staff",
  "/patients",
  "/clients",
  "/availability",
  "/locations",
  "/notifications",
  "/settings",
];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  // If inside portal routes, let the portal layout handle the navigation and frame
  const isPortal = PORTAL_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
