"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IssueCover } from "@/components/issue-cover";
import { SiteFooter } from "@/components/site-footer";
import { UserMenu } from "@/components/user-menu";
import { publicUrl } from "@/lib/storage";

export type IssueMeta = {
  number: number;
  title: string;
  subtitle: string | null;
  published_at: string;
} | null;

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
  return new Date(d).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RevistaPage({ number, meta }: { number: string; meta?: IssueMeta }) {
  const [issue, setIssue] = useState<Issue | null | undefined>(undefined);
  const [allIssues, setAllIssues] = useState<Issue[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: list } = await supabase
        .from("issues")
        .select(
          "id,number,title,published_at,cover_path,subtitle,summary,quotes,credits,show_quotes",
        )
        .order("number", { ascending: false });
      setAllIssues((list ?? []) as unknown as Issue[]);
      const found = (list?.find((i) => i.number === Number(number)) ??
        null) as unknown as Issue | null;
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">★ Archivo</p>
        <p className="mt-3 font-display text-4xl">Número no encontrado</p>
        <Link
          href="/"
          className="mt-8 font-mono text-[11px] uppercase tracking-widest underline-offset-4 hover:underline"
        >
          Volver al archivo →
        </Link>
      </div>
    );
  }

  const numFmt = String(issue.number).padStart(2, "0");
  void meta;
  const summary = issue.summary ?? [];
  const quotes = issue.quotes ?? [];
  const credits = issue.credits ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground transition hover:text-[#B22234]"
          >
            ← Archivo
          </Link>
          <Link href="/" className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            Rheckypolitan
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:inline">
              N.º {numFmt}
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main>
        {/* Hero split: cover full height + issue meta */}
        <section className="border-b border-foreground/15">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12 lg:items-stretch">
            {/* Cover column */}
            <div className="relative min-h-[420px] bg-muted lg:col-span-5 lg:min-h-[min(85vh,780px)] xl:col-span-6">
              <Link
                href={`/revista/${number}/leer`}
                className="group absolute inset-0 block overflow-hidden"
                aria-label={`Leer N.º ${numFmt}`}
              >
                {issue.cover_path ? (
                  <Image
                    src={publicUrl(issue.cover_path)}
                    alt={`Portada N.º ${numFmt}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                    <span className="font-display text-[10rem] text-background/15">{numFmt}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/80">
                  <span>Portada original</span>
                  <span className="border border-white/40 bg-white/10 px-3 py-1.5 backdrop-blur-sm transition group-hover:border-white group-hover:bg-white group-hover:text-foreground">
                    Abrir revista →
                  </span>
                </div>
              </Link>
            </div>

            {/* Meta column */}
            <div className="flex flex-col justify-between border-t border-foreground/10 lg:col-span-7 lg:border-t-0 xl:col-span-6">
              <div className="p-6 md:p-10 lg:p-12">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#B22234] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                    Edición
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {formatLongDate(issue.published_at)}
                  </span>
                </div>

                <div className="mt-6 flex items-end gap-4">
                  <span className="font-display text-[clamp(4.5rem,14vw,9rem)] font-black leading-[0.8] text-[#B22234]">
                    {numFmt}
                  </span>
                  <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Número
                  </span>
                </div>

                <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[0.95] tracking-tight">
                  {issue.title}
                </h1>

                {issue.subtitle && (
                  <p className="mt-6 max-w-lg whitespace-pre-line text-base leading-relaxed text-foreground/75 md:text-lg">
                    {issue.subtitle}
                  </p>
                )}

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/revista/${number}/leer`}
                    className="inline-flex items-center gap-3 border border-foreground bg-foreground px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                  >
                    Leer número →
                  </Link>
                  <Link
                    href="/#archivo"
                    className="border border-foreground/20 px-5 py-3.5 font-mono text-[11px] uppercase tracking-widest transition hover:border-foreground"
                  >
                    Ver archivo
                  </Link>
                </div>
              </div>

              {/* Mini nav prev/next inside hero */}
              <div className="mt-auto grid grid-cols-2 border-t border-foreground/15">
                <div className="border-r border-foreground/15 p-5 md:p-6">
                  {prev ? (
                    <Link href={`/revista/${prev.number}`} className="group block">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        ← Anterior
                      </span>
                      <p className="mt-1 font-display text-base leading-tight group-hover:text-[#B22234] md:text-lg">
                        N.º {String(prev.number).padStart(2, "0")} · {prev.title}
                      </p>
                    </Link>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
                      — primer número —
                    </span>
                  )}
                </div>
                <div className="p-5 text-right md:p-6">
                  {next ? (
                    <Link href={`/revista/${next.number}`} className="group block">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        Siguiente →
                      </span>
                      <p className="mt-1 font-display text-base leading-tight group-hover:text-[#B22234] md:text-lg">
                        N.º {String(next.number).padStart(2, "0")} · {next.title}
                      </p>
                    </Link>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
                      — último número —
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary / table of contents */}
        {summary.length > 0 && (
          <section className="border-b border-foreground/15">
            <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
              <div className="mb-10 grid grid-cols-1 items-end gap-6 md:grid-cols-12">
                <div className="md:col-span-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                    ★ Sumario
                  </p>
                  <h2 className="mt-2 font-display text-3xl leading-tight md:text-5xl">
                    Lo que hay dentro
                  </h2>
                </div>
                <div className="md:col-span-4 md:text-right">
                  <Link
                    href={`/revista/${number}/leer`}
                    className="inline-flex font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-[#B22234] hover:underline"
                  >
                    Empezar a leer →
                  </Link>
                </div>
              </div>

              <ol className="border border-foreground/15">
                {summary.map((s, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-12 items-baseline gap-3 border-b border-foreground/10 px-4 py-5 last:border-b-0 transition hover:bg-muted/30 md:gap-6 md:px-6"
                  >
                    <span className="col-span-2 font-display text-2xl text-[#B22234] md:text-4xl">
                      {s.p || String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="col-span-10 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:col-span-3">
                      {s.section || "Sección"}
                    </span>
                    <span className="col-span-12 font-display text-lg leading-snug md:col-span-7 md:text-xl">
                      {s.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Quotes */}
        {issue.show_quotes !== false && quotes.length > 0 && (
          <section className="border-b border-foreground/15 bg-muted/20">
            <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Citas
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                Fragmentos del número
              </h2>
              <div className="mt-10 grid grid-cols-1 gap-0 border border-foreground/15 md:grid-cols-2">
                {quotes.map((c, idx) => (
                  <blockquote
                    key={idx}
                    className={`relative bg-background p-7 md:p-9 ${
                      idx % 2 === 0 ? "md:border-r md:border-foreground/15" : ""
                    } ${idx < quotes.length - 1 ? "border-b border-foreground/15" : ""} ${
                      idx < quotes.length - (quotes.length % 2 === 0 ? 2 : 1)
                        ? "md:border-b"
                        : "md:border-b-0"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="font-display text-6xl leading-none text-[#B22234]/35"
                    >
                      “
                    </span>
                    <p className="-mt-3 font-display text-xl italic leading-snug md:text-2xl">
                      {c.text}
                    </p>
                    <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span className="text-foreground">— {c.author}</span>
                      {c.where ? <span>{c.where}</span> : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Credits */}
        {credits.length > 0 && (
          <section className="border-b border-foreground/15">
            <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                    ★ Créditos
                  </p>
                  <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                    Quién lo hizo posible
                  </h2>
                </div>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2 lg:col-span-8">
                  {credits.map((c, i) => (
                    <li
                      key={i}
                      className="border-t border-foreground/10 py-4 first:border-t sm:first:border-t"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {c.rol}
                      </span>
                      <p className="mt-1 font-display text-lg leading-tight">{c.nombres}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* CTA strip */}
        <section className="bg-foreground text-background">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-5 py-12 md:flex-row md:items-center md:px-8 md:py-14">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-background/50">
                ★ Listo para hojear
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                N.º {numFmt} · {issue.title}
              </h2>
            </div>
            <Link
              href={`/revista/${number}/leer`}
              className="inline-flex items-center gap-3 border border-background bg-background px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground transition hover:border-[#ff8a8a] hover:bg-[#ff8a8a]"
            >
              Abrir el número →
            </Link>
          </div>
        </section>

        {/* More issues */}
        {allIssues && allIssues.length > 1 && (
          <section>
            <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-16">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                    ★ También en el archivo
                  </p>
                  <h2 className="mt-2 font-display text-3xl md:text-4xl">Otros números</h2>
                </div>
                <Link
                  href="/#archivo"
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                >
                  Ver todos →
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {allIssues
                  .filter((i) => i.number !== issue.number)
                  .slice(0, 5)
                  .map((i) => (
                    <li key={i.id}>
                      <Link href={`/revista/${i.number}`} className="group block">
                        <IssueCover number={i.number} coverPath={i.cover_path} />
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[#B22234]">
                          N.º {String(i.number).padStart(2, "0")}
                        </p>
                        <p className="mt-0.5 font-display text-base leading-tight group-hover:text-[#B22234] md:text-lg">
                          {i.title}
                        </p>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
