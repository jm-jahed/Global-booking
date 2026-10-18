import { AppointmentsView } from "@/components/portal/appointments/appointments-view";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata(
  "Appointments",
  "Schedule, filter, and manage real-time appointments across your business."
);

export default function Page() {
  return <AppointmentsView />;
}
