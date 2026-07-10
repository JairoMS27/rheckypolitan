import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { siteUrl } from "@/lib/email/config";
import {
  logEmailSend,
  sendTemplateEmail,
} from "@/lib/email/send-transactional";

export const dynamic = "force-dynamic";

const SECTION_VALUES = [
  "actualidad",
  "entretenimiento",
  "conspiracion",
  "gastronomia",
  "entrevistas",
  "pasatiempos",
] as const;

const PostBodySchema = z.object({
  id: z.string().uuid().optional(),
  section: z.enum(SECTION_VALUES),
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  excerpt: z.string().max(2000).nullable().optional(),
  content_html: z.string().default(""),
  author: z.string().max(200).nullable().optional(),
  published: z.boolean(),
  published_at: z.string().min(1),
  cover_path: z.string().nullable().optional(),
  cover_position: z.string().max(40).optional(),
});

function serviceClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function isAdmin(userClient: ReturnType<typeof createClient>, userId: string) {
  const { data } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

/**
 * Notify followers who opted into email alerts when this author publishes.
 * Best-effort: never fails the publish request.
 */
async function notifyFollowersOfPost(
  admin: SupabaseClient,
  post: {
    id: string;
    author_id: string | null;
    title: string;
    excerpt: string | null;
    section: string;
    slug: string;
    published: boolean;
  },
  wasAlreadyPublished: boolean,
) {
  if (!post.published || wasAlreadyPublished || !post.author_id) return;

  try {
    const { data: follows } = await admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", post.author_id)
      .eq("notify_posts", true);

    const followerIds = (follows ?? []).map((f) => f.follower_id as string);
    if (!followerIds.length) return;

    const { data: authorProfile } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", post.author_id)
      .maybeSingle();

    // Resolve emails via auth admin API
    const recipients: { userId: string; email: string }[] = [];
    for (const fid of followerIds) {
      const { data } = await admin.auth.admin.getUserById(fid);
      const email = data.user?.email;
      if (email) recipients.push({ userId: fid, email });
    }
    if (!recipients.length) return;

    const origin = siteUrl().replace(/\/$/, "");
    const readUrl = `${origin}/noticia/${post.section}/${post.slug}`;
    const authorName = authorProfile?.display_name ?? "Un autor";
    const authorUsername = authorProfile?.username ?? undefined;

    for (const r of recipients) {
      const messageId = `followed-post-${post.id}-${r.userId}`;
      const result = await sendTemplateEmail({
        templateKey: "followed-author-post",
        to: r.email,
        templateProps: {
          authorName,
          authorUsername,
          title: post.title,
          excerpt: post.excerpt,
          readUrl,
          siteUrl: origin,
        },
        messageId,
        idempotencyKey: messageId,
      });
      await logEmailSend(admin, {
        messageId,
        templateName: "followed-author-post",
        recipientEmail: r.email,
        status: result.ok ? "sent" : "failed",
        errorMessage: result.ok ? undefined : result.error,
      });
    }
  } catch (err) {
    console.error("[publicar] notify followers failed", err);
  }
}

/**
 * List articles.
 * - Default / ?scope=mine → only the caller's posts (used by /publicar).
 * - ?scope=all → every post; admin only (used by /admin/posts).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

  const staffAdmin = await isAdmin(auth.supabase as any, auth.userId);
  const scope = new URL(request.url).searchParams.get("scope");
  const wantAll = scope === "all";

  if (wantAll && !staffAdmin) {
    return NextResponse.json({ error: "Solo admin puede ver todos los artículos" }, { status: 403 });
  }

  let query = admin
    .from("posts")
    .select("id,section,slug,title,cover_path,published,published_at,author_id,excerpt,author")
    .order("published_at", { ascending: false });

  // /publicar always uses own posts; scope=all is admin-only catalog.
  if (!wantAll) {
    query = query.eq("author_id", auth.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = data ?? [];

  // Enrich with profile names when listing everyone (admin catalog).
  if (wantAll && posts.length > 0) {
    const ids = [...new Set(posts.map((p) => p.author_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name, username")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return NextResponse.json({
        posts: posts.map((p) => {
          const profile = p.author_id ? byId.get(p.author_id) : null;
          return {
            ...p,
            author_display_name: profile?.display_name ?? p.author ?? null,
            author_username: profile?.username ?? null,
          };
        }),
        isAdmin: staffAdmin,
      });
    }
  }

  return NextResponse.json({ posts, isAdmin: staffAdmin });
}

/** Create or update artículo. Any authenticated account; always own author_id on create. */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Datos de artículo inválidos" }, { status: 400 });
  }

  const staffAdmin = await isAdmin(auth.supabase as any, auth.userId);
  const row = {
    section: body.section,
    slug: body.slug,
    title: body.title,
    excerpt: body.excerpt ?? null,
    content_html: body.content_html,
    author: body.author ?? null,
    published: body.published,
    published_at: body.published_at,
    cover_path: body.cover_path ?? null,
    cover_position: body.cover_position ?? "50% 50%",
  };

  if (body.id) {
    const { data: existing, error: findErr } = await admin
      .from("posts")
      .select("id, author_id, published")
      .eq("id", body.id)
      .maybeSingle();
    if (findErr || !existing) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }
    if (!staffAdmin && existing.author_id !== auth.userId) {
      return NextResponse.json({ error: "No puedes editar este artículo" }, { status: 403 });
    }
    const wasPublished = Boolean(existing.published);
    const { data, error } = await admin
      .from("posts")
      .update(row)
      .eq("id", body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fire-and-forget follower emails on first publish
    void notifyFollowersOfPost(
      admin as SupabaseClient,
      {
        id: data.id,
        author_id: data.author_id,
        title: data.title,
        excerpt: data.excerpt,
        section: data.section,
        slug: data.slug,
        published: data.published,
      },
      wasPublished,
    );

    return NextResponse.json({ post: data });
  }

  const { data, error } = await admin
    .from("posts")
    .insert({ ...row, author_id: auth.userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void notifyFollowersOfPost(
    admin as SupabaseClient,
    {
      id: data.id,
      author_id: data.author_id,
      title: data.title,
      excerpt: data.excerpt,
      section: data.section,
      slug: data.slug,
      published: data.published,
    },
    false,
  );

  return NextResponse.json({ post: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const staffAdmin = await isAdmin(auth.supabase as any, auth.userId);
  const { data: existing } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!staffAdmin && existing.author_id !== auth.userId) {
    return NextResponse.json({ error: "No puedes borrar este artículo" }, { status: 403 });
  }

  // Best-effort remove storage folder
  const { data: files } = await admin.storage.from("magazines").list(`posts/${id}`, { limit: 100 });
  if (files?.length) {
    await admin.storage.from("magazines").remove(files.map((f) => `posts/${id}/${f.name}`));
  }

  const { error } = await admin.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
