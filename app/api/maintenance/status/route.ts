import { NextResponse } from "next/server";
import { applyMaintenanceCookie } from "@/lib/maintenance-cookie";
import { getMaintenanceMode } from "@/lib/maintenance-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const maintenance_mode = await getMaintenanceMode();
  const response = NextResponse.json({ maintenance_mode });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  applyMaintenanceCookie(response, maintenance_mode);
  return response;
}
