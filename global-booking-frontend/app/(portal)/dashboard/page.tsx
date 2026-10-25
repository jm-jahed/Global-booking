import { DashboardView } from "@/components/portal/dashboard-view";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata(
  "Clinical Dashboard",
  "Real-time patient triage, appointment oversight, and chamber queue management."
);

export default function Page() {
  return <DashboardView />;
}

