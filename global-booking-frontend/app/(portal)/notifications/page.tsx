import { pageMetadata } from "@/lib/utils/metadata";
import { NotificationsView } from "@/components/portal/notifications/notifications-view";

export const metadata = pageMetadata(
  "Notifications & Practice Alerts",
  "Real-time patient queue events, online appointments, chamber alerts, and practice communication."
);

export default function NotificationsPage() {
  return <NotificationsView />;
}
