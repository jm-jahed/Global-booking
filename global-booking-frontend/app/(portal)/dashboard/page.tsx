import { DashboardView } from "@/components/portal/dashboard-view";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata(
  "Dashboard",
  "Real-time operational dashboard, live queue, appointment metrics, and booking insights for Global Booking."
);

export default function Page() {
  return <DashboardView />;
}
