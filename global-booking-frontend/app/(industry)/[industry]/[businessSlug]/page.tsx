import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BusinessRoutePage } from "@/components/industries/business-route-page";
import { DoctorPublicPortfolio } from "@/components/public/doctor-public-portfolio";
import { DoctorPublicBookingNotice } from "@/components/public/doctor-public-booking-notice";
import { getIndustry } from "@/config/industries";
import { isSafeSlug } from "@/lib/validation/route-params";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ industry: string; businessSlug: string }>;
}): Promise<Metadata> {
  const { industry: industrySlug, businessSlug } = await params;
  const normalizedSlug = (businessSlug || "").trim().toLowerCase();
  const normalizedIndustry = (industrySlug || "").trim().toLowerCase();

  // Route: /[slug]/book -> e.g. /dr-jahedul-islam/book
  if (normalizedSlug === "book" && isSafeSlug(normalizedIndustry)) {
    const formattedName = normalizedIndustry
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      title: `Book Appointment with ${formattedName} | GLOBAL BOOKING`,
      description: `Schedule a consultation with ${formattedName} on GLOBAL BOOKING.`,
    };
  }

  // Legacy route: /doctors/[slug]
  if (industrySlug === "doctors" && isSafeSlug(normalizedSlug)) {
    const formattedName = normalizedSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      title: `${formattedName} — Doctor Profile & Portfolio | GLOBAL BOOKING`,
      description: `View ${formattedName}'s official doctor profile, specialties, qualifications, and chamber visiting schedule on GLOBAL BOOKING.`,
      openGraph: {
        title: `${formattedName} — Doctor Portfolio`,
        description: `Verified doctor portfolio and consultation visiting schedule on GLOBAL BOOKING.`,
        type: "profile",
      },
    };
  }

  const industry = getIndustry(industrySlug);
  return {
    title: industry ? `${industry.name} — Directory | GLOBAL BOOKING` : "GLOBAL BOOKING",
  };
}

export default async function Page({
  params,
}: {
  readonly params: Promise<{ industry: string; businessSlug: string }>;
}) {
  const { industry: industrySlug, businessSlug } = await params;
  const normalizedSlug = (businessSlug || "").trim().toLowerCase();
  const normalizedIndustry = (industrySlug || "").trim().toLowerCase();

  // 1. Root-level doctor booking route: /[doctorSlug]/book (e.g. /dr-jahedul-islam/book)
  if (normalizedSlug === "book" && isSafeSlug(normalizedIndustry)) {
    return <DoctorPublicBookingNotice slug={normalizedIndustry} />;
  }

  // 2. Legacy /doctors/[slug] URL -> automatically canonicalize to root personal URL /[slug] (e.g. /dr-jahedul-islam)
  if (industrySlug === "doctors" && isSafeSlug(normalizedSlug)) {
    redirect(`/${normalizedSlug}`);
  }

  const industry = getIndustry(industrySlug);
  if (!industry || !isSafeSlug(normalizedSlug)) notFound();

  return <BusinessRoutePage industry={industry} variant="profile" />;
}

