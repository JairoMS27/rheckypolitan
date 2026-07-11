"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { sectionLabel, type SectionKey } from "@/lib/sections";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthorByline } from "@/components/redactor-badge";
import { fetchRedactorIdSet } from "@/lib/redactor-badges";
import { fetchProfileSnippets, type ProfileSnippet } from "@/lib/profiles";

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

function formatDay(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SectionLayout({ section, intro }: { section: SectionKey; intro?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [redactorIds, setRedactorIds] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Map<string, ProfileSnippet>>(new Map());

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
      const [redactors, profs] = await Promise.all([
        fetchRedactorIdSet(ids),
        fetchProfileSnippets(ids),
      ]);
      setRedactorIds(redactors);
      setProfiles(profs);
    })();
  }, [section]);

  const label = sectionLabel(section);
  const lead = posts?.[0] ?? null;
  const rest = posts?.slice(1) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader activePath={`/${section}`} compact />

      <main>
        {/* Section masthead band */}
        <section className="border-b border-foreground/15">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12">
            <div className="border-b border-foreground/15 px-5 py-10 md:px-8 md:py-14 lg:col-span-8 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Sección
              </p>
              <h1 className="mt-2 font-display text-[clamp(2.5rem,8vw,5rem)] font-normal leading-[0.92] tracking-tight">
                {label}.
              </h1>
              {intro && (
                <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/75 md:text-lg">
                  {intro}
                </p>
              )}
            </div>
            <aside className="flex flex-col justify-between bg-muted/30 px-5 py-8 md:px-8 lg:col-span-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  En este cuaderno
                </p>
                <p className="mt-3 font-display text-5xl tabular-nums leading-none text-foreground/15">
                  {posts ? String(posts.length).padStart(2, "0") : "—"}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {posts?.length === 1 ? "pieza" : "piezas"}
                </p>
              </div>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Impreso en la red · desde Kentucky
              </p>
            </aside>
          </div>
        </section>

        {/* Lead story */}
        {posts === null ? (
          <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cargando…
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-8">
            <div className="border border-dashed border-foreground/30 px-6 py-20 text-center">
              <p className="font-display text-2xl">Aún no hay publicaciones.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pronto habrá novedades en {label.toLowerCase()}.
              </p>
            </div>
          </div>
        ) : (
          <>
            {lead && (
              <section className="border-b border-foreground/15">
                <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12 lg:items-stretch">
                  <Link
                    href={`/noticia/${section}/${lead.slug}`}
                    className="group relative min-h-[360px] overflow-hidden bg-muted lg:col-span-7 lg:min-h-[420px] lg:border-r lg:border-foreground/15"
                  >
                    {lead.cover_path ? (
                      <Image
                        src={publicUrl(lead.cover_path)}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="media-outline object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        style={{
                          objectPosition: lead.cover_position ?? "50% 50%",
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                        <span className="font-display text-6xl text-background/20">{label}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                      <span className="bg-[#B22234] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                        Destacado
                      </span>
                      <h2 className="mt-3 max-w-xl font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.02] text-white">
                        {lead.title}
                      </h2>
                    </div>
                  </Link>
                  <div className="flex flex-col justify-between px-5 py-8 md:px-8 lg:col-span-5">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {formatDay(lead.published_at)}
                        <AuthorByline
                          author={
                            (lead.author_id ? profiles.get(lead.author_id)?.display_name : null) ??
                            lead.author
                          }
                          isRedactor={Boolean(lead.author_id && redactorIds.has(lead.author_id))}
                          username={
                            lead.author_id ? profiles.get(lead.author_id)?.username : undefined
                          }
                        />
                      </p>
                      {lead.excerpt && (
                        <p className="mt-4 text-base leading-relaxed text-foreground/80 md:text-lg">
                          {lead.excerpt}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/noticia/${section}/${lead.slug}`}
                      className="pressable mt-8 inline-flex w-fit items-center border border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background hover:border-[#B22234] hover:bg-[#B22234]"
                    >
                      Leer la pieza →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 md:py-16">
                  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                        ★ En el cuaderno
                      </p>
                      <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                        Más en {label}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 border border-foreground/15 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((p) => {
                      const authorProf = p.author_id ? profiles.get(p.author_id) : undefined;
                      return (
                        <Link
                          key={p.id}
                          href={`/noticia/${section}/${p.slug}`}
                          className="group flex flex-col border-b border-foreground/15 transition-colors duration-150 ease-out hover:bg-muted/40 md:border-r last:border-b-0 lg:[&:nth-child(3n)]:border-r-0"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                            {p.cover_path ? (
                              <Image
                                src={publicUrl(p.cover_path)}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="media-outline object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                style={{
                                  objectPosition: p.cover_position ?? "50% 50%",
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                Rhecky
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B22234]">
                              {label}
                              <span className="mx-1.5 text-foreground/20">·</span>
                              <span className="text-muted-foreground">
                                {formatDay(p.published_at)}
                              </span>
                            </p>
                            <h3 className="mt-2 font-display text-xl leading-tight transition-colors duration-150 ease-out group-hover:text-[#B22234] md:text-2xl">
                              {p.title}
                            </h3>
                            {p.excerpt && (
                              <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-foreground/70">
                                {p.excerpt}
                              </p>
                            )}
                            {(authorProf?.display_name || p.author) && (
                              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                Por {authorProf?.display_name ?? p.author}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
