import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest } from "@/lib/maintenance-admin";
import { applyMaintenanceCookie } from "@/lib/maintenance-cookie";
import { getMaintenanceMode, setMaintenanceMode } from "@/lib/maintenance-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const enabled = await getMaintenanceMode();
  const response = NextResponse.json({ maintenance_mode: enabled });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  applyMaintenanceCookie(response, enabled);
  return response;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled debe ser boolean" }, { status: 400 });
  }

  const maintenance_mode = await setMaintenanceMode(body.enabled);
  const response = NextResponse.json({ maintenance_mode });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  applyMaintenanceCookie(response, maintenance_mode);
  return response;
}