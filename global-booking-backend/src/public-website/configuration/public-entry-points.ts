export const PUBLIC_ENTRY_POINTS = {
  home: "/",
  solutions: "/solutions",
  industryLandingPage: "/solutions/:industryCategoryId",
  businessBooking: "/book/:tenantId",
  qrBooking: "/book/qr/:bookingReference",
} as const;

export const PUBLIC_WEBSITE_IMPLEMENTATION_STATUS = "specification-only" as const;
