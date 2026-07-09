import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest } from "@/lib/maintenance-admin";
import { getMaintenanceMode, setMaintenanceMode } from "@/lib/maintenance-server";

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const enabled = await getMaintenanceMode();
  return NextResponse.json({ maintenance_mode: enabled });
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

  if (maintenance_mode) {
    response.cookies.set("maintenance_mode", "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    response.cookies.set("maintenance_mode", "", { path: "/", maxAge: 0 });
  }

  return response;
}