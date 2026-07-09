import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-3xl">Rheckypolitan</Link>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Panel de administración
        </p>

        {/* American flag stripe band */}
        <div
          className="mt-6 h-2 w-full rounded-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
          }}
          aria-hidden
        />
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-3 w-8"
            style={{
              backgroundColor: "#3C3B6E",
              backgroundImage:
                "radial-gradient(circle, #ffffff 0.5px, transparent 0.6px)",
              backgroundSize: "4px 4px",
            }}
            aria-hidden
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Members only · Est. 2026
          </span>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email" className="text-[11px] uppercase tracking-widest">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-[11px] uppercase tracking-widest">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : "Entrar"}
          </Button>
        </form>

        <div
          className="mt-8 h-1.5 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, #B22234 0 1.5px, #ffffff 1.5px 3px)",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
