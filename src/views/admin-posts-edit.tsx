"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { PostForm, type PostInput } from "@/components/post-form";
import { supabase } from "@/integrations/supabase/client";
import type { SectionKey } from "@/lib/sections";

function EditPost() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<PostInput | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (!row) {
        setMissing(true);
        return;
      }
      setData({
        id: row.id,
        section: row.section as SectionKey,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? "",
        cover_path: row.cover_path,
        cover_position: (row as any).cover_position ?? "50% 50%",
        content_html: row.content_html,
        author: row.author ?? "",
        published: row.published,
        published_at: (row.published_at ?? "").slice(0, 10),
      });
    })();
  }, [id]);

  if (missing) return <p className="font-mono text-xs">No encontrada.</p>;
  if (!data) return <p className="font-mono text-xs text-muted-foreground">Cargando…</p>;

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Editar
      </p>
      <h2 className="mt-1 mb-10 font-display text-4xl">{data.title || "Noticia"}</h2>
      <PostForm initial={data} />
    </div>
  );
}

export function AdminPostsEditPage() {
  return (
    <AdminShell>
      <EditPost />
    </AdminShell>
  );
}
