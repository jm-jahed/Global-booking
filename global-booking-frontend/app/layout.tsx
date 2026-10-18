import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3002"),
  title: {
    default: `${SITE.name} — Booking, thoughtfully connected`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
