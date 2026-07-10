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
  // Trust the server render first so a stale cookie/fetch can't flash the wall on reload.
  const [maintenanceMode, setMaintenanceMode] = useState(initialMaintenanceMode);

  useEffect(() => {
    setMaintenanceMode(initialMaintenanceMode);
  }, [initialMaintenanceMode]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/maintenance/status", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { maintenance_mode?: boolean };
      })
      .then((data) => {
        if (cancelled || data == null) return;
        setMaintenanceMode(Boolean(data.maintenance_mode));
      })
      .catch(() => {
        // Keep SSR value on network errors — never invent "on".
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (shouldShowMaintenanceScreen(pathname, maintenanceMode)) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
