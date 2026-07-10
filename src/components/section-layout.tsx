"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { SECTIONS, sectionLabel, type SectionKey } from "@/lib/sections";
import { UserMenu } from "@/components/user-menu";
import { AuthorByline } from "@/components/redactor-badge";
import { fetchRedactorIdSet } from "@/lib/redactor-badges";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  cover_position: string | null;
  published_at: string;
  author: string | null;
  author_id: string | null;
};

export function SectionLayout({ section, intro }: { section: SectionKey; intro?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [redactorIds, setRedactorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_path,cover_position,published_at,author,author_id")
        .eq("section", section)
        .eq("published", true)
        .order("published_at", { ascending: false });
      const rows = (data as Post[] | null) ?? [];
      setPosts(rows);
      const ids = rows.map((p) => p.author_id).filter(Boolean) as string[];
      setRedactorIds(await fetchRedactorIdSet(ids));
    })();
  }, [section]);

  const label = sectionLabel(section);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />
      <header className="border-b border-foreground">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 items-center px-6 py-5">
          <Link
            href="/"
            className="justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
          >
            ← Archivo
          </Link>
          <Link
            href="/"
            className="justify-self-center font-display text-2xl font-semibold tracking-tight md:text-3xl"
          >
            Rheckypolitan
          </Link>
          <div className="justify-self-end">
            <UserMenu />
          </div>
        </div>
        <nav className="border-t border-foreground/10">
          <ul className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-6 px-6 py-3 md:gap-10">
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <Link
                  href={s.path}
                  className={`font-mono text-[10px] uppercase tracking-widest hover:text-[#B22234] ${
                    s.key === section ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-16 md:py-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Sección
        </span>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,7vw,5.5rem)] font-normal leading-[0.9] tracking-tight">
          {label}.
        </h1>
        {intro && (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
            {intro}
          </p>
        )}

        <div className="mt-16">
          {posts === null ? (
            <p className="font-mono text-xs text-muted-foreground">Cargando…</p>
          ) : posts.length === 0 ? (
            <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
              <p className="font-display text-xl">Aún no hay publicaciones.</p>
              <p className="mt-2 text-sm text-muted-foreground">Pronto habrá novedades.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li key={p.id} className="group">
                  <Link href={`/noticia/${section}/${p.slug}`} className="block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {p.cover_path ? (
                        <Image
                          src={publicUrl(p.cover_path)}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          style={{ objectPosition: p.cover_position ?? "50% 50%" }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Rheckypolitan
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {new Date(p.published_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                        <AuthorByline
                          author={p.author}
                          isRedactor={Boolean(p.author_id && redactorIds.has(p.author_id))}
                        />
                      </p>
                      <h2 className="mt-2 font-display text-2xl leading-tight group-hover:text-[#B22234]">
                        {p.title}
                      </h2>
                      {p.excerpt && (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                          {p.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="border-t border-foreground">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-3 px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>★</span>
          <span>© {new Date().getFullYear()} Rheckypolitan</span>
          <span>★</span>
        </div>
      </footer>
    </div>
  );
}
