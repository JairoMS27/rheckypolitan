import { NextResponse } from "next/server";
import { getMaintenanceMode } from "@/lib/maintenance-server";

export const dynamic = "force-dynamic";

const MAINTENANCE_COOKIE = "maintenance_mode";

export async function GET() {
  const maintenance_mode = await getMaintenanceMode();
  const response = NextResponse.json({ maintenance_mode });

  if (maintenance_mode) {
    response.cookies.set(MAINTENANCE_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    response.cookies.set(MAINTENANCE_COOKIE, "", { path: "/", maxAge: 0 });
  }

  return response;
}