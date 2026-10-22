"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const MARKETING_ROUTES = [
  "/about",
  "/contact",
  "/features",
  "/how-it-works",
  "/industries",
  "/pricing",
  "/privacy",
  "/terms",
];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  // Marketing pages render the global platform SiteHeader and SiteFooter.
  // Portals, admin, auth, and doctor personal portfolios (/dr-*, /doctors/*, /) manage their own chrome.
  const isMarketing = MARKETING_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (!isMarketing) {
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
