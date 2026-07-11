"use client";

import Link from "next/link";
import { SECTIONS } from "@/lib/sections";
import { UserMenu } from "@/components/user-menu";

type Props = {
  /** Highlight current section path, e.g. "/actualidad" */
  activePath?: string;
  /** Show compact masthead (smaller title) for inner pages */
  compact?: boolean;
};

function todayLine() {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Shared public masthead — same newspaper language as the homepage.
 */
export function SiteHeader({ activePath, compact = false }: Props) {
  return (
    <>
      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #B22234 0 10px, #ffffff 10px 20px)",
        }}
        aria-hidden
      />

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
          <div
            className={`mx-auto max-w-[1400px] px-5 text-center md:px-8 ${
              compact ? "py-4 md:py-5" : "py-6 md:py-8"
            }`}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-[#B22234]">
              ★ Cartas desde Kentucky ★
            </p>
            <Link
              href="/"
              className={`mt-2 inline-block font-display font-semibold leading-none tracking-tight ${
                compact ? "text-[clamp(2rem,7vw,3.5rem)]" : "text-[clamp(2.75rem,10vw,5.5rem)]"
              }`}
            >
              Rheckypolitan
            </Link>
            {!compact && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Crónicas · Ensayos · Postales editoriales
              </p>
            )}
          </div>
        </div>

        <nav aria-label="Secciones" className="overflow-x-auto">
          <ul className="mx-auto flex min-w-max max-w-[1400px] items-center justify-center gap-1 px-4 py-2.5 md:gap-0 md:px-8">
            {SECTIONS.map((s, i) => {
              const active = activePath === s.path;
              return (
                <li key={s.path} className="flex items-center">
                  {i > 0 && (
                    <span className="mx-1 hidden text-foreground/15 md:inline" aria-hidden>
                      |
                    </span>
                  )}
                  <Link
                    href={s.path}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition md:px-4 ${
                      active
                        ? "bg-[#B22234] text-white"
                        : "text-muted-foreground hover:bg-[#B22234] hover:text-white"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
}
