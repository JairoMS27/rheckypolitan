import { headers } from "next/headers";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { shouldShowMaintenanceScreen } from "@/lib/maintenance";
import { getMaintenanceMode } from "@/lib/maintenance-server";

export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/";
  const maintenanceMode = await getMaintenanceMode();

  if (shouldShowMaintenanceScreen(pathname, maintenanceMode)) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}