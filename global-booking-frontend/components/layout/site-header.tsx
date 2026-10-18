import Link from "next/link";

import { MobileNavigation } from "./mobile-navigation";
import { PageContainer } from "./page-container";
import { PRIMARY_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { SITE } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <PageContainer className="header-inner">
        <Link className="brand" href={ROUTES.home} aria-label={`${SITE.name} home`}>
          <span className="brand-mark" aria-hidden="true">{SITE.shortName}</span>
          <span>{SITE.name}</span>
        </Link>
        <nav className="desktop-navigation" aria-label="Primary navigation">
          {PRIMARY_NAVIGATION.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="text-link" href={ROUTES.login}>Sign in</Link>
          <Link className="button button-primary button-small" href={ROUTES.book}>Book now</Link>
        </div>
        <MobileNavigation />
      </PageContainer>
    </header>
  );
}
