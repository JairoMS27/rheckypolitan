"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const markDone = () => setStatus("success");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        markDone();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markDone();
    });

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          markDone();
        } else {
          setError("No se pudo verificar la sesión. El enlace puede haber expirado.");
          setStatus("error");
        }
      });
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-background text-foreground">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-[#B22234]/20 bg-[#B22234]/5">
          <span className="text-3xl">✕</span>
        </div>
        <p className="font-display text-xl">{error}</p>
        <a
          href="/login"
          className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234] underline underline-offset-2"
        >
          Volver a iniciar sesión →
        </a>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-6 text-center">
        <div
          className="h-2 w-full max-w-md"
          style={{
            backgroundImage: "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)",
          }}
          aria-hidden
        />
        <div className="mx-auto my-8 flex h-16 w-16 items-center justify-center border border-[#B22234]/30 bg-[#B22234]/5">
          <span className="text-3xl">✓</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Sesión iniciada
        </span>
        <h1 className="mt-2 font-display text-3xl leading-tight">Ya puedes cerrar esta pestaña</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Te hemos iniciado sesión en la pestaña donde pediste el enlace. Vuelve allí para seguir
          leyendo.
        </p>
        <button
          onClick={() => window.close()}
          className="mt-8 border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:bg-[#B22234] hover:border-[#B22234]"
        >
          Cerrar pestaña
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-5 w-5 animate-spin border-2 border-foreground/20 border-t-[#B22234]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Verificando sesión…
        </p>
      </div>
    </div>
  );
}
