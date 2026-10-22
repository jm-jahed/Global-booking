import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DoctorPublicPortfolio } from "@/components/public/doctor-public-portfolio";
import { getIndustry } from "@/config/industries";
import { isSafeSlug } from "@/lib/validation/route-params";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry: industrySlug } = await params;
  const normalizedSlug = (industrySlug || "").trim().toLowerCase();

  if (getIndustry(normalizedSlug)) {
    return {
      title: "GLOBAL BOOKING — Healthcare & Clinical Portals",
    };
  }

  if (isSafeSlug(normalizedSlug)) {
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

  return {
    title: "GLOBAL BOOKING",
  };
}

export default async function Page({
  params,
}: {
  readonly params: Promise<{ industry: string }>;
}) {
  const { industry: industrySlug } = await params;
  const normalizedSlug = (industrySlug || "").trim().toLowerCase();

  // If this matches a registered business industry slug (e.g. /doctors, /hospitals), redirect to root
  if (getIndustry(normalizedSlug)) {
    redirect("/");
  }

  // Personal Doctor Public Portfolio at root URL: http://localhost:3000/[slug] (e.g. /dr-jahedul-islam)
  if (isSafeSlug(normalizedSlug)) {
    return <DoctorPublicPortfolio slug={normalizedSlug} />;
  }

  redirect("/");
}


