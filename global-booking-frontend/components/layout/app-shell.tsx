"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const STANDALONE_ROUTES = [
  "/",
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
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/admin",
];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  // If inside portal or auth routes, let the specific page handle the layout
  const isStandalone = STANDALONE_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isStandalone) {
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
