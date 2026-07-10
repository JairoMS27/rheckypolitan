"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ADMIN_DASHBOARD_PATH,
  authorPostNewPath,
  authorPostsListPath,
} from "@/lib/dashboard-paths";
import {
  normalizeUsername,
  profilePath,
  validateUsername,
} from "@/lib/username";
import { isUsernameAvailable } from "@/lib/profiles";
import { toast } from "sonner";

type Tab = "profile" | "account";

export function ProfilePage() {
  const { user, isAdmin, isRedactor, loading: authLoading } = useAuth();
  const isStaff = isAdmin || isRedactor;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/profile");
      return;
    }
    setNewEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "");
        setUsername(data?.username ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setBio(data?.bio ?? "");
        setLoading(false);
      });
  }, [user, authLoading, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim() || saving) return;

    const usernameError = validateUsername(username);
    if (usernameError) {
      toast.error("Nombre de usuario no válido", { description: usernameError });
      return;
    }

    const available = await isUsernameAvailable(username, user.id);
    if (!available) {
      toast.error("Nombre de usuario no disponible", {
        description: "Ese @ ya está en uso. Prueba con otro.",
      });
      return;
    }

    if (bio.length > 280) {
      toast.error("La biografía es demasiado larga", {
        description: "Máximo 280 caracteres.",
      });
      return;
    }

    const normalized = normalizeUsername(username);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          username: normalized,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") {
          throw new Error("Ese nombre de usuario ya está en uso.");
        }
        throw error;
      }
      setUsername(normalized);
      toast.success("Perfil actualizado");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      toast.error("Error al guardar", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // Public bucket — store stable public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(publicUrl);
      toast.success("Foto de perfil actualizada");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al subir";
      toast.error("Error al subir la foto", { description: message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || emailSaving) return;
    const email = newEmail.trim().toLowerCase();
    if (!email || email === user.email) {
      toast.error("Introduce un correo distinto al actual");
      return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success("Revisa tu bandeja", {
        description:
          "Te hemos enviado un enlace de confirmación al nuevo correo (y a veces al actual).",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo cambiar";
      toast.error("Error al cambiar el correo", { description: message });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || passwordSaving) return;
    if (newPassword.length < 8) {
      toast.error("Contraseña demasiado corta", {
        description: "Usa al menos 8 caracteres.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo cambiar";
      toast.error("Error al cambiar la contraseña", { description: message });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin border-2 border-foreground/20 border-t-[#B22234]" />
      </div>
    );
  }

  const initials = (displayName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const publicHref = profilePath(username);

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
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[#B22234]"
        >
          ← Volver
        </Link>
        <span className="mt-8 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
          ★ Tu cuenta
        </span>
        <h1 className="mt-2 font-display text-4xl leading-tight">Ajustes</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
        {publicHref && (
          <Link
            href={publicHref}
            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-[#B22234] hover:underline"
          >
            Ver perfil público →
          </Link>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href={authorPostNewPath()}
            className="border border-[#B22234] bg-[#B22234] px-4 py-4 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-[#8B1A29]"
          >
            ✎ Publicar artículo
          </Link>
          <Link
            href={authorPostsListPath()}
            className="border border-foreground/20 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-widest transition hover:border-foreground hover:bg-muted"
          >
            Mis artículos
          </Link>
          {isStaff && (
            <Link
              href={ADMIN_DASHBOARD_PATH}
              className="border border-foreground/20 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-widest transition hover:border-foreground hover:bg-muted sm:col-span-2"
            >
              {isAdmin ? "Panel admin · revistas y staff" : "Panel staff"}
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-10 flex border-b border-foreground/15">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`flex-1 border-b-2 px-3 py-3 font-mono text-[10px] uppercase tracking-widest transition ${
              tab === "profile"
                ? "border-[#B22234] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Personalización
          </button>
          <button
            type="button"
            onClick={() => setTab("account")}
            className={`flex-1 border-b-2 px-3 py-3 font-mono text-[10px] uppercase tracking-widest transition ${
              tab === "account"
                ? "border-[#B22234] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Correo y contraseña
          </button>
        </div>

        {tab === "profile" ? (
          <form onSubmit={handleSaveProfile} className="mt-8 space-y-8">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Foto de perfil
              </label>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden border border-foreground/15 bg-foreground">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xl font-bold text-background">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="border border-foreground bg-foreground px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-50"
                  >
                    {uploading ? "Subiendo…" : avatarUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        await supabase
                          .from("profiles")
                          .update({ avatar_url: null })
                          .eq("id", user.id);
                        setAvatarUrl(null);
                      }}
                      className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B22234]"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Nombre de usuario
              </label>
              <div className="mt-2 flex items-center border-b border-foreground/30 focus-within:border-[#B22234]">
                <span className="select-none font-mono text-sm text-muted-foreground">
                  @
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, ""),
                    )
                  }
                  maxLength={30}
                  className="w-full bg-transparent px-1 py-3 font-display text-lg focus:outline-none"
                  placeholder="tu_nombre"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Único en Rheckypolitan. 3–30 caracteres: letras, números y _.
              </p>
            </div>

            <div>
              <label
                htmlFor="display-name"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Nombre visible
              </label>
              <input
                id="display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg focus:border-[#B22234] focus:outline-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Así aparecerás en comentarios y artículos.
              </p>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                Biografía
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 280))}
                rows={3}
                maxLength={280}
                placeholder="Una línea sobre ti…"
                className="mt-2 w-full resize-none border border-foreground/15 bg-transparent px-3 py-3 text-sm leading-relaxed focus:border-[#B22234] focus:outline-none"
              />
              <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                {bio.length}/280
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !displayName.trim() || !username.trim()}
              className="w-full border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar perfil →"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-12">
            <form onSubmit={handleChangeEmail} className="space-y-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Correo
                </span>
                <h2 className="mt-2 font-display text-2xl">Cambiar correo</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Actual: <span className="text-foreground">{user?.email}</span>
                </p>
              </div>
              <div>
                <label
                  htmlFor="new-email"
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Nuevo correo
                </label>
                <input
                  id="new-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg focus:border-[#B22234] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={emailSaving}
                className="w-full border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-60"
              >
                {emailSaving ? "Enviando…" : "Actualizar correo →"}
              </button>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="space-y-5 border-t border-foreground/10 pt-10"
            >
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
                  ★ Seguridad
                </span>
                <h2 className="mt-2 font-display text-2xl">Contraseña</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Establece o cambia la contraseña de tu cuenta.
                </p>
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg focus:border-[#B22234] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full border-b border-foreground/30 bg-transparent px-1 py-3 font-display text-lg focus:border-[#B22234] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:border-[#B22234] hover:bg-[#B22234] disabled:opacity-60"
              >
                {passwordSaving ? "Guardando…" : "Actualizar contraseña →"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
