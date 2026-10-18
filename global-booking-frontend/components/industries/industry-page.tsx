import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ROUTES } from "@/config/routes";
import type { IndustryDefinition } from "@/types/industry";

export function IndustryPage({ industry }: { readonly industry: IndustryDefinition }) {
  const recipientLanguage = industry.secondaryRole
    ? `${industry.recipientTerm} and ${industry.secondaryRole}`
    : industry.recipientTerm;

  return (
    <main>
      <section className="page-hero section-shell">
        <PageContainer>
          <p className="eyebrow">Industry journey · {recipientLanguage}</p>
          <h1>{industry.name}</h1>
          <p className="page-lead">{industry.description}</p>
          <div className="button-row">
            <Link className="button button-primary" href={`/${industry.slug}/example-business`}>Preview business route</Link>
            <Link className="button button-secondary" href={ROUTES.industries}>All industries</Link>
          </div>
        </PageContainer>
      </section>
      <section className="content-section">
        <PageContainer>
          <div className="notice-card"><span>Controlled terminology</span><p>Visible recipient language for this category is {recipientLanguage}. No live business, availability, or record data is connected.</p></div>
          <div className="content-grid">
            {industry.serviceExamples.map((service) => (
              <article className="content-card" key={service}><h2>{service}</h2><p>This is a journey capability label, not a live service listing.</p></article>
            ))}
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
