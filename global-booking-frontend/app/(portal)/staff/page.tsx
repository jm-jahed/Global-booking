import { pageMetadata } from "@/lib/utils/metadata";
import { StaffPageGuard } from "./staff-page-guard";

export const metadata = pageMetadata(
  "Staff Management",
  "Authorize receptionists, nurses, and chamber supervisors to manage patient queues and front-desk bookings."
);

export default function StaffPage() {
  return <StaffPageGuard />;
}
