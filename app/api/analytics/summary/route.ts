import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/dashboard-paths";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AnalyticsSummary } from "@/lib/analytics-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type { AnalyticsSummary };

/**
 * Admin-only aggregate of consented page views.
 */
export async function GET() {
  const auth = await getAuthUser();
  if (!auth.userId || !isAdminRole(auth.roles)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from("analytics_page_views")
    .select("id,visitor_id,path,referrer,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Ejecuta la migración analytics_page_views en Supabase SQL Editor.",
      },
      { status: 500 },
    );
  }

  const list = rows ?? [];
  const unique = new Set(list.map((r) => r.visitor_id));
  const hitsLast7Days = list.filter((r) => r.created_at >= d7).length;
  const hitsLast30Days = list.filter((r) => r.created_at >= d30).length;

  const pathCounts = new Map<string, number>();
  for (const r of list) {
    pathCounts.set(r.path, (pathCounts.get(r.path) ?? 0) + 1);
  }
  const topPaths = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const summary: AnalyticsSummary = {
    totalHits: list.length,
    uniqueVisitors: unique.size,
    hitsLast7Days,
    hitsLast30Days,
    topPaths,
    recent: list.slice(0, 80),
  };

  return NextResponse.json(summary);
}
