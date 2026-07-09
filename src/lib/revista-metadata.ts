import type { Metadata } from "next";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type IssueMeta = {
  number: number;
  title: string;
  subtitle: string | null;
  published_at: string;
} | null;

export async function fetchIssueMeta(number: string): Promise<IssueMeta> {
  const { data } = await supabaseAdmin
    .from("issues")
    .select("number,title,subtitle,published_at")
    .eq("number", Number(number))
    .maybeSingle();
  return (data as IssueMeta) ?? null;
}

export function buildIssueMetadata(number: string, meta: IssueMeta): Metadata {
  const numFmt = String(number).padStart(2, "0");
  const url = `https://rheckypolitan.es/revista/${number}`;

  if (!meta) {
    return {
      title: `N.º ${numFmt}`,
      description: `Número ${numFmt} de Rheckypolitan, revista digital desde Kentucky.`,
      alternates: { canonical: url },
      openGraph: {
        title: `N.º ${numFmt} — Rheckypolitan`,
        description: `Número ${numFmt} de Rheckypolitan, revista digital desde Kentucky.`,
        url,
        type: "article",
      },
    };
  }

  const title = `${meta.title} — Rheckypolitan N.º ${numFmt}`;
  const trimmedTitle = title.length > 60 ? `${meta.title} — N.º ${numFmt}` : title;
  const baseDesc = (
    meta.subtitle ??
    `Número ${numFmt} de Rheckypolitan: ${meta.title}. Crónicas y ensayos desde Kentucky.`
  )
    .replace(/\s+/g, " ")
    .trim();
  const description = baseDesc.length > 160 ? `${baseDesc.slice(0, 157)}…` : baseDesc;

  return {
    title: trimmedTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: trimmedTitle,
      description,
      url,
      type: "article",
    },
  };
}
