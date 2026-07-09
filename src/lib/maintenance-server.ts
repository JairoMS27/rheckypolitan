import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readMaintenanceMode, writeMaintenanceMode } from "./maintenance-store";

export async function getMaintenanceMode(): Promise<boolean> {
  return readMaintenanceMode(
    supabaseAdmin as unknown as Parameters<typeof readMaintenanceMode>[0],
  );
}

export async function setMaintenanceMode(enabled: boolean): Promise<boolean> {
  return writeMaintenanceMode(
    supabaseAdmin as unknown as Parameters<typeof writeMaintenanceMode>[0],
    enabled,
  );
}