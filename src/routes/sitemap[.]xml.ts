import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://rheckypolitan.es";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: issues } = await supabaseAdmin
          .from("issues")
          .select("number,published_at")
          .order("number", { ascending: false });

        const staticEntries: { path: string; lastmod?: string; changefreq?: string; priority?: string }[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
        ];

        const issueEntries = (issues ?? []).flatMap((i) => {
          const lastmod = i.published_at
            ? new Date(i.published_at).toISOString().slice(0, 10)
            : undefined;
          return [
            { path: `/revista/${i.number}`, lastmod, changefreq: "monthly", priority: "0.8" },
            { path: `/revista/${i.number}/leer`, lastmod, changefreq: "monthly", priority: "0.6" },
          ];
        });

        const all = [...staticEntries, ...issueEntries];

        const urls = all.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
