import Link from "next/link";

import { PageContainer } from "./page-container";
import { FOOTER_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { SITE } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <PageContainer className="footer-grid">
        <div className="footer-brand">
          <Link className="brand brand-light" href={ROUTES.home}>
            <span className="brand-mark" aria-hidden="true">{SITE.shortName}</span>
            <span>{SITE.name}</span>
          </Link>
          <p>{SITE.description}</p>
        </div>
        {FOOTER_NAVIGATION.map((section) => (
          <div className="footer-column" key={section.title}>
            <h2>{section.title}</h2>
            {section.links.map((link) => (
              <Link href={link.href} key={link.href}>{link.label}</Link>
            ))}
          </div>
        ))}
        <div className="footer-column">
          <h2>Foundation status</h2>
          <p>Frontend routes are ready. Business workflows and account access remain intentionally unconnected.</p>
        </div>
      </PageContainer>
      <PageContainer className="footer-bottom">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span>Independent Next.js frontend foundation</span>
      </PageContainer>
    </footer>
  );
}
