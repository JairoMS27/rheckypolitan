"use client";

import Link from "next/link";
import { openCookieSettings } from "@/lib/cookie-consent";
import { SECTIONS } from "@/lib/sections";

type Props = {
  /** Wider max width for section pages */
  wide?: boolean;
  className?: string;
};

/**
 * Shared public footer — same structure as the homepage masthead edition.
 */
export function SiteFooter({ wide = false, className = "" }: Props) {
  const max = wide ? "max-w-[1600px]" : "max-w-[1400px]";

  return (
    <>
      <footer className={`border-t border-foreground ${className}`.trim()}>
        <div className={`mx-auto ${max} px-5 py-10 md:px-8`}>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="font-display text-2xl">Rheckypolitan</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Revista digital y archivo de crónicas desde Kentucky.
              </p>
            </div>

            <div className="md:col-span-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Secciones
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {SECTIONS.map((s) => (
                  <li key={s.path}>
                    <Link
                      href={s.path}
                      className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Lectura
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/feed"
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Mi feed
                  </Link>
                </li>
                <li>
                  <Link
                    href="/publicar"
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Publicar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Acceso
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 md:text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Legal
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/terminos"
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Términos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacidad"
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Privacidad
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCookieSettings()}
                    className="font-mono text-[11px] uppercase tracking-widest text-foreground/70 hover:text-[#B22234]"
                  >
                    Cookies
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>© {new Date().getFullYear()} Rheckypolitan</span>
            <span className="flex items-center gap-2">
              <span>★</span>
              <span>Impreso en la red</span>
              <span>★</span>
            </span>
          </div>
        </div>
      </footer>

      <div
        className="h-1.5 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #B22234 0 10px, #ffffff 10px 20px)",
        }}
        aria-hidden
      />
    </>
  );
}
