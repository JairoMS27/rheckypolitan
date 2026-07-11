"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  applyConsentSideEffects,
  defaultConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  readConsentFromStorage,
  saveConsent,
  trackPageView,
  type CookieConsent,
} from "@/lib/cookie-consent";

/**
 * First-visit cookie banner + settings panel.
 * Essential always on; analytics is optional first-party telemetry.
 */
export function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentFromStorage();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      applyConsentSideEffects(existing);
      setOpen(false);
    } else {
      setOpen(true);
    }
    setReady(true);

    const onOpenSettings = () => {
      const c = readConsentFromStorage();
      if (c) {
        setAnalytics(c.analytics);
        setMarketing(c.marketing);
      }
      setPanel(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);

    const onPath = () => trackPageView();
    window.addEventListener("popstate", onPath);

    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
      window.removeEventListener("popstate", onPath);
    };
  }, []);

  // Track client navigations lightly when consent allows
  useEffect(() => {
    if (!ready) return;
    trackPageView();
  }, [ready]);

  const persist = useCallback((next: CookieConsent) => {
    saveConsent(next);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setOpen(false);
    setPanel(false);
  }, []);

  const acceptAll = () =>
    persist(
      defaultConsent({
        analytics: true,
        marketing: true,
        decidedAt: new Date().toISOString(),
      }),
    );

  const essentialsOnly = () =>
    persist(
      defaultConsent({
        analytics: false,
        marketing: false,
        decidedAt: new Date().toISOString(),
      }),
    );

  const saveCustom = () =>
    persist(
      defaultConsent({
        analytics,
        marketing,
        decidedAt: new Date().toISOString(),
      }),
    );

  if (!ready || !open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
    >
      <div className="mx-auto max-w-3xl border border-foreground bg-background shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
        <div
          className="h-1 w-full"
          style={{
            backgroundImage: "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)",
          }}
          aria-hidden
        />

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ Privacidad
          </p>
          <h2
            id="cookie-banner-title"
            className="mt-2 font-display text-2xl leading-tight sm:text-3xl"
          >
            {panel ? "Preferencias de cookies" : "Usamos cookies (y sentido común)"}
          </h2>
          <p id="cookie-banner-desc" className="mt-3 text-sm leading-relaxed text-foreground/75">
            {panel
              ? "Elige qué categorías permites. Las esenciales no se pueden desactivar: mantienen la sesión y la seguridad del sitio."
              : "Necesitamos cookies esenciales para que la web funcione (sesión, preferencias, seguridad). Si aceptas, también medimos visitas de forma anónima y de primera parte — sin vender tus datos a terceros."}
          </p>

          {panel && (
            <ul className="mt-5 space-y-3 border border-foreground/10 p-4">
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest">Esenciales</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Login, consentimiento, mantenimiento y anti-abuso. Siempre activas.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-[#B22234]">
                  On
                </span>
              </li>
              <li className="flex items-start justify-between gap-4 border-t border-foreground/10 pt-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest">Analítica</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Identificador de visitante y recuento de páginas en este dispositivo. Nos ayuda
                    a saber qué se lee.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="sr-only">Activar analítica</span>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="h-4 w-4 accent-[#B22234]"
                  />
                </label>
              </li>
              <li className="flex items-start justify-between gap-4 border-t border-foreground/10 pt-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest">Marketing</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reservado para futuras campañas o atribución. Hoy no cargamos píxeles de
                    terceros.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="sr-only">Activar marketing</span>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="h-4 w-4 accent-[#B22234]"
                  />
                </label>
              </li>
            </ul>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Más detalle en{" "}
            <Link href="/privacidad" className="underline underline-offset-2 hover:text-[#B22234]">
              Privacidad
            </Link>{" "}
            y{" "}
            <Link href="/terminos" className="underline underline-offset-2 hover:text-[#B22234]">
              Términos
            </Link>
            .
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {panel ? (
              <>
                <button
                  type="button"
                  onClick={saveCustom}
                  className="border border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                >
                  Guardar preferencias
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="border border-foreground/25 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition hover:border-foreground"
                >
                  Aceptar todo
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(false)}
                  className="px-2 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Atrás
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="border border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234]"
                >
                  Aceptar todo
                </button>
                <button
                  type="button"
                  onClick={essentialsOnly}
                  className="border border-foreground/25 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition hover:border-foreground"
                >
                  Solo esenciales
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(true)}
                  className="px-2 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Configurar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
