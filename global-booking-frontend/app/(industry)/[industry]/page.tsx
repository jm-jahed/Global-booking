import { notFound } from "next/navigation";

import { IndustryPage } from "@/components/industries/industry-page";
import { getIndustry, INDUSTRIES } from "@/config/industries";
import { pageMetadata } from "@/lib/utils/metadata";

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  return industry ? pageMetadata(industry.name, industry.description) : pageMetadata("Industry not found", "This industry route is not configured.");
}

export default async function Page({ params }: { readonly params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();
  return <IndustryPage industry={industry} />;
}
