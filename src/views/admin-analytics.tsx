"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-page-header";
import type { AnalyticsSummary } from "@/lib/analytics-types";
import { Button } from "@/components/ui/button";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortVid(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

function Inner() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/summary", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as AnalyticsSummary & {
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        const msg = [json.error, json.hint].filter(Boolean).join(" · ");
        setError(msg || "No se pudo cargar");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Error de red");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader
        kicker="Sitio · Analítica"
        title="Visitas"
        description="Hits guardados solo cuando el lector acepta cookies de analítica. Primera parte, sin Google."
        actions={
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Cargando…" : "Actualizar"}
          </Button>
        }
      />

      {error && (
        <div className="mb-6 border border-[#B22234]/30 bg-[#B22234]/5 px-4 py-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#B22234]">Error</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Si la tabla no existe, ejecuta en Supabase el SQL de{" "}
            <code className="font-mono text-[11px]">
              supabase/migrations/20260711120000_analytics_page_views.sql
            </code>
            .
          </p>
        </div>
      )}

      {loading && !data ? (
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cargando métricas…
        </p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Hits (muestra)", value: data.totalHits },
              { label: "Visitantes únicos", value: data.uniqueVisitors },
              { label: "Últimos 7 días", value: data.hitsLast7Days },
              { label: "Últimos 30 días", value: data.hitsLast30Days },
            ].map((c) => (
              <div key={c.label} className="border border-foreground/15 p-4">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-2 font-display text-3xl tabular-nums">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-xl">Rutas más vistas</h2>
              {data.topPaths.length === 0 ? (
                <AdminEmptyState
                  title="Aún no hay datos"
                  description="Cuando alguien acepte analítica y navegue, aparecerán aquí."
                />
              ) : (
                <ul className="mt-4 divide-y divide-foreground/10 border border-foreground/15">
                  {data.topPaths.map((row) => (
                    <li
                      key={row.path}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 font-mono text-xs"
                    >
                      <span className="truncate text-foreground/80">{row.path}</span>
                      <span className="shrink-0 tabular-nums text-[#B22234]">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-xl">Actividad reciente</h2>
              {data.recent.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Sin eventos todavía.</p>
              ) : (
                <div className="mt-4 max-h-[420px] overflow-auto border border-foreground/15">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b border-foreground/10 text-[9px] uppercase tracking-widest text-muted-foreground">
                        <th className="px-3 py-2 font-normal">Cuándo</th>
                        <th className="px-3 py-2 font-normal">Ruta</th>
                        <th className="px-3 py-2 font-normal">Visitante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((r) => (
                        <tr key={r.id} className="border-b border-foreground/5">
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {formatWhen(r.created_at)}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2" title={r.path}>
                            {r.path}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground" title={r.visitor_id}>
                            {shortVid(r.visitor_id)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Solo se guardan visitas de quien pulsó «Aceptar todo» o activó Analítica. Los que eligen
            «Solo esenciales» no generan filas. Muestra limitada a los últimos 5.000 eventos para el
            panel.
          </p>
        </>
      ) : null}
    </div>
  );
}

export function AdminAnalyticsPage() {
  return (
    <AdminShell>
      <Inner />
    </AdminShell>
  );
}
