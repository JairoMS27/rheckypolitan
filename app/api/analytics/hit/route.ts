import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const runtime = "nodejs";

const MAX_PATH = 500;
const MAX_REF = 800;
const MAX_VID = 80;

type Body = {
  visitorId?: unknown;
  path?: unknown;
  referrer?: unknown;
  consentAnalytics?: unknown;
};

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

/**
 * Public endpoint: record one page view when the client asserts analytics consent.
 * Server still validates payload shape; inserts with service role (no public RLS insert).
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.consentAnalytics !== true) {
    return NextResponse.json({ error: "Sin consentimiento de analítica" }, { status: 403 });
  }

  const visitorId = cleanText(body.visitorId, MAX_VID);
  let path = cleanText(body.path, MAX_PATH);
  if (!visitorId || !path) {
    return NextResponse.json({ error: "visitorId y path son obligatorios" }, { status: 400 });
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Block obvious junk
  if (path.includes("://") || path.includes("\n")) {
    return NextResponse.json({ error: "path inválido" }, { status: 400 });
  }

  const referrer = cleanText(body.referrer, MAX_REF);
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 400) || null;

  const { error } = await supabaseAdmin.from("analytics_page_views").insert({
    visitor_id: visitorId,
    path,
    referrer,
    user_agent: userAgent,
  });

  if (error) {
    // Table may not exist yet on a given env — don't break the public site
    console.error("[analytics/hit]", error.message);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
