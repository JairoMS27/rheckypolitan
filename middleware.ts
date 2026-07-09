import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware";

function withPathnameHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (request.cookies.get("maintenance_mode")?.value === "1") {
    requestHeaders.set("x-maintenance-mode", "1");
  }
  return requestHeaders;
}

export async function middleware(request: NextRequest) {
  const requestHeaders = withPathnameHeader(request);

  if (request.nextUrl.pathname === "/unsubscribe" && request.method === "POST") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/unsubscribe";
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  const response = await updateSession(request, requestHeaders);
  return response;
}

export const config = {
  matcher: [
    "/unsubscribe",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};