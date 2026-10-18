import { IndustryCard } from "@/components/industries/industry-card";
import { PageContainer } from "@/components/layout/page-container";
import { INDUSTRIES } from "@/config/industries";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata("Industries", "Explore the controlled industry journeys supported by the GLOBAL BOOKING foundation.");

export default function IndustriesPage() {
  return (
    <main>
      <section className="page-hero section-shell"><PageContainer><p className="eyebrow">Industry journeys</p><h1>Familiar booking patterns, language that fits.</h1><p className="page-lead">Explore each controlled category without inventing live businesses, availability, or service records.</p></PageContainer></section>
      <section className="content-section"><PageContainer><div className="industry-grid">{INDUSTRIES.map((industry) => <IndustryCard industry={industry} key={industry.slug} />)}</div></PageContainer></section>
    </main>
  );
}
