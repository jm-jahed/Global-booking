import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import type { IndustryDefinition } from "@/types/industry";

const COPY = {
  profile: {
    eyebrow: "Business discovery route",
    title: "Business profile foundation",
    description: "This route is ready for an approved directory API. It does not claim that the URL identifies a live business.",
  },
  book: {
    eyebrow: "Business booking route",
    title: "Booking flow foundation",
    description: "No availability or booking transaction is connected. A future backend must validate the business, service, and requested time.",
  },
  services: {
    eyebrow: "Business services route",
    title: "Service catalogue foundation",
    description: "No service records are loaded. Future results must come from an approved, tenant-scoped backend endpoint.",
  },
} as const;

export function BusinessRoutePage({
  industry,
  variant,
}: {
  readonly industry: IndustryDefinition;
  readonly variant: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  return (
    <main>
      <section className="page-hero section-shell">
        <PageContainer>
          <p className="eyebrow">{copy.eyebrow} · {industry.name}</p>
          <h1>{copy.title}</h1>
          <p className="page-lead">{copy.description}</p>
          <div className="button-row">
            <Link className="button button-primary" href={`/${industry.slug}`}>Return to {industry.shortName}</Link>
            <Link className="button button-secondary" href={`/${industry.slug}/example-business/services`}>View route structure</Link>
          </div>
        </PageContainer>
      </section>
      <section className="content-section"><PageContainer><div className="notice-card"><span>Safe introductory state</span><p>No records, credentials, personal details, or booking data are created by this page.</p></div></PageContainer></section>
    </main>
  );
}
