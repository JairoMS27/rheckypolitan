"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "@/components/user-menu";
import { UserAvatar } from "@/components/user-avatar";
import { RedactorBadge } from "@/components/redactor-badge";
import { publicUrl } from "@/lib/storage";
import { sectionLabel } from "@/lib/sections";
import {
  countFollowers,
  countFollowing,
  fetchProfileByUsername,
  fetchPublishedPostsByAuthor,
  followUser,
  isFollowing,
  unfollowUser,
  type PublicProfile,
} from "@/lib/profiles";
import { fetchRedactorIdSet } from "@/lib/redactor-badges";

type AuthorPost = {
  id: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  cover_position: string | null;
  published_at: string;
  author: string | null;
};

export function PublicProfilePage({ username }: { username: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(
    undefined,
  );
  const [isRedactor, setIsRedactor] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [iFollow, setIFollow] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<AuthorPost[] | null>(null);

  const reloadSocial = async (profileId: string, viewerId?: string | null) => {
    const [fCount, gCount, followed] = await Promise.all([
      countFollowers(profileId),
      countFollowing(profileId),
      viewerId ? isFollowing(viewerId, profileId) : Promise.resolve(false),
    ]);
    setFollowers(fCount);
    setFollowing(gCount);
    setIFollow(followed);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchProfileByUsername(username);
      if (cancelled) return;
      if (!data) {
        setProfile(null);
        return;
      }
      setProfile(data);
      const [redactors, postsRes] = await Promise.all([
        fetchRedactorIdSet([data.id]),
        fetchPublishedPostsByAuthor(data.id),
      ]);
      if (cancelled) return;
      setIsRedactor(redactors.has(data.id));
      setPosts((postsRes.data as AuthorPost[] | null) ?? []);
      await reloadSocial(data.id, user?.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [username, user?.id]);

  const handleFollow = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/u/${username}`)}`);
      return;
    }
    if (!profile || followBusy || user.id === profile.id) return;
    setFollowBusy(true);
    try {
      if (iFollow) {
        const { error } = await unfollowUser(user.id, profile.id);
        if (error) throw error;
        setIFollow(false);
        setFollowers((n) => Math.max(0, n - 1));
      } else {
        const { error } = await followUser(user.id, profile.id);
        if (error) throw error;
        setIFollow(true);
        setFollowers((n) => n + 1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Inténtalo de nuevo";
      toast.error("No se pudo actualizar el seguimiento", {
        description: message,
      });
    } finally {
      setFollowBusy(false);
    }
  };

  if (profile === undefined || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin border-2 border-foreground/20 border-t-[#B22234]" />
      </div>
    );
  }

  if (profile === null) {
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
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ Perfil
          </p>
          <h1 className="mt-3 font-display text-4xl">Usuario no encontrado</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            No hay ninguna cuenta con el nombre @{username}.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isOwn = user?.id === profile.id;
  const memberSince = new Date(profile.created_at).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

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

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar
            displayName={profile.display_name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            size="xl"
            link={false}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl leading-tight md:text-4xl">
                {profile.display_name}
              </h1>
              {isRedactor ? <RedactorBadge /> : null}
            </div>
            {profile.username && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                @{profile.username}
              </p>
            )}
            {profile.bio && (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/85">
                {profile.bio}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>
                <strong className="text-foreground">{followers}</strong>{" "}
                seguidores
              </span>
              <span>
                <strong className="text-foreground">{following}</strong>{" "}
                seguidos
              </span>
              <span>Miembro desde {memberSince}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {isOwn ? (
                <Link
                  href="/profile"
                  className="border border-foreground bg-foreground px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                >
                  Editar perfil
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followBusy}
                  className={`border px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest transition disabled:opacity-50 ${
                    iFollow
                      ? "border-foreground/30 text-foreground hover:border-[#B22234] hover:text-[#B22234]"
                      : "border-foreground bg-foreground text-background hover:border-[#B22234] hover:bg-[#B22234]"
                  }`}
                >
                  {followBusy
                    ? "…"
                    : iFollow
                      ? "Dejar de seguir"
                      : "Seguir"}
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="mt-14 border-t border-foreground/15 pt-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ Publicaciones
          </span>
          <h2 className="mt-2 font-display text-2xl">
            {posts === null
              ? "Noticias"
              : posts.length === 0
                ? "Sin noticias publicadas"
                : `${posts.length} ${posts.length === 1 ? "noticia" : "noticias"}`}
          </h2>

          {posts === null ? (
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              Cargando…
            </p>
          ) : posts.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Este usuario aún no ha publicado artículos.
            </p>
          ) : (
            <ul className="mt-8 space-y-0 divide-y divide-foreground/10">
              {posts.map((p) => (
                <li key={p.id} className="py-6 first:pt-0">
                  <Link
                    href={`/noticia/${p.section}/${p.slug}`}
                    className="group flex gap-4"
                  >
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden bg-muted sm:h-24 sm:w-36">
                      {p.cover_path ? (
                        <Image
                          src={publicUrl(p.cover_path)}
                          alt=""
                          fill
                          sizes="144px"
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
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {sectionLabel(p.section)} ·{" "}
                        {new Date(p.published_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <h3 className="mt-1 font-display text-xl leading-tight group-hover:text-[#B22234]">
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                          {p.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
