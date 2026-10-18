import { notFound } from "next/navigation";

import { BusinessRoutePage } from "@/components/industries/business-route-page";
import { getIndustry } from "@/config/industries";
import { isSafeSlug } from "@/lib/validation/route-params";

export default async function Page({ params }: { readonly params: Promise<{ industry: string; businessSlug: string }> }) {
  const { industry: industrySlug, businessSlug } = await params;
  const industry = getIndustry(industrySlug);
  if (!industry || !isSafeSlug(businessSlug)) notFound();
  return <BusinessRoutePage industry={industry} variant="services" />;
}
