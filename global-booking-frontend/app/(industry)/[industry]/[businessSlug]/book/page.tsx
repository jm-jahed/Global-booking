import { notFound, redirect } from "next/navigation";

import { BusinessRoutePage } from "@/components/industries/business-route-page";
import { DoctorPublicBookingNotice } from "@/components/public/doctor-public-booking-notice";
import { getIndustry } from "@/config/industries";
import { isSafeSlug } from "@/lib/validation/route-params";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ industry: string; businessSlug: string }>;
}) {
  const { industry: industrySlug, businessSlug } = await params;
  const normalizedSlug = (businessSlug || "").trim().toLowerCase();

  // Legacy /doctors/[slug]/book -> canonicalize to /[slug]/book
  if (industrySlug === "doctors" && isSafeSlug(normalizedSlug)) {
    redirect(`/${normalizedSlug}/book`);
  }

  const industry = getIndustry(industrySlug);
  if (!industry || !isSafeSlug(normalizedSlug)) notFound();

  return <BusinessRoutePage industry={industry} variant="book" />;
}


