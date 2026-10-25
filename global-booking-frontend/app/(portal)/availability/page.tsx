import { pageMetadata } from "@/lib/utils/metadata";
import { AvailabilityView } from "@/components/portal/availability/availability-view";

export const metadata = pageMetadata(
  "Availability & Schedule",
  "Manage doctor visiting chambers, consultation fees, weekly availability, and patient queue booking hours."
);

export default function AvailabilityPage() {
  return <AvailabilityView />;
}
