import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import type { PageContent } from "@/types/common";

export function FoundationPage({
  eyebrow,
  title,
  description,
  notice,
  primaryAction,
  secondaryAction,
  points,
}: PageContent) {
  return (
    <main>
      <section className="page-hero section-shell">
        <PageContainer>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-lead">{description}</p>
          {(primaryAction || secondaryAction) && (
            <div className="button-row">
              {primaryAction && <Link className="button button-primary" href={primaryAction.href}>{primaryAction.label}</Link>}
              {secondaryAction && <Link className="button button-secondary" href={secondaryAction.href}>{secondaryAction.label}</Link>}
            </div>
          )}
        </PageContainer>
      </section>
      {(notice || points) && (
        <section className="content-section">
          <PageContainer>
            {notice && <div className="notice-card"><span>Foundation note</span><p>{notice}</p></div>}
            {points && (
              <div className="content-grid">
                {points.map((point) => (
                  <article className="content-card" key={point.title}>
                    <h2>{point.title}</h2>
                    <p>{point.description}</p>
                  </article>
                ))}
              </div>
            )}
          </PageContainer>
        </section>
      )}
    </main>
  );
}
