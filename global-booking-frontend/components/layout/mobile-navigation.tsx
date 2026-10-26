"use client";

import Link from "next/link";
import { PRIMARY_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "@/lib/i18n/i18n-context";

export function MobileNavigation() {
  const { t } = useTranslation("nav");
  const { t: tCommon } = useTranslation("common");

  return (
    <details className="mobile-navigation">
      <summary aria-label={tCommon("menu", undefined, "Open navigation")}>
        <span />
        <span />
      </summary>
      <nav aria-label={t("title", undefined, "Mobile navigation")}>
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
        <Link href={ROUTES.login}>{t("login", undefined, "Sign In")}</Link>
        <Link className="button button-primary" href={ROUTES.book}>
          {tCommon("bookNow", undefined, "Book now")}
        </Link>
      </nav>
    </details>
  );
}
