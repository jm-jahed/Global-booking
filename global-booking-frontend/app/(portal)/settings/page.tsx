import { PortalSettingsView } from "@/components/portal/portfolio/portal-settings-view";
import { pageMetadata } from "@/lib/utils/metadata";

export const metadata = pageMetadata(
  "My Profile & Portfolio",
  "Manage your personal doctor portfolio, medical qualifications, visiting chambers, consultation fees, and public profile."
);

export default function Page() {
  return <PortalSettingsView />;
}

