"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "@/components/user-menu";
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
  const [notifyByAuthor, setNotifyByAuthor] = useState<Map<string, boolean>>(
    new Map(),
  );
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
      <div
        className="h-2 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />
      <header className="border-b border-foreground">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 items-center px-6 py-5">
          <Link
            href="/"
            className="justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
          >
            ← Inicio
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
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1fr_280px]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ Mi feed
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            Artículos de tus seguidos
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Aquí solo aparecen publicaciones de personas a las que sigues. Activa
            los avisos por correo si quieres enterarte al momento.
          </p>

          {posts === null ? (
            <p className="mt-10 font-mono text-xs text-muted-foreground">Cargando…</p>
          ) : posts.length === 0 ? (
            <div className="mt-10 border border-dashed border-foreground/25 px-6 py-16 text-center">
              <p className="font-display text-xl">Tu feed está vacío</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sigue a autores desde sus perfiles para ver aquí sus artículos.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-[#B22234] underline underline-offset-2"
              >
                Explorar el archivo →
              </Link>
            </div>
          ) : (
            <ul className="mt-10 divide-y divide-foreground/15 border-y border-foreground/15">
              {posts.map((p) => {
                const author = p.author_id ? profiles.get(p.author_id) : null;
                const name =
                  author?.display_name || p.author || "Autor";
                const uHref = profilePath(author?.username);
                return (
                  <li key={p.id} className="py-6">
                    <div className="mb-3 flex items-center gap-2">
                      {author && (
                        <UserAvatar
                          displayName={author.display_name}
                          username={author.username}
                          avatarUrl={author.avatar_url}
                          size="sm"
                        />
                      )}
                      <div className="min-w-0">
                        {uHref ? (
                          <Link
                            href={uHref}
                            className="font-mono text-[11px] font-medium hover:text-[#B22234]"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] font-medium">
                            {name}
                          </span>
                        )}
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {sectionLabel(p.section)} ·{" "}
                          {new Date(p.published_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/noticia/${p.section}/${p.slug}`}
                      className="group flex gap-4"
                    >
                      <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-muted sm:h-28 sm:w-40">
                        {p.cover_path ? (
                          <Image
                            src={publicUrl(p.cover_path)}
                            alt=""
                            fill
                            sizes="160px"
                            className="object-cover transition group-hover:scale-[1.03]"
                            style={{
                              objectPosition: p.cover_position ?? "50% 50%",
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                            Rhecky
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-2xl leading-tight group-hover:text-[#B22234]">
                          {p.title}
                        </h2>
                        {p.excerpt && (
                          <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                            {p.excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="border border-foreground/15 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#B22234]">
              Avisos por correo
            </p>
            <h2 className="mt-2 font-display text-xl">Quienes sigues</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Activa el interruptor para recibir un email cuando publiquen.
            </p>
            {following.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Aún no sigues a nadie.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {following.map((person) => {
                  const on =
                    notifyByAuthor.get(person.id) ??
                    person.notify_posts ??
                    false;
                  return (
                    <li key={person.id} className="flex items-center gap-2">
                      <UserAvatar
                        displayName={person.display_name}
                        username={person.username}
                        avatarUrl={person.avatar_url}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {person.display_name}
                        </p>
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
                            const { error } = await setFollowNotify(
                              user.id,
                              person.id,
                              next,
                            );
                            if (error) throw error;
                            setNotifyByAuthor((prev) => {
                              const m = new Map(prev);
                              m.set(person.id, next);
                              return m;
                            });
                            setFollowing((list) =>
                              list.map((p) =>
                                p.id === person.id
                                  ? { ...p, notify_posts: next }
                                  : p,
                              ),
                            );
                            toast.success(
                              next
                                ? `Avisos activados para ${person.display_name}`
                                : `Avisos desactivados`,
                            );
                          } catch (err: unknown) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "No se pudo guardar",
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
                        title={
                          on
                            ? "Desactivar avisos por correo"
                            : "Activar avisos por correo"
                        }
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
      </main>
    </div>
  );
}
