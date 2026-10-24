"use client";

import { useEffect, useState } from "react";
import { DashboardView } from "@/components/portal/dashboard-view";
import { LiveQueueView } from "@/components/portal/queue/live-queue-view";

export default function Page() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (isMobile) {
    return <LiveQueueView />;
  }

  return <DashboardView />;
}
