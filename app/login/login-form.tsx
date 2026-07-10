"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HOME_PATH, postLoginDestination } from "@/lib/dashboard-paths";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No se pudo iniciar sesión");

      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      // Always home for role-entry login; honor safe ?next= for deep links (e.g. /publicar).
      const destination = safeNext ?? postLoginDestination();
      router.replace(destination);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      toast.error("Acceso denegado", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />

      <div className="mx-auto flex min-h-[calc(100vh-8px)] w-full max-w-md flex-col justify-center px-6 py-16">
        <Link
          href={HOME_PATH}
          className="mb-10 font-display text-3xl font-semibold tracking-tight hover:text-[#B22234]"
        >
          Rheckypolitan
        </Link>

        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          Acceso
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Iniciar sesión</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Entra con tu correo. Después podrás publicar artículos desde tu perfil.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
              placeholder="tunombre@correo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
              placeholder="Tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-foreground bg-foreground py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-50"
          >
            {loading ? "Comprobando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href={HOME_PATH} className="underline underline-offset-2 hover:text-[#B22234]">
            Volver al archivo
          </Link>
        </p>
      </div>
    </main>
  );
}
