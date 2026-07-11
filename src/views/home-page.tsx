"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MagazineShelf } from "@/components/magazine-shelf";
import { SiteFooter } from "@/components/site-footer";
import { UserMenu } from "@/components/user-menu";
import { publicUrl } from "@/lib/storage";
import rheckyPhoto from "@/assets/rhecky.png";

type Issue = {
  id: string;
  number: number;
  title: string;
  published_at: string;
  cover_path: string | null;
};

type LatestPost = {
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

const NAV = [
  { href: "/actualidad", label: "Actualidad" },
  { href: "/entretenimiento", label: "Entretenimiento" },
  { href: "/conspiracion", label: "Conspiración" },
  { href: "/gastronomia", label: "Gastronomía" },
  { href: "/entrevistas", label: "Entrevistas" },
  { href: "/pasatiempos", label: "Pasatiempos" },
] as const;

const COLUMNISTAS = [
  {
    initials: "LL",
    name: "Luis Lastra",
    city: "La Rioja, KY",
    bio: "Escribe sobre la privatización de las contraseñas de la Thermomix.",
  },
  {
    initials: "IV",
    name: "Iván",
    city: "Louisville, KY",
    bio: "Hace artículos de Fanta Azul y Funkos.",
  },
  {
    initials: "AN",
    name: "Alber Ninten",
    city: "Bowling Green, KY",
    bio: "Escribe sobre los cubos de palomitas de Yoshi.",
  },
];

const SECTION_LABELS: Record<string, string> = {
  actualidad: "Actualidad",
  entretenimiento: "Entretenimiento",
  conspiracion: "Conspiración",
  gastronomia: "Gastronomía",
  entrevistas: "Entrevistas",
  pasatiempos: "Pasatiempos",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function formatDay(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayLine() {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomePage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [latestPosts, setLatestPosts] = useState<LatestPost[] | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase
      .from("issues")
      .select("id,number,title,published_at,cover_path")
      .order("number", { ascending: false })
      .then(({ data }) => setIssues(data ?? []));

    void supabase
      .from("posts")
      .select("id,section,slug,title,excerpt,cover_path,cover_position,published_at,author")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setLatestPosts((data as LatestPost[] | null) ?? []));
  }, []);

  const issuesByYear = useMemo(() => {
    if (!issues) return [] as { year: number; items: Issue[] }[];
    const map = new Map<number, Issue[]>();
    issues.forEach((i) => {
      const y = new Date(i.published_at).getFullYear();
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(i);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  }, [issues]);

  const latest = issues?.[0] ?? null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No pudimos suscribirte", {
          description: data?.error ?? "Inténtalo de nuevo en un rato.",
        });
        return;
      }
      if (data?.already && data?.sent) {
        toast.success("Ya estabas suscrita/o", {
          description: "Te reenviamos la Carta de bienvenida.",
        });
      } else if (data?.sent === false) {
        toast.success(data?.already ? "Ya estabas suscrita/o" : "Gracias por suscribirte", {
          description:
            data?.warning ??
            "Estás en la lista. El correo de confirmación puede tardar un momento.",
        });
      } else {
        toast.success("Gracias por suscribirte", {
          description: "Te acabamos de mandar una Carta desde Kentucky.",
        });
      }
      setEmail("");
      void refetchSubs();
    } catch {
      toast.error("Error de red", { description: "Revisa tu conexión." });
    } finally {
      setSubmitting(false);
    }
  };

  const { data: subData, refetch: refetchSubs } = useQuery({
    queryKey: ["subscriber-count"],
    queryFn: async () => {
      const res = await fetch("/api/subscribers/count");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ count: number }>;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const subscriberCount = subData?.count ?? 0;
  const subscriberDigits = String(subscriberCount).padStart(4, "0").split("");
  const [prevDigits, setPrevDigits] = useState<string[]>(subscriberDigits);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => void refetchSubs(), 30_000);
    return () => clearInterval(id);
  }, [refetchSubs]);

  useEffect(() => {
    if (prevDigits.join("") !== subscriberDigits.join("")) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      setPrevDigits(subscriberDigits);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriberCount]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top newsprint ribbon */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #B22234 0 10px, #ffffff 10px 20px)",
        }}
        aria-hidden
      />

      {/* Masthead */}
      <header className="border-b border-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            <span className="hidden sm:inline">{todayLine()}</span>
            <span className="sm:hidden">Vol. {new Date().getFullYear()}</span>
            <span className="mx-2 text-[#B22234]">·</span>
            Edición digital
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-[#B22234] md:inline"
            >
              Mi feed
            </Link>
            <UserMenu />
          </div>
        </div>

        <div className="border-y border-foreground/10 bg-muted/30">
          <div className="mx-auto max-w-[1400px] px-5 py-6 text-center md:px-8 md:py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-[#B22234]">
              ★ Cartas desde Kentucky ★
            </p>
            <Link
              href="/"
              className="mt-2 inline-block font-display text-[clamp(2.75rem,10vw,5.5rem)] font-semibold leading-none tracking-tight"
            >
              Rheckypolitan
            </Link>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Crónicas · Ensayos · Postales editoriales
            </p>
          </div>
        </div>

        <nav aria-label="Secciones" className="overflow-x-auto">
          <ul className="mx-auto flex min-w-max max-w-[1400px] items-center justify-center gap-1 px-4 py-2.5 md:gap-0 md:px-8">
            {NAV.map((s, i) => (
              <li key={s.href} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1 hidden text-foreground/15 md:inline" aria-hidden>
                    |
                  </span>
                )}
                <Link
                  href={s.href}
                  className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:bg-[#B22234] hover:text-white md:px-4"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <h1 className="sr-only">Rheckypolitan — Archivo de crónicas desde Kentucky</h1>

        {/* HERO — cover fills full height of the row (matches tirada column) */}
        <section className="border-b border-foreground/15">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12 lg:items-stretch">
            {/* Lead story — stretches to aside height */}
            <div className="relative min-h-[480px] lg:col-span-8 lg:min-h-0 lg:border-r lg:border-foreground/15">
              {latest ? (
                <Link
                  href={`/revista/${latest.number}`}
                  className="group absolute inset-0 block overflow-hidden bg-muted"
                >
                  {latest.cover_path ? (
                    <Image
                      src={publicUrl(latest.cover_path)}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                      <span className="font-display text-[8rem] text-background/20">
                        {String(latest.number).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="bg-[#B22234] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                        Último número
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">
                        N.º {String(latest.number).padStart(2, "0")} ·{" "}
                        {formatDate(latest.published_at)}
                      </span>
                    </div>
                    <h2 className="max-w-2xl font-display text-[clamp(2rem,5vw,3.75rem)] font-normal leading-[0.95] text-white">
                      {latest.title}
                    </h2>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
                      Hojea el número como una revista de papel: portada, lomo y páginas al ritmo
                      del bourbon.
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 border border-white/40 bg-white/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition group-hover:border-white group-hover:bg-white group-hover:text-foreground">
                      Leer el número →
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex h-full min-h-[360px] items-center justify-center bg-muted px-6">
                  <div className="text-center">
                    <p className="font-display text-3xl">Preparando el primer número</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      El archivo se abre en cuanto salga la primera entrega.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Side column — defines row height */}
            <aside className="flex flex-col lg:col-span-4">
              <div className="border-b border-foreground/15 p-6 md:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Editorial
                </p>
                <h2 className="mt-3 font-display text-3xl leading-[1.05] md:text-4xl">
                  Todos los números.
                  <br />
                  <span className="italic text-[#B22234]">Una sola mesa.</span>
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                  Rheckypolitan es un archivo vivo de crónicas, ensayos y postales desde Kentucky.
                  Lee las revistas digitales y los artículos de sección sin prisa.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href="#archivo"
                    className="border border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                  >
                    Ver archivo
                  </Link>
                  <Link
                    href="/publicar"
                    className="border border-foreground/25 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition hover:border-foreground"
                  >
                    Publicar
                  </Link>
                </div>
              </div>

              <blockquote className="relative flex flex-1 flex-col justify-between border-b border-foreground/15 bg-muted/40 p-6 md:p-8">
                <div>
                  <span
                    aria-hidden
                    className="font-display text-6xl leading-none text-[#B22234]/40"
                  >
                    “
                  </span>
                  <p className="-mt-4 font-display text-xl italic leading-snug md:text-2xl">
                    Nunca os fiéis de las personas que viven debajo de vosotros. Si os drenan la
                    batería, la única solución es drenarles a ellos la switch.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-foreground/10 pt-4">
                  <Image
                    src={rheckyPhoto}
                    alt="Rhecky"
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover grayscale"
                  />
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest">Rhecky</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      La Rioja, KY · Fundador
                    </p>
                  </div>
                </div>
              </blockquote>

              {/* Live count strip */}
              <div className="mt-auto flex items-center justify-between gap-3 p-5 md:px-8">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                    Tirada certificada
                  </p>
                  <div
                    className={`mt-1.5 flex items-end gap-1 transition-transform duration-500 ${
                      pulse ? "scale-105" : "scale-100"
                    }`}
                    aria-live="polite"
                    aria-label={`${subscriberCount} lectores suscritos`}
                  >
                    {subscriberDigits.map((d, i) => (
                      <div
                        key={`${i}-${d}`}
                        className="flex h-9 w-6 items-center justify-center border border-[#B22234]/30 bg-[#B22234]/5"
                      >
                        <span className="font-mono text-lg tabular-nums leading-none">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="relative mb-1 inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B22234] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B22234]" />
                  </span>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                    En directo
                    <br />
                    desde Kentucky
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Latest articles */}
        {latestPosts && latestPosts.length > 0 && (
          <section className="border-b border-foreground/15">
            <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 md:py-16">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                    ★ Ahora mismo
                  </p>
                  <h2 className="mt-2 font-display text-3xl leading-tight md:text-5xl">
                    En el archivo
                  </h2>
                </div>
                <Link
                  href="/actualidad"
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-[#B22234] hover:underline"
                >
                  Ver secciones →
                </Link>
              </div>

              <div className="grid grid-cols-1 border border-foreground/15 md:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/noticia/${post.section}/${post.slug}`}
                    className="group flex flex-col border-b border-foreground/15 transition hover:bg-muted/40 md:border-r md:odd:border-r lg:[&:nth-child(3n)]:border-r-0 last:border-b-0"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {post.cover_path ? (
                        <Image
                          src={publicUrl(post.cover_path)}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                          style={{
                            objectPosition: post.cover_position ?? "50% 50%",
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
                        {SECTION_LABELS[post.section] ?? post.section}
                        <span className="mx-1.5 text-foreground/20">·</span>
                        <span className="text-muted-foreground">
                          {formatDay(post.published_at)}
                        </span>
                      </p>
                      <h3 className="mt-2 font-display text-xl leading-tight transition group-hover:text-[#B22234] md:text-2xl">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-foreground/70">
                          {post.excerpt}
                        </p>
                      )}
                      {post.author && (
                        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Por {post.author}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cinematic scroll shelf — pinned scene, magazines arrive on scroll */}
        <section id="archivo" className="scroll-mt-0">
          {issues === null ? (
            <div className="flex h-svh min-h-[480px] items-center justify-center bg-background">
              <div className="h-10 w-48 animate-pulse bg-muted" />
            </div>
          ) : issues.length === 0 ? (
            <Empty />
          ) : (
            <MagazineShelf
              issues={issues.map((i) => ({
                id: i.id,
                number: i.number,
                title: i.title,
                cover_path: i.cover_path,
                published_at: i.published_at,
              }))}
            />
          )}
        </section>

        {/* Voices */}
        <section className="border-y border-foreground/15 bg-muted/25">
          <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Voces
                </p>
                <h2 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
                  Columnistas
                </h2>
              </div>
              <p className="max-w-xs text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Desde el estado de Kentucky
                <br />y alrededores imaginarios
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-0 border border-foreground/15 md:grid-cols-3">
              {COLUMNISTAS.map((c, i) => (
                <li
                  key={c.initials}
                  className={`relative flex flex-col bg-background p-7 md:p-8 ${
                    i < COLUMNISTAS.length - 1
                      ? "border-b border-foreground/15 md:border-b-0 md:border-r"
                      : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute right-5 top-4 font-display text-6xl leading-none text-foreground/[0.06]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center bg-foreground font-mono text-sm font-bold text-background">
                    {c.initials}
                  </div>
                  <p className="mt-5 font-display text-2xl leading-tight">{c.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.city}
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">{c.bio}</p>
                  <div className="mt-6 border-t border-foreground/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-[#B22234]">
                    Colaborador habitual ✦
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Year archive */}
        {issuesByYear.length > 0 && (
          <section>
            <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Línea de tiempo
              </p>
              <h2 className="mt-2 font-display text-4xl leading-tight md:text-5xl">Por año</h2>
              <ul className="mt-10 space-y-0">
                {issuesByYear.map(({ year, items }, yi) => (
                  <li
                    key={year}
                    className={`grid grid-cols-1 gap-6 border-t border-foreground/15 py-8 md:grid-cols-12 md:items-start ${
                      yi === issuesByYear.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="md:col-span-3">
                      <span className="font-display text-6xl leading-none tracking-tight md:text-7xl">
                        {year}
                      </span>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {items.length} {items.length === 1 ? "entrega" : "entregas"}
                      </p>
                    </div>
                    <ul className="flex flex-wrap gap-2 md:col-span-9">
                      {items.map((i) => (
                        <li key={i.id}>
                          <Link
                            href={`/revista/${i.number}`}
                            className="group inline-flex max-w-full items-center gap-2 border border-foreground/15 bg-background px-3 py-2 transition hover:border-[#B22234] hover:bg-[#B22234] hover:text-white"
                          >
                            <span className="font-mono text-[11px] font-bold uppercase tracking-widest">
                              {String(i.number).padStart(2, "0")}
                            </span>
                            <span className="hidden h-3 w-px bg-foreground/15 group-hover:bg-white/30 sm:block" />
                            <span className="truncate font-display text-sm">{i.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Newsletter */}
        <section className="border-t border-foreground bg-foreground text-background">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 py-14 md:grid-cols-12 md:px-8 md:py-20">
            <div className="md:col-span-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/50">
                ✉ Cartas desde Kentucky
              </p>
              <h2 className="mt-3 font-display text-4xl leading-[1.05] md:text-5xl lg:text-6xl">
                La tirada
                <br />
                <span className="italic text-[#ff8a8a]">en tu bandeja.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-background/65">
                Te avisamos cuando sale un número nuevo y, de paso, una columna corta escrita a
                mano. Sin spam, sin algoritmos, sin trucos.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col justify-end gap-4 md:col-span-6"
            >
              <label
                htmlFor="newsletter-email"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/50"
              >
                Tu correo
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tunombre@correo.com"
                  className="flex-1 border border-background/25 bg-transparent px-4 py-3.5 font-display text-lg text-background placeholder:text-background/35 focus:border-[#ff8a8a] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="border border-background bg-background px-7 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground transition hover:border-[#ff8a8a] hover:bg-[#ff8a8a] disabled:opacity-60"
                >
                  {submitting ? "Enviando…" : "Suscribirme →"}
                </button>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-background/40">
                Una carta cuando toque · cancela cuando quieras
              </p>
            </form>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Empty() {
  return (
    <div className="border-y border-foreground/15 bg-background px-6 py-24 text-center">
      <p className="font-display text-2xl">Aún no hay números publicados.</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        El primer número aparecerá aquí pronto.
      </p>
    </div>
  );
}
