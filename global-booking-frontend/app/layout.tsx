import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SITE } from "@/config/site";

const appOrigin =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "https://booking.webstudioae.com" : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
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
