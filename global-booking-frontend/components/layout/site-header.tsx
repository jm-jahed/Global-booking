"use client";

import Link from "next/link";
import { MobileNavigation } from "./mobile-navigation";
import { PageContainer } from "./page-container";
import { PRIMARY_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { SITE } from "@/config/site";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useTranslation } from "@/lib/i18n/i18n-context";

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { t: tCommon } = useTranslation("common");

  return (
    <header className="site-header">
      <PageContainer className="header-inner">
        <Link className="brand" href={ROUTES.home} aria-label={`${SITE.name} home`}>
          <span className="brand-mark" aria-hidden="true">{SITE.shortName}</span>
          <span>{SITE.name}</span>
        </Link>
        <nav className="desktop-navigation" aria-label="Primary navigation">
          {PRIMARY_NAVIGATION.map((item) => {
            const label =
              item.href === ROUTES.industries || item.href === ROUTES.features
                ? t("features", undefined, item.label)
                : item.href === ROUTES.howItWorks
                  ? t("howItWorks", undefined, item.label)
                  : item.href === ROUTES.pricing
                    ? t("pricing", undefined, item.label)
                    : t("about", undefined, item.label);

            return (
              <Link href={item.href} key={item.href}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <LanguageSelector variant="header" />
          <Link className="text-link" href={ROUTES.login}>
            {t("login", undefined, "Sign in")}
          </Link>
          <Link className="button button-primary button-small" href={ROUTES.book}>
            {tCommon("appName", undefined, "Book now")}
          </Link>
        </div>
        <MobileNavigation />
      </PageContainer>
    </header>
  );
}
