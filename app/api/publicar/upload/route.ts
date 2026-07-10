import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Any authenticated account may upload article images under magazines/posts/.
 * Uses service role so storage works even if client RLS is not yet migrated.
 * Magazine issue folders (UUID issue ids) are never writable here.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "inline");
  const postId = form.get("postId") ? String(form.get("postId")) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx 8 MB)" }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Tipo de imagen no permitido" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let path: string;
  if (kind === "cover" && postId) {
    // Covers live under posts/{postId}/ — never under issue magazine folders
    path = `posts/${postId}/cover-${stamp}.${ext}`;
  } else {
    path = `posts/uploads/${auth.userId}/${stamp}.${ext}`;
  }

  if (!path.startsWith("posts/")) {
    return NextResponse.json({ error: "Ruta de almacenamiento inválida" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("magazines").upload(path, buffer, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = admin.storage.from("magazines").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ path, publicUrl });
}
