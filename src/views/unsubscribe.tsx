"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type UnsubscribeData =
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "error" }
  | { state: "done"; already: boolean; email: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 h-1.5 w-full bg-[repeating-linear-gradient(to_right,#B22234_0_8px,transparent_8px_16px)]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          ✉ Cartas desde Kentucky
        </p>
        <div className="mt-4">{children}</div>
        <div className="mt-12 h-1.5 w-full bg-[repeating-linear-gradient(to_right,#B22234_0_8px,transparent_8px_16px)]" />
      </div>
    </main>
  );
}

export function UnsubscribePage({ data }: { data: UnsubscribeData }) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (data.state === "error") {
      setRetrying(true);
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");
      if (!token) return;
      fetch("/api/unsubscribe?token=" + encodeURIComponent(token), {
        method: "POST",
      }).finally(() => setRetrying(false));
    }
  }, [data.state]);

  if (data.state === "missing") {
    return (
      <Shell>
        <h1 className="font-display text-4xl">Falta el token</h1>
        <p className="mt-4 text-sm text-foreground/70">
          El enlace está incompleto. Abre el enlace original que recibiste en el correo.
        </p>
      </Shell>
    );
  }

  if (data.state === "invalid") {
    return (
      <Shell>
        <h1 className="font-display text-4xl">Enlace caducado</h1>
        <p className="mt-4 text-sm text-foreground/70">
          Este enlace ya no es válido. Si quieres dejar de recibir nuestras cartas, responde al
          último correo y lo gestionamos a mano.
        </p>
      </Shell>
    );
  }

  if (data.state === "error") {
    return (
      <Shell>
        <h1 className="font-display text-4xl">No hemos podido procesarlo</h1>
        <p className="mt-4 text-sm text-foreground/70">
          {retrying ? "Reintentando…" : "Inténtalo de nuevo en unos minutos."}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-4xl leading-tight">
        {data.already ? "Ya estabas dada de baja" : "Listo, te hemos dado de baja"}
      </h1>
      <p className="mt-4 text-sm text-foreground/70">
        {data.already
          ? `${data.email} ya no recibe nuestras Cartas desde Kentucky.`
          : `No volveremos a escribirte a ${data.email}. Si cambias de idea, siempre puedes volver a suscribirte desde la página principal.`}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-background hover:bg-[#B22234] hover:border-[#B22234]"
      >
        Volver a Rheckypolitan →
      </Link>
    </Shell>
  );
}
