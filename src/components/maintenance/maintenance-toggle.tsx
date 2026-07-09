"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MaintenanceToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;

    try {
      const res = await fetch("/api/admin/maintenance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { maintenance_mode: boolean };
      setEnabled(json.maintenance_mode);
    } catch {
      setEnabled(false);
    }
  }

  async function toggle() {
    if (enabled === null || loading) return;
    setLoading(true);
    const next = !enabled;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      toast.error("Sesión expirada");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo cambiar el modo");
      }
      setEnabled(Boolean(json.maintenance_mode));
      toast.success(
        json.maintenance_mode
          ? "Mantenimiento activado — el archivo público está cerrado"
          : "Mantenimiento desactivado — el sitio vuelve a estar abierto",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (enabled === null) return null;

  return (
    <Button
      type="button"
      variant={enabled ? "default" : "outline"}
      size="sm"
      disabled={loading}
      onClick={toggle}
      className={
        enabled
          ? "border-[#B22234] bg-[#B22234] font-mono text-[10px] uppercase tracking-widest hover:bg-[#8B1A29]"
          : "font-mono text-[10px] uppercase tracking-widest"
      }
    >
      {loading ? "…" : enabled ? "Mantenimiento ON" : "Mantenimiento"}
    </Button>
  );
}