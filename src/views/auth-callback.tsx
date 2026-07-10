"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { HOME_PATH } from "@/lib/dashboard-paths";

function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return HOME_PATH;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const code = searchParams.get("code");
      const next = safeRedirect(searchParams.get("redirect") ?? searchParams.get("next"));

      try {
        // Preferred path: email links point to /auth/callback?token_hash=…&type=signup
        if (tokenHash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (otpError) throw otpError;
          if (!cancelled) {
            setStatus("success");
            router.replace(next);
            router.refresh();
          }
          return;
        }

        // OAuth / PKCE code exchange
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (!cancelled) {
            setStatus("success");
            router.replace(next);
            router.refresh();
          }
          return;
        }

        // Hash fragment tokens (legacy verify redirect)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          // supabase-js picks these up via detectSessionInUrl
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (data.session) {
            if (!cancelled) {
              setStatus("success");
              router.replace(next);
              router.refresh();
            }
            return;
          }
        }

        // Already signed in
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) {
            setStatus("success");
            router.replace(next);
            router.refresh();
          }
          return;
        }

        // Wait briefly for onAuthStateChange (magic-link hash parse)
        await new Promise((r) => setTimeout(r, 1500));
        const again = await supabase.auth.getSession();
        if (again.data.session) {
          if (!cancelled) {
            setStatus("success");
            router.replace(next);
            router.refresh();
          }
          return;
        }

        throw new Error(
          "No se pudo verificar la sesión. El enlace puede haber expirado o ya se usó.",
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Error al confirmar el correo";
        setError(message);
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-[#B22234]/20 bg-[#B22234]/5">
          <span className="text-3xl">✕</span>
        </div>
        <p className="font-display text-xl">{error}</p>
        <Link
          href="/login"
          className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234] underline underline-offset-2"
        >
          Volver a iniciar sesión →
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <div
          className="h-2 w-full max-w-md"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)",
          }}
          aria-hidden
        />
        <div className="mx-auto my-8 flex h-16 w-16 items-center justify-center border border-[#B22234]/30 bg-[#B22234]/5">
          <span className="text-3xl">✓</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Cuenta verificada
        </span>
        <h1 className="mt-2 font-display text-3xl leading-tight">Ya estás dentro</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Redirigiendo al archivo…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-5 w-5 animate-spin border-2 border-foreground/20 border-t-[#B22234]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Verificando correo…
        </p>
      </div>
    </div>
  );
}

export function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
