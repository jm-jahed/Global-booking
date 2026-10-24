import { pageMetadata } from "@/lib/utils/metadata";
import { ReportsView } from "@/components/portal/reports/reports-view";

export const metadata = pageMetadata(
  "Clinical Reports & Analytics",
  "Doctor performance metrics, OPD consultation throughput, patient attendance rates, and revenue analytics."
);

export default function ReportsPage() {
  return <ReportsView />;
}
