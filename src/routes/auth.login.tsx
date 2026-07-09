import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: AuthLoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
});

function AuthLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { redirect } = useSearch({ from: "/auth/login" });
  const navigate = useNavigate();

  // If the magic link is opened in another tab, Supabase persists the session
  // in localStorage and broadcasts SIGNED_IN to this tab. Redirect when it happens.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: redirect as any });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Enlace enviado", {
        description: "Revisa tu bandeja de entrada.",
      });
    } catch (err: any) {
      toast.error("Error al enviar el enlace", {
        description: err?.message ?? "Inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />

      <div className="flex min-h-[calc(100vh-8px)] flex-col items-center justify-center px-6">
        <Link
          to="/"
          className="mb-12 font-display text-3xl font-semibold tracking-tight"
        >
          Rheckypolitan
        </Link>

        <div className="w-full max-w-sm">
          {!sent ? (
            <>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Acceso
              </span>
              <h1 className="mt-2 font-display text-3xl leading-tight">
                Iniciar sesión
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Te enviaremos un enlace mágico a tu correo.
                Sin contraseñas, sin complicaciones.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="login-email"
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                  >
                    Tu correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tunombre@correo.com"
                    className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg text-foreground placeholder:text-foreground/30 focus:border-[#B22234] focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:bg-[#B22234] hover:border-[#B22234] disabled:opacity-60"
                >
                  {loading ? "Enviando…" : "Enviar enlace mágico →"}
                </button>
              </form>

              <div className="mt-8 border-t border-foreground/10 pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  ¿Aún no tienes cuenta?{" "}
                  <Link
                    to="/auth/register"
                    search={{ redirect }}
                    className="font-medium text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
                  >
                    Regístrate
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-[#B22234]/20 bg-[#B22234]/5">
                <span className="text-3xl">✉</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                ★ Enlace enviado
              </span>
              <h1 className="mt-2 font-display text-3xl leading-tight">
                Revisa tu correo
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Hemos enviado un enlace mágico a{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Haz clic en el enlace para iniciar sesión.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground underline underline-offset-2 hover:text-[#B22234]"
              >
                ← Usar otro correo
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>★</span>
          <span>Rheckypolitan</span>
          <span>★</span>
        </div>
      </div>
    </div>
  );
}
