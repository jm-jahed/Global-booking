import { pageMetadata } from "@/lib/utils/metadata";
import { PatientsView } from "@/components/portal/patients/patients-view";

export const metadata = pageMetadata(
  "Patients Directory",
  "Comprehensive patient health records, appointment history, medical alerts, and primary care physicians."
);

export default function PatientsPage() {
  return <PatientsView />;
}
