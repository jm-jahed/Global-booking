import { LiveQueueView } from "@/components/portal/queue/live-queue-view";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata(
  "Live Queue",
  "Real-time patient check-in triage, station dispatching, and waiting room monitor."
);

export default function Page() {
  return <LiveQueueView />;
}
