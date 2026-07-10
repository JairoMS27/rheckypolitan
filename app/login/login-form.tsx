"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HOME_PATH, postLoginDestination } from "@/lib/dashboard-paths";
import { evaluatePassword, passwordMeetsAllRules } from "@/lib/password";
import {
  normalizeUsername,
  USERNAME_MAX,
  USERNAME_MIN,
  validateUsername,
} from "@/lib/username";

type Mode = "login" | "register";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHint, setUsernameHint] = useState("");

  const passwordChecks = useMemo(() => evaluatePassword(password), [password]);
  const usernameFormatError = username.trim() ? validateUsername(username) : null;

  const safeNext = (() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  })();

  // Live username availability (debounced)
  useEffect(() => {
    if (mode !== "register") return;

    const raw = username.trim();
    if (!raw) {
      setUsernameStatus("idle");
      setUsernameHint("");
      return;
    }

    const formatErr = validateUsername(raw);
    if (formatErr) {
      setUsernameStatus("invalid");
      setUsernameHint(formatErr);
      return;
    }

    setUsernameStatus("checking");
    setUsernameHint("Comprobando disponibilidad…");

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username?u=${encodeURIComponent(raw)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          setUsernameStatus("idle");
          setUsernameHint(json.error ?? "No se pudo comprobar el usuario");
          return;
        }
        if (json.available) {
          setUsernameStatus("available");
          setUsernameHint(
            `Disponible · /u/${normalizeUsername(raw)}`,
          );
        } else {
          setUsernameStatus("taken");
          setUsernameHint(json.message ?? "Ese nombre de usuario ya está en uso");
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameHint("No se pudo comprobar el usuario");
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [username, mode]);

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
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

  async function onRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const unameErr = validateUsername(username);
    if (unameErr) {
      toast.error("Nombre de usuario inválido", { description: unameErr });
      return;
    }
    if (usernameStatus === "taken") {
      toast.error("Nombre de usuario no disponible", {
        description: "Elige otro; ese ya está pillado.",
      });
      return;
    }
    if (!displayName.trim()) {
      toast.error("Indica un nombre visible");
      return;
    }
    if (!passwordMeetsAllRules(password)) {
      toast.error("La contraseña no cumple los requisitos");
      return;
    }

    setLoading(true);
    try {
      // Final server-side check + create (avoids Supabase public /signup 429 email quota)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: normalizeUsername(username),
          displayName: displayName.trim(),
          redirectTo: safeNext ?? "/",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
        message?: string;
        needsConfirmation?: boolean;
        ok?: boolean;
      };

      if (!res.ok) {
        if (json.field === "username" || res.status === 409) {
          setUsernameStatus("taken");
          setUsernameHint(json.error ?? "Ese nombre de usuario ya está en uso");
        }
        if (res.status === 429) {
          toast.error("Demasiados intentos", {
            description:
              json.error ??
              "Espera unos minutos antes de volver a intentar el registro.",
          });
          return;
        }
        throw new Error(json.error ?? "No se pudo crear la cuenta");
      }

      if (json.needsConfirmation === false) {
        // Auto-confirmed projects: sign in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!signInError) {
          toast.success("Cuenta creada", {
            description: "¡Bienvenido/a a Rheckypolitan!",
          });
          router.replace(safeNext ?? postLoginDestination());
          router.refresh();
          return;
        }
      }

      toast.success("Revisa tu correo", {
        description:
          json.message ??
          "Te hemos enviado un enlace para confirmar la cuenta.",
      });
      setMode("login");
      setPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cuenta";
      toast.error("Error al registrarte", { description: message });
    } finally {
      setLoading(false);
    }
  }

  const usernameHintClass =
    usernameStatus === "available"
      ? "text-emerald-700 dark:text-emerald-400"
      : usernameStatus === "taken" || usernameStatus === "invalid"
        ? "text-[#B22234]"
        : "text-muted-foreground";

  const canSubmitRegister =
    !loading &&
    passwordMeetsAllRules(password) &&
    !usernameFormatError &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "checking" &&
    Boolean(username.trim()) &&
    Boolean(displayName.trim()) &&
    Boolean(email.trim());

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
        <h1 className="mt-2 font-display text-4xl leading-tight">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {mode === "login"
            ? "Entra con tu correo para publicar y comentar."
            : "Elige un nombre de usuario, cómo te verán los demás, y una contraseña segura."}
        </p>

        <div
          className="mt-8 grid grid-cols-2 border border-foreground/15"
          role="tablist"
          aria-label="Acceso o registro"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => setMode("login")}
            className={`py-2.5 font-mono text-[10px] uppercase tracking-widest transition ${
              mode === "login"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => setMode("register")}
            className={`py-2.5 font-mono text-[10px] uppercase tracking-widest transition ${
              mode === "register"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Registrarte
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={onLogin} className="mt-8 space-y-6">
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
        ) : (
          <form onSubmit={onRegister} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="username"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Nombre de usuario *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={USERNAME_MIN}
                maxLength={USERNAME_MAX}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                aria-invalid={
                  usernameStatus === "taken" || usernameStatus === "invalid"
                }
                className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
                placeholder="john_bourbon"
              />
              <p className={`mt-1.5 text-xs ${usernameHintClass}`} aria-live="polite">
                {usernameHint ||
                  (usernameFormatError
                    ? usernameFormatError
                    : `Tu perfil público: /u/${normalizeUsername(username) || "usuario"}`)}
              </p>
            </div>

            <div>
              <label
                htmlFor="display-name"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Nombre visible *
              </label>
              <input
                id="display-name"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
                placeholder="John Bourbon"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Así te verán en comentarios y firmas.
              </p>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Correo *
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
                placeholder="tunombre@correo.com"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Contraseña *
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border-b border-foreground/30 bg-transparent py-3 font-display text-lg outline-none transition focus:border-[#B22234]"
                placeholder="Elige una contraseña segura"
              />
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.id}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      !password
                        ? "text-muted-foreground"
                        : rule.ok
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-[#B22234]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        !password
                          ? "border-foreground/20"
                          : rule.ok
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-[#B22234]/40"
                      }`}
                      aria-hidden
                    >
                      {password && rule.ok ? "✓" : ""}
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              disabled={!canSubmitRegister}
              className="w-full border border-foreground bg-foreground py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-50"
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href={HOME_PATH} className="underline underline-offset-2 hover:text-[#B22234]">
            Volver al archivo
          </Link>
        </p>
      </div>
    </main>
  );
}
