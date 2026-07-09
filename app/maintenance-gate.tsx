import { getMaintenanceMode } from "@/lib/maintenance-server";
import { MaintenanceGateShell } from "@/components/maintenance/maintenance-gate-shell";

export const dynamic = "force-dynamic";

export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const maintenanceMode = await getMaintenanceMode();

  return (
    <MaintenanceGateShell initialMaintenanceMode={maintenanceMode}>
      {children}
    </MaintenanceGateShell>
  );
}