import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SITE } from "@/config/site";
import { I18nProvider } from "@/lib/i18n/i18n-context";

import { cookies } from "next/headers";
import { isValidLocale, DEFAULT_LOCALE, isRtlLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/types";

const appOrigin =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "https://booking.webstudioae.com" : "http://localhost:3000");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0f19",
};

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: {
    default: `${SITE.name} — Booking, thoughtfully connected`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
};

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const initialLocale: Locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dir = isRtlLocale(initialLocale) ? "rtl" : "ltr";

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
