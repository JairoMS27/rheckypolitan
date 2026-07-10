import type { NextResponse } from "next/server";

export const MAINTENANCE_COOKIE = "maintenance_mode";

/** Apply or clear the maintenance cookie consistently across status/admin APIs. */
export function applyMaintenanceCookie(response: NextResponse, enabled: boolean): void {
  if (enabled) {
    response.cookies.set(MAINTENANCE_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      // Readable by middleware only; not an auth secret.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });
    return;
  }

  // Explicit delete so reload after toggle OFF does not keep a stale "1".
  response.cookies.set(MAINTENANCE_COOKIE, "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
