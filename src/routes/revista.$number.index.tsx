import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IssueCover } from "@/components/issue-cover";

type IssueMeta = {
  number: number;
  title: string;
  subtitle: string | null;
  published_at: string;
} | null;

export const Route = createFileRoute("/revista/$number/")({
  component: IssueLanding,
  loader: async ({ params }): Promise<{ meta: IssueMeta }> => {
    const { data } = await supabase
      .from("issues")
      .select("number,title,subtitle,published_at")
      .eq("number", Number(params.number))
      .maybeSingle();
    return { meta: (data as IssueMeta) ?? null };
  },
  head: ({ params, loaderData }) => {
    const meta = loaderData?.meta;
    const numFmt = String(params.number).padStart(2, "0");
    const url = `https://rheckypolitan.es/revista/${params.number}`;
    if (!meta) {
      return {
        meta: [
          { title: `N.º ${numFmt} — Rheckypolitan` },
          { name: "description", content: `Número ${numFmt} de Rheckypolitan, revista digital desde Kentucky.` },
          { property: "og:title", content: `N.º ${numFmt} — Rheckypolitan` },
          { property: "og:url", content: url },
          { property: "og:type", content: "article" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${meta.title} — Rheckypolitan N.º ${numFmt}`;
    const trimmedTitle = title.length > 60 ? `${meta.title} — N.º ${numFmt}` : title;
    const baseDesc = (meta.subtitle ?? `Número ${numFmt} de Rheckypolitan: ${meta.title}. Crónicas y ensayos desde Kentucky.`).replace(/\s+/g, " ").trim();
    const description = baseDesc.length > 160 ? `${baseDesc.slice(0, 157)}…` : baseDesc;
    return {
      meta: [
        { title: trimmedTitle },
        { name: "description", content: description },
        { property: "og:title", content: trimmedTitle },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: meta.title,
            datePublished: meta.published_at,
            url,
            publisher: {
              "@type": "Organization",
              name: "Rheckypolitan",
              url: "https://rheckypolitan.es/",
            },
          }),
        },
      ],
    };
  },
});

type SummaryItem = { p: string; section: string; title: string };
type QuoteItem = { text: string; author: string; where: string };
type CreditItem = { rol: string; nombres: string };

type Issue = {
  id: string;
  number: number;
  title: string;
  published_at: string;
  cover_path: string | null;
  subtitle: string | null;
  summary: SummaryItem[] | null;
  quotes: QuoteItem[] | null;
  credits: CreditItem[] | null;
  show_quotes: boolean | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function IssueLanding() {
  const { number } = Route.useParams();
  const [issue, setIssue] = useState<Issue | null | undefined>(undefined);
  const [allIssues, setAllIssues] = useState<Issue[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: list } = await supabase
        .from("issues")
        .select("id,number,title,published_at,cover_path,subtitle,summary,quotes,credits,show_quotes")
        .order("number", { ascending: false });
      setAllIssues((list ?? []) as unknown as Issue[]);
      const found = (list?.find((i) => i.number === Number(number)) ?? null) as unknown as Issue | null;
      setIssue(found);
    })();
  }, [number]);

  const { prev, next } = useMemo(() => {
    if (!allIssues || !issue) return { prev: null as Issue | null, next: null as Issue | null };
    const sorted = [...allIssues].sort((a, b) => a.number - b.number);
    const idx = sorted.findIndex((i) => i.number === issue.number);
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [allIssues, issue]);

  if (issue === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Cargando…
        </span>
      </div>
    );
  }

  if (issue === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <p className="font-display text-3xl">Número no encontrado</p>
        <Link
          to="/"
          className="mt-6 font-mono text-[11px] uppercase tracking-widest underline-offset-4 hover:underline"
        >
          Volver al archivo →
        </Link>
      </div>
    );
  }

  const numFmt = String(issue.number).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)" }}
        aria-hidden
      />

      <header className="border-b border-foreground">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 items-center px-6 py-5">
          <Link
            to="/"
            className="justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
          >
            ← Archivo
          </Link>
          <Link
            to="/"
            className="justify-self-center font-display text-2xl font-semibold tracking-tight md:text-3xl"
          >
            Rheckypolitan
          </Link>
          <span className="justify-self-end font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            ★ N.º {numFmt} ★
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-12 md:py-20">
        {/* HERO */}
        <section className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7 lg:border-r lg:border-foreground/10 lg:pr-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
              ★ Edición · {formatDate(issue.published_at)}
            </span>
            <div className="mt-3 flex items-baseline gap-6">
              <span className="font-display text-[clamp(5rem,12vw,11rem)] font-black leading-[0.85] text-[#B22234]">
                {numFmt}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Número
              </span>
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] tracking-tight">
              {issue.title}
            </h1>
            {issue.subtitle && (
              <p className="mt-8 max-w-lg whitespace-pre-line text-base leading-relaxed text-foreground/80 md:text-lg">
                {issue.subtitle}
              </p>
            )}
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/revista/$number/leer"
                params={{ number }}
                className="inline-flex items-center gap-3 bg-foreground px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:bg-[#B22234]"
              >
                Leer número <span>→</span>
              </Link>
              <Link
                to="/"
                className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                ← Volver al archivo
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Link
              to="/revista/$number/leer"
              params={{ number }}
              className="group block"
              aria-label={`Leer N.º ${numFmt}`}
            >
              <IssueCover number={issue.number} coverPath={issue.cover_path} />
            </Link>
            <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Portada original</span>
              <span className="text-[#B22234]">✦</span>
              <span>Pasa el ratón</span>
            </div>
          </div>
        </section>

        {/* SUMARIO */}
        {issue.summary && issue.summary.length > 0 && (
          <section className="mt-24 border-t border-foreground/15 pt-14">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Sumario
                </span>
                <h3 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
                  Lo que vas a encontrar dentro.
                </h3>
              </div>
              <Link
                to="/revista/$number/leer"
                params={{ number }}
                className="font-mono text-[11px] uppercase tracking-widest underline-offset-4 hover:underline"
              >
                Empezar a leer →
              </Link>
            </div>
            <ol className="divide-y divide-foreground/10 border-y border-foreground/15">
              {issue.summary.map((s, i) => (
                <li key={i} className="grid grid-cols-12 items-baseline gap-4 py-5">
                  <span className="col-span-2 font-display text-3xl text-[#B22234] md:text-4xl">
                    {s.p}
                  </span>
                  <span className="col-span-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground md:col-span-2">
                    {s.section}
                  </span>
                  <span className="col-span-7 font-display text-lg leading-snug md:col-span-8 md:text-xl">
                    {s.title}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* CITAS */}
        {issue.show_quotes && issue.quotes && issue.quotes.length > 0 && (
          <section className="mt-24 grid grid-cols-1 gap-10 md:grid-cols-2">
            {issue.quotes.map((c, idx) => (
              <blockquote key={idx} className="relative border-l-2 border-[#B22234] bg-muted p-8 pt-10">
                <span aria-hidden className="absolute left-5 top-1 font-display text-7xl leading-none text-[#B22234]">“</span>
                <p className="font-display text-xl italic leading-snug md:text-2xl">{c.text}</p>
                <footer className="mt-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="text-foreground">— {c.author}</span>
                  <span>{c.where}</span>
                </footer>
              </blockquote>
            ))}
          </section>
        )}

        {/* CRÉDITOS */}
        {issue.credits && issue.credits.length > 0 && (
          <section className="mt-24 border-y border-foreground/15 py-14">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Créditos
                </span>
                <h3 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                  Quién lo hizo posible.
                </h3>
              </div>
              <ul className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:col-span-9">
                {issue.credits.map((c, i) => (
                  <li key={i} className="flex flex-col gap-1 border-t border-foreground/10 pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.rol}
                    </span>
                    <span className="font-display text-lg leading-tight">
                      {c.nombres}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        {/* NAV PREV/NEXT */}
        <nav className="mt-16 grid grid-cols-1 items-center gap-6 md:grid-cols-3">
          <div className="md:justify-self-start">
            {prev ? (
              <Link
                to="/revista/$number"
                params={{ number: String(prev.number) }}
                className="group block"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  ← Anterior
                </span>
                <p className="mt-1 font-display text-xl group-hover:text-[#B22234]">
                  N.º {String(prev.number).padStart(2, "0")} · {prev.title}
                </p>
              </Link>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
                — primer número —
              </span>
            )}
          </div>
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:justify-self-center"
          >
            Volver al archivo
          </Link>
          <div className="md:justify-self-end md:text-right">
            {next ? (
              <Link
                to="/revista/$number"
                params={{ number: String(next.number) }}
                className="group block"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Siguiente →
                </span>
                <p className="mt-1 font-display text-xl group-hover:text-[#B22234]">
                  N.º {String(next.number).padStart(2, "0")} · {next.title}
                </p>
              </Link>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
                — último número —
              </span>
            )}
          </div>
        </nav>
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
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)" }}
        aria-hidden
      />
    </div>
  );
}
