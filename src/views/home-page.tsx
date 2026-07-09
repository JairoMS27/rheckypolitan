"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IssueCover } from "@/components/issue-cover";
import { UserMenu } from "@/components/user-menu";
import rheckyPhoto from "@/assets/rhecky.png";

type Issue = {
  id: string;
  number: number;
  title: string;
  published_at: string;
  cover_path: string | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

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

export function HomePage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase
      .from("issues")
      .select("id,number,title,published_at,cover_path")
      .order("number", { ascending: false })
      .then(({ data }) => setIssues(data ?? []));
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

  const [submitting, setSubmitting] = useState(false);
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
      toast.success("Gracias por suscribirte", {
        description: "Te acabamos de mandar una Carta desde Kentucky.",
      });
      setEmail("");
      refetchSubs();
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
    const id = setInterval(() => refetchSubs(), 30_000);
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
      <div
        className="h-2 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />

      <header className="border-b border-foreground">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 items-center px-6 py-5">
          <span className="justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            ★ Vol. {new Date().getFullYear()} ★
          </span>
          <span className="justify-self-center font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Rheckypolitan
          </span>
          <div className="justify-self-end">
            <UserMenu />
          </div>
        </div>
        <nav className="border-t border-foreground/10">
          <ul className="mx-auto flex max-w-[1600px] items-center justify-center gap-6 px-6 py-3 md:gap-10">
            <li>
              <Link
                href="/actualidad"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Actualidad
              </Link>
            </li>
            <li>
              <Link
                href="/entretenimiento"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Entretenimiento
              </Link>
            </li>
            <li>
              <Link
                href="/conspiracion"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Conspiración
              </Link>
            </li>
            <li>
              <Link
                href="/gastronomia"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Gastronomía
              </Link>
            </li>
            <li>
              <Link
                href="/entrevistas"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Entrevistas
              </Link>
            </li>
            <li>
              <Link
                href="/pasatiempos"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
              >
                Pasatiempos
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:py-16">
        <h1 className="sr-only">Rheckypolitan — Archivo de crónicas desde Kentucky</h1>

        <section className="mb-16 grid grid-cols-1 gap-10 lg:mb-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 lg:border-r lg:border-foreground/10 lg:pr-12">
            <span className="mb-5 inline-block bg-[#B22234] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
              Archivo Histórico
            </span>
            <h2 className="font-display text-[clamp(3rem,9vw,7rem)] font-normal leading-[0.85] tracking-tight">
              Todos los
              <br />
              <span className="italic font-light text-[#B22234]">números.</span>
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-foreground/80 md:text-lg">
              Crónicas, ensayos y postales desde Kentucky. Hojea cada número como si tuvieras la
              revista entre las manos: portada, lomo y páginas que se pasan al ritmo del bourbon.
            </p>
          </div>

          <aside className="flex flex-col gap-8 lg:col-span-5">
            {issues && issues[0] ? (
              <div className="border border-foreground/15 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#B22234]">
                    ★ Destacado del mes
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatDate(issues[0].published_at)}
                  </span>
                </div>
                <div className="flex items-start gap-5">
                  <div
                    aria-hidden
                    className="select-none font-display text-[5.5rem] font-black leading-none text-foreground/10"
                  >
                    {String(issues[0].number).padStart(2, "0")}
                  </div>
                  <div className="pt-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      N.º {String(issues[0].number).padStart(2, "0")} · Edición actual
                    </p>
                    <h4 className="mt-1 font-display text-2xl leading-tight">{issues[0].title}</h4>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Última entrega del archivo: cultura contemporánea, diseño y tipografía
                      editorial en una sola pieza.
                    </p>
                    <Link
                      href={`/revista/${issues[0].number}`}
                      className="mt-4 inline-flex items-center gap-2 border-b border-foreground pb-0.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:text-[#B22234] hover:border-[#B22234]"
                    >
                      Abrir número <span>→</span>
                    </Link>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 border-t border-foreground/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>
                    {issues.length} {issues.length === 1 ? "número" : "números"} en archivo
                  </span>
                  <span className="text-[#B22234]">✦</span>
                  <span>Lectura libre</span>
                </div>
              </div>
            ) : null}

            <blockquote className="relative border-l-2 border-[#B22234] bg-muted p-6 pt-8">
              <span
                aria-hidden
                className="absolute left-4 top-0 font-display text-6xl leading-none text-[#B22234]"
              >
                “
              </span>
              <p className="font-display text-lg italic leading-snug text-foreground md:text-xl">
                Nunca os fiéis de las personas que viven debajo de vosotros. Si os drenan la
                batería, la única solución es drenarles a ellos la switch
              </p>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={rheckyPhoto}
                    alt="Rhecky"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover grayscale"
                  />
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    <p className="text-foreground">Rhecky</p>
                    <p className="text-muted-foreground">La Rioja, KY</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  ★★★
                </span>
              </div>
            </blockquote>
          </aside>
        </section>

        <section
          aria-label="Tirada certificada"
          className="mb-10 grid grid-cols-1 items-center gap-6 border-t border-b-2 border-[#B22234] py-6 md:grid-cols-3 md:gap-4 md:py-5"
        >
          <div className="flex items-center gap-2.5 md:justify-self-start">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B22234] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B22234]" />
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#B22234]">
              En directo desde Kentucky
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 md:justify-self-center">
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ✦ Tirada certificada ✦
            </span>
            <div
              className={`flex items-end gap-1 transition-transform duration-500 ${pulse ? "scale-105" : "scale-100"}`}
              aria-live="polite"
              aria-label={`${subscriberCount} lectores suscritos`}
            >
              {subscriberDigits.map((d, i) => (
                <div
                  key={`${i}-${d}`}
                  className={`relative flex h-10 w-7 items-center justify-center border border-[#B22234]/25 bg-[#B22234]/5 ${pulse ? "animate-fade-in" : ""}`}
                >
                  <span className="font-mono text-xl font-medium tabular-nums leading-none text-foreground">
                    {d}
                  </span>
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#B22234]/15" />
                </div>
              ))}
              <span className="ml-2 self-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                lectores
                <br />
                suscritos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:justify-self-end">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#B22234]" />
              <div className="h-2 w-2 rounded-full bg-foreground" />
              <div className="h-2 w-2 rounded-full bg-foreground/20" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              La colección completa
            </span>
          </div>
        </section>

        {issues === null ? (
          <Skeleton />
        ) : issues.length === 0 ? (
          <Empty />
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {issues.map((issue) => (
              <li key={issue.id}>
                <Link href={`/revista/${issue.number}`} className="group block">
                  <IssueCover number={issue.number} coverPath={issue.cover_path} />
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      N.º {String(issue.number).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {formatDate(issue.published_at)}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-xl leading-tight">{issue.title}</h2>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-24">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Voces
              </span>
              <h3 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
                Voces de Kentucky.
              </h3>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-3 md:auto-rows-fr">
            {COLUMNISTAS.map((c) => (
              <li
                key={c.initials}
                className="group flex h-full flex-col border border-foreground/15 p-6 transition hover:border-foreground/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs font-bold text-background">
                    {c.initials}
                  </div>
                  <div>
                    <p className="font-display text-xl leading-tight">{c.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.city}
                    </p>
                  </div>
                </div>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-foreground/80">{c.bio}</p>
                <div className="mt-5 flex items-center justify-between border-t border-foreground/10 pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Colaborador habitual
                  </span>
                  <span className="text-[#B22234]">✦</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {issuesByYear.length > 0 ? (
          <section className="mt-24">
            <div className="mb-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Archivo
              </span>
              <h3 className="mt-2 font-display text-4xl leading-tight md:text-5xl">Por año.</h3>
            </div>
            <ul className="divide-y divide-foreground/15 border-y border-foreground/15">
              {issuesByYear.map(({ year, items }) => (
                <li key={year} className="grid grid-cols-12 items-baseline gap-6 py-8">
                  <span className="col-span-12 font-display text-6xl leading-none tracking-tight md:col-span-3 md:text-7xl">
                    {year}
                  </span>
                  <ul className="col-span-12 flex flex-wrap gap-2 md:col-span-9">
                    {items.map((i) => (
                      <li key={i.id}>
                        <Link
                          href={`/revista/${i.number}`}
                          className="inline-flex items-center gap-2 border border-foreground/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest hover:border-[#B22234] hover:text-[#B22234]"
                        >
                          N.º {String(i.number).padStart(2, "0")}
                          <span className="text-muted-foreground">·</span>
                          <span className="normal-case tracking-normal text-foreground/70">
                            {i.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-24 bg-foreground px-6 py-14 text-background md:px-14 md:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/60">
                ✉ Cartas desde Kentucky
              </span>
              <h3 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
                Recibe las noticias de
                <br />
                <span className="italic text-[#ff8a8a]">última hora desde Kentucky.</span>
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-background/70">
                Te avisamos cuando publicamos un nuevo número y, de paso, te mandamos una columna
                corta escrita a mano. Sin spam, sin trucos.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col justify-end gap-3 lg:col-span-5"
            >
              <label
                htmlFor="newsletter-email"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/60"
              >
                Tu correo
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tunombre@correo.com"
                  className="flex-1 border-b border-background/40 bg-transparent px-1 py-3 font-display text-lg text-background placeholder:text-background/40 focus:border-[#ff8a8a] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="border border-background bg-background px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground transition hover:bg-[#ff8a8a] hover:border-[#ff8a8a] hover:text-foreground disabled:opacity-60"
                >
                  {submitting ? "Enviando…" : "Suscribirme →"}
                </button>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-background/50">
                Una carta a la semana · cancela cuando quieras
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-3 px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>★</span>
          <span>© {new Date().getFullYear()} Rheckypolitan</span>
          <span>★</span>
        </div>
      </footer>

      <div
        className="h-2 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />
    </div>
  );
}

function Skeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[3/4] animate-pulse bg-muted" />
          <div className="mt-4 h-3 w-1/3 animate-pulse bg-muted" />
          <div className="mt-2 h-5 w-2/3 animate-pulse bg-muted" />
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <div className="border border-dashed border-foreground/30 px-6 py-24 text-center">
      <p className="font-display text-2xl">Aún no hay números publicados.</p>
      <p className="mt-2 text-sm text-muted-foreground">El primer número aparecerá aquí pronto.</p>
    </div>
  );
}
