import Link from "next/link";

import type { IndustryDefinition } from "@/types/industry";

export function IndustryCard({ industry }: { readonly industry: IndustryDefinition }) {
  const role = industry.secondaryRole
    ? `${industry.recipientTerm} · ${industry.secondaryRole}`
    : industry.recipientTerm;

  return (
    <article className="industry-card">
      <div className="industry-icon" aria-hidden="true">{industry.shortName.slice(0, 1)}</div>
      <p className="industry-role">{role}</p>
      <h3>{industry.name}</h3>
      <p>{industry.description}</p>
      <Link href={`/${industry.slug}`} aria-label={`Explore ${industry.name}`}>
        Explore category <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
