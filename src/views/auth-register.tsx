"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/** Legacy /auth/register → unified login with register tab. */
function AuthRegisterRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || searchParams.get("next");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", "register");
    if (redirect) params.set("next", redirect);
    router.replace(`/login?${params.toString()}`);
  }, [router, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
      Redirigiendo al registro…
    </div>
  );
}

export function AuthRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">Cargando…</div>
      }
    >
      <AuthRegisterRedirect />
    </Suspense>
  );
}
