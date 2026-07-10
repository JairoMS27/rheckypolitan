"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlipReader, type FlipPage } from "@/components/flip-reader";
import { supabase } from "@/integrations/supabase/client";

type Issue = { id: string; number: number; title: string };

export function RevistaLeerPage({ number }: { number: string }) {
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [pages, setPages] = useState<FlipPage[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: iss } = await supabase
        .from("issues")
        .select("id,number,title")
        .eq("number", Number(number))
        .maybeSingle();
      if (!iss) {
        setIssue(null);
        setPages([]);
        return;
      }
      setIssue(iss);
      const { data: pg } = await supabase
        .from("pages")
        .select("index,image_path")
        .eq("issue_id", iss.id)
        .order("index");
      setPages((pg as FlipPage[] | null) ?? []);
    })();
  }, [number]);

  if (issue === null && pages !== null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="font-display text-3xl">Número no encontrado</p>
        <Link href="/" className="mt-6 text-xs uppercase tracking-widest underline">
          Volver al archivo
        </Link>
      </div>
    );
  }

  if (issue === null || pages === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-mono text-xs uppercase tracking-widest text-white/40">
        Cargando…
      </div>
    );
  }

  return (
    <FlipReader
      title={issue.title}
      number={issue.number}
      pages={pages}
      onClose={() => router.push(`/revista/${number}`)}
    />
  );
}
