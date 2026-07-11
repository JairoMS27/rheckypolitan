import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://rheckypolitan.es";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: issues } = await supabaseAdmin
    .from("issues")
    .select("number,published_at")
    .order("number", { ascending: false });

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/terminos`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const issueEntries: MetadataRoute.Sitemap = (issues ?? []).flatMap((i) => {
    const lastModified = i.published_at ? new Date(i.published_at) : undefined;
    return [
      {
        url: `${BASE_URL}/revista/${i.number}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/revista/${i.number}/leer`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
    ];
  });

  return [...staticEntries, ...issueEntries];
}
