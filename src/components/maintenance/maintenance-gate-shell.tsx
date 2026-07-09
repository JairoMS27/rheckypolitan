"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shouldShowMaintenanceScreen } from "@/lib/maintenance";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";

export function MaintenanceGateShell({
  initialMaintenanceMode,
  children,
}: {
  initialMaintenanceMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [maintenanceMode, setMaintenanceMode] = useState(initialMaintenanceMode);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/maintenance/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { maintenance_mode?: boolean }) => {
        if (!cancelled) {
          setMaintenanceMode(Boolean(data.maintenance_mode));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (shouldShowMaintenanceScreen(pathname, maintenanceMode)) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}