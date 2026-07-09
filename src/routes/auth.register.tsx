import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/register")({
  component: AuthRegisterPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
});

function AuthRegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { redirect } = useSearch({ from: "/auth/register" });
  const navigate = useNavigate();

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
    if (!email.trim() || !displayName.trim() || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          data: {
            display_name: displayName.trim(),
          },
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Enlace enviado", {
        description: "Revisa tu bandeja de entrada para completar el registro.",
      });
    } catch (err: any) {
      toast.error("Error al registrarse", {
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
                ★ Nuevo lector
              </span>
              <h1 className="mt-2 font-display text-3xl leading-tight">
                Crear cuenta
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Únete a la comunidad de Rheckypolitan.
                Comenta artículos y participa en la conversación.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="register-name"
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                  >
                    Tu nombre
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    required
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Bourbon"
                    className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg text-foreground placeholder:text-foreground/30 focus:border-[#B22234] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="register-email"
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                  >
                    Tu correo electrónico
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    required
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
                  {loading ? "Enviando…" : "Crear cuenta →"}
                </button>
              </form>

              <div className="mt-8 border-t border-foreground/10 pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    to="/auth/login"
                    search={{ redirect }}
                    className="font-medium text-[#B22234] underline underline-offset-2 hover:text-[#8B1A29]"
                  >
                    Inicia sesión
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
                ★ Registro completado
              </span>
              <h1 className="mt-2 font-display text-3xl leading-tight">
                Revisa tu correo
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Hemos enviado un enlace a{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Haz clic para verificar tu cuenta y empezar a comentar.
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
