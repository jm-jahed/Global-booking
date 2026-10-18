import { ROUTES } from "./routes";

export const PRIMARY_NAVIGATION = [
  { label: "Industries", href: ROUTES.industries },
  { label: "Features", href: ROUTES.features },
  { label: "How it works", href: ROUTES.howItWorks },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "About", href: ROUTES.about },
] as const;

export const FOOTER_NAVIGATION = [
  {
    title: "Explore",
    links: [
      { label: "Industries", href: ROUTES.industries },
      { label: "How it works", href: ROUTES.howItWorks },
      { label: "Book", href: ROUTES.book },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: ROUTES.about },
      { label: "Contact", href: ROUTES.contact },
      { label: "Privacy", href: ROUTES.privacy },
      { label: "Terms", href: ROUTES.terms },
    ],
  },
] as const;
