"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UserAvatar } from "@/components/user-avatar";
import { publicUrl } from "@/lib/storage";
import { sectionLabel } from "@/lib/sections";
import {
  fetchFeedPosts,
  fetchProfileSnippets,
  listFollowing,
  setFollowNotify,
  type FeedPost,
  type FollowListPerson,
  type ProfileSnippet,
} from "@/lib/profiles";
import { profilePath } from "@/lib/username";

export function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, ProfileSnippet>>(new Map());
  const [following, setFollowing] = useState<FollowListPerson[]>([]);
  const [notifyByAuthor, setNotifyByAuthor] = useState<Map<string, boolean>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/feed");
      return;
    }

    let cancelled = false;
    (async () => {
      const [feed, followingList] = await Promise.all([
        fetchFeedPosts(user.id),
        listFollowing(user.id),
      ]);
      if (cancelled) return;
      setPosts(feed.posts);
      setNotifyByAuthor(feed.notifyByAuthor);
      setFollowing(followingList);
      const authorIds = [
        ...new Set(feed.posts.map((p) => p.author_id).filter(Boolean)),
      ] as string[];
      const map = await fetchProfileSnippets(authorIds);
      if (!cancelled) setProfiles(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin border-2 border-foreground/20 border-t-[#B22234]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <main>
        <section className="border-b border-foreground/15">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12">
            <div className="border-b border-foreground/15 px-5 py-10 md:px-8 md:py-12 lg:col-span-8 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Mi feed
              </p>
              <h1 className="mt-2 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[0.95]">
                Artículos de tus seguidos
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-foreground/75 md:text-base">
                Solo piezas de personas a las que sigues. Activa los avisos por correo si quieres
                enterarte al momento.
              </p>
            </div>
            <aside className="bg-muted/30 px-5 py-8 md:px-8 lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                En tu mesa
              </p>
              <p className="mt-3 font-display text-5xl tabular-nums leading-none text-foreground/15">
                {posts ? String(posts.length).padStart(2, "0") : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {posts?.length === 1 ? "artículo" : "artículos"}
              </p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Siguiendo a {following.length}
              </p>
            </aside>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:border-r lg:border-foreground/15">
            {posts === null ? (
              <p className="px-5 py-16 font-mono text-xs uppercase tracking-widest text-muted-foreground md:px-8">
                Cargando…
              </p>
            ) : posts.length === 0 ? (
              <div className="px-5 py-16 md:px-8">
                <div className="border border-dashed border-foreground/25 px-6 py-16 text-center">
                  <p className="font-display text-2xl">Tu feed está vacío</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sigue a autores desde sus perfiles para ver aquí sus artículos.
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-block border border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                  >
                    Explorar el archivo →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 border-b border-foreground/15 md:grid-cols-2">
                {posts.map((p) => {
                  const author = p.author_id ? profiles.get(p.author_id) : null;
                  const name = author?.display_name || p.author || "Autor";
                  const uHref = profilePath(author?.username);
                  return (
                    <article
                      key={p.id}
                      className="group flex flex-col border-b border-foreground/15 transition hover:bg-muted/40 md:border-r md:odd:border-r lg:[&:nth-child(2n)]:border-r-0"
                    >
                      <Link
                        href={`/noticia/${p.section}/${p.slug}`}
                        className="relative aspect-[16/10] overflow-hidden bg-muted"
                      >
                        {p.cover_path ? (
                          <Image
                            src={publicUrl(p.cover_path)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 40vw"
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                            style={{
                              objectPosition: p.cover_position ?? "50% 50%",
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Rhecky
                          </div>
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B22234]">
                          {sectionLabel(p.section)}
                          <span className="mx-1.5 text-foreground/20">·</span>
                          <span className="text-muted-foreground">
                            {new Date(p.published_at).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                        <Link href={`/noticia/${p.section}/${p.slug}`}>
                          <h2 className="mt-2 font-display text-xl leading-tight transition group-hover:text-[#B22234] md:text-2xl">
                            {p.title}
                          </h2>
                          {p.excerpt && (
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/70">
                              {p.excerpt}
                            </p>
                          )}
                        </Link>
                        <div className="mt-4 flex items-center gap-2">
                          {author && (
                            <UserAvatar
                              displayName={author.display_name}
                              username={author.username}
                              avatarUrl={author.avatar_url}
                              size="sm"
                            />
                          )}
                          {uHref ? (
                            <Link
                              href={uHref}
                              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {name}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="border-t border-foreground/15 px-5 py-10 md:px-8 lg:col-span-4 lg:border-t-0">
            <div className="border border-foreground/15 p-5 lg:sticky lg:top-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#B22234]">
                Avisos por correo
              </p>
              <h2 className="mt-2 font-display text-2xl">Quienes sigues</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Activa el interruptor para recibir un email cuando publiquen.
              </p>
              {following.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Aún no sigues a nadie.</p>
              ) : (
                <ul className="mt-5 space-y-0 divide-y divide-foreground/10">
                  {following.map((person) => {
                    const on = notifyByAuthor.get(person.id) ?? person.notify_posts ?? false;
                    return (
                      <li key={person.id} className="flex items-center gap-2 py-3">
                        <UserAvatar
                          displayName={person.display_name}
                          username={person.username}
                          avatarUrl={person.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{person.display_name}</p>
                          {person.username && (
                            <p className="font-mono text-[9px] text-muted-foreground">
                              @{person.username}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={busyId === person.id}
                          onClick={async () => {
                            setBusyId(person.id);
                            try {
                              const next = !on;
                              const { error } = await setFollowNotify(user.id, person.id, next);
                              if (error) throw error;
                              setNotifyByAuthor((prev) => {
                                const m = new Map(prev);
                                m.set(person.id, next);
                                return m;
                              });
                              setFollowing((list) =>
                                list.map((p) =>
                                  p.id === person.id ? { ...p, notify_posts: next } : p,
                                ),
                              );
                              toast.success(
                                next
                                  ? `Avisos activados para ${person.display_name}`
                                  : "Avisos desactivados",
                              );
                            } catch (err: unknown) {
                              toast.error(
                                err instanceof Error ? err.message : "No se pudo guardar",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className={`shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-widest transition ${
                            on
                              ? "border-[#B22234] bg-[#B22234]/10 text-[#B22234]"
                              : "border-foreground/20 text-muted-foreground"
                          }`}
                          title={on ? "Desactivar avisos por correo" : "Activar avisos por correo"}
                        >
                          {on ? "✉ ON" : "✉ OFF"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
