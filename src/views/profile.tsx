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
import { toast } from "sonner";

export function ProfilePage() {
  const { user, isAdmin, isRedactor, loading: authLoading } = useAuth();
  const isStaff = isAdmin || isRedactor;
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setLoading(false);
      });
  }, [user, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), avatar_url: avatarUrl })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Perfil actualizado");
    } catch (err: any) {
      toast.error("Error al guardar", { description: err?.message });
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
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      const url = signed.signedUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast.success("Foto de perfil actualizada");
    } catch (err: any) {
      toast.error("Error al subir la foto", { description: err?.message });
    } finally {
      setUploading(false);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="h-2 w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
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
        <h1 className="mt-2 font-display text-4xl leading-tight">Mi perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>

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
        <p className="mt-3 text-xs text-muted-foreground">
          Los artículos se publican en <span className="font-mono">/publicar</span>. Las revistas
          solo se gestionan en el panel de administración.
        </p>

        <form onSubmit={handleSave} className="mt-10 space-y-8">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Foto de perfil
            </label>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden border border-foreground/15 bg-foreground">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
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
                  className="border border-foreground bg-foreground px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition hover:bg-[#B22234] hover:border-[#B22234] disabled:opacity-50"
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
              htmlFor="display-name"
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            >
              Nickname
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
              Así aparecerás en tus comentarios y artículos.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="w-full border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background transition hover:bg-[#B22234] hover:border-[#B22234] disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar cambios →"}
          </button>
        </form>
      </div>
    </div>
  );
}
