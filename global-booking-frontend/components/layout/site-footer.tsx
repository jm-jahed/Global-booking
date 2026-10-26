"use client";

import Link from "next/link";
import { PageContainer } from "./page-container";
import { FOOTER_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { SITE } from "@/config/site";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { LanguageSelector } from "@/components/shared/language-selector";

export function SiteFooter() {
  const { t: tNav } = useTranslation("nav");
  const { t: tCommon } = useTranslation("common");

  return (
    <footer className="site-footer">
      <PageContainer className="footer-grid">
        <div className="footer-brand">
          <Link className="brand brand-light" href={ROUTES.home}>
            <span className="brand-mark" aria-hidden="true">{SITE.shortName}</span>
            <span>{tCommon("appName", undefined, SITE.name)}</span>
          </Link>
          <p>{tCommon("appTagline", undefined, SITE.description)}</p>
          <div style={{ marginTop: 14 }}>
            <LanguageSelector variant="header" />
          </div>
        </div>
        {FOOTER_NAVIGATION.map((section) => (
          <div className="footer-column" key={section.title}>
            <h2>{section.title === "Explore" ? tNav("explore", undefined, section.title) : tNav("company", undefined, section.title)}</h2>
            {section.links.map((link) => {
              const href = link.href as string;
              const defaultLabel = link.label as string;
              const label =
                href === ROUTES.industries
                  ? tNav("features", undefined, defaultLabel)
                  : href === ROUTES.howItWorks
                  ? tNav("howItWorks", undefined, defaultLabel)
                  : href === ROUTES.book
                  ? tNav("book", undefined, defaultLabel)
                  : href === ROUTES.about
                  ? tNav("about", undefined, defaultLabel)
                  : href === ROUTES.contact
                  ? tNav("contact", undefined, defaultLabel)
                  : href === ROUTES.privacy
                  ? tNav("privacy", undefined, defaultLabel)
                  : href === ROUTES.terms
                  ? tNav("terms", undefined, defaultLabel)
                  : defaultLabel;

              return (
                <Link href={link.href} key={link.href}>{label}</Link>
              );
            })}
          </div>
        ))}
        <div className="footer-column">
          <h2>{tCommon("foundationStatus", undefined, "Foundation status")}</h2>
          <p>{tCommon("foundationStatusDesc", undefined, "Frontend routes are ready. Real-time patient booking and live queue active.")}</p>
        </div>
      </PageContainer>
      <PageContainer className="footer-bottom">
        <span>© {new Date().getFullYear()} {tCommon("appName", undefined, SITE.name)}</span>
        <span>{tCommon("platformFoundationSubtitle", undefined, "Smart Healthcare & Live Queue Platform")}</span>
      </PageContainer>
    </footer>
  );
}
