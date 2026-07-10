import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

const getAuthenticatedSupabase = mock(async (): Promise<{
  supabase: unknown;
  userId: string;
} | null> => null);

mock.module("@/lib/api-auth", () => ({ getAuthenticatedSupabase }));

type PostRow = {
  id: string;
  author_id: string;
  title: string;
  section: string;
  slug: string;
  published: boolean;
  published_at: string;
  cover_path: string | null;
  content_html: string;
  author: string | null;
  excerpt: string | null;
  cover_position: string;
};

let posts: PostRow[] = [];
let lastInsert: Record<string, unknown> | null = null;

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table !== "posts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      return {
        select: (_cols: string) => {
          const chain: any = {
            _eq: null as { col: string; val: string } | null,
            order: () => chain,
            eq: (col: string, val: string) => {
              chain._eq = { col, val };
              return chain;
            },
            maybeSingle: async () => {
              const row = posts.find((p) =>
                chain._eq ? (p as any)[chain._eq.col] === chain._eq.val : false,
              );
              return { data: row ?? null, error: null };
            },
            then: undefined,
          };
          // Make awaitable for list query: await query returns { data, error }
          chain.then = (resolve: (v: unknown) => void) => {
            let data = [...posts];
            if (chain._eq) {
              data = data.filter((p) => (p as any)[chain._eq!.col] === chain._eq!.val);
            }
            resolve({ data, error: null });
          };
          return chain;
        },
        insert: (row: Record<string, unknown>) => {
          lastInsert = row;
          const created: PostRow = {
            id: "11111111-1111-1111-1111-111111111111",
            author_id: String(row.author_id),
            title: String(row.title),
            section: String(row.section),
            slug: String(row.slug),
            published: Boolean(row.published),
            published_at: String(row.published_at),
            cover_path: (row.cover_path as string | null) ?? null,
            content_html: String(row.content_html ?? ""),
            author: (row.author as string | null) ?? null,
            excerpt: (row.excerpt as string | null) ?? null,
            cover_position: String(row.cover_position ?? "50% 50%"),
          };
          posts.push(created);
          return {
            select: () => ({
              single: async () => ({ data: created, error: null }),
            }),
          };
        },
        update: (row: Record<string, unknown>) => ({
          eq: (col: string, val: string) => ({
            select: () => ({
              single: async () => {
                const idx = posts.findIndex((p) => (p as any)[col] === val);
                if (idx < 0) return { data: null, error: { message: "missing" } };
                posts[idx] = { ...posts[idx], ...row } as PostRow;
                return { data: posts[idx], error: null };
              },
            }),
          }),
        }),
        delete: () => ({
          eq: async (col: string, val: string) => {
            posts = posts.filter((p) => (p as any)[col] !== val);
            return { error: null };
          },
        }),
      };
    },
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  };
}

const createClient = mock(() => makeAdminClient());
mock.module("@supabase/supabase-js", () => ({ createClient }));

const { POST, GET } = await import("../../app/api/publicar/route");

describe("POST /api/publicar — any authenticated account", () => {
  beforeEach(() => {
    posts = [];
    lastInsert = null;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    getAuthenticatedSupabase.mockReset();
    createClient.mockReset();
    createClient.mockImplementation(() => makeAdminClient());
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("rejects unauthenticated", async () => {
    getAuthenticatedSupabase.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/publicar", {
      method: "POST",
      body: JSON.stringify({
        section: "actualidad",
        slug: "hola",
        title: "Hola",
        published: true,
        published_at: new Date().toISOString(),
        content_html: "<p>x</p>",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("plain user without staff role can create an article with own author_id", async () => {
    getAuthenticatedSupabase.mockResolvedValue({
      userId: "user-plain-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      },
    });

    const req = new NextRequest("http://localhost/api/publicar", {
      method: "POST",
      body: JSON.stringify({
        section: "actualidad",
        slug: "mi-articulo",
        title: "Mi artículo de lector",
        published: true,
        published_at: "2026-07-10T12:00:00.000Z",
        content_html: "<p>contenido</p>",
        author: "Lector",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.post.author_id).toBe("user-plain-1");
    expect(json.post.title).toBe("Mi artículo de lector");
    expect(lastInsert?.author_id).toBe("user-plain-1");
  });

  test("GET lists only own posts for plain user", async () => {
    posts = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        author_id: "user-plain-1",
        title: "Mío",
        section: "actualidad",
        slug: "mio",
        published: true,
        published_at: "2026-07-10T12:00:00.000Z",
        cover_path: null,
        content_html: "",
        author: null,
        excerpt: null,
        cover_position: "50% 50%",
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        author_id: "someone-else",
        title: "Ajeno",
        section: "actualidad",
        slug: "ajeno",
        published: true,
        published_at: "2026-07-10T12:00:00.000Z",
        cover_path: null,
        content_html: "",
        author: null,
        excerpt: null,
        cover_position: "50% 50%",
      },
    ];

    getAuthenticatedSupabase.mockResolvedValue({
      userId: "user-plain-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      },
    });

    const req = new NextRequest("http://localhost/api/publicar?scope=mine", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isAdmin).toBe(false);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].title).toBe("Mío");
  });

  test("GET without scope still lists only own posts (mis artículos)", async () => {
    posts = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        author_id: "user-plain-1",
        title: "Mío",
        section: "actualidad",
        slug: "mio",
        published: true,
        published_at: "2026-07-10T12:00:00.000Z",
        cover_path: null,
        content_html: "",
        author: null,
        excerpt: null,
        cover_position: "50% 50%",
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        author_id: "someone-else",
        title: "Ajeno",
        section: "actualidad",
        slug: "ajeno",
        published: true,
        published_at: "2026-07-10T12:00:00.000Z",
        cover_path: null,
        content_html: "",
        author: null,
        excerpt: null,
        cover_position: "50% 50%",
      },
    ];

    getAuthenticatedSupabase.mockResolvedValue({
      userId: "user-plain-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      },
    });

    const req = new NextRequest("http://localhost/api/publicar", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].title).toBe("Mío");
  });

  test("GET scope=all is forbidden for non-admin", async () => {
    getAuthenticatedSupabase.mockResolvedValue({
      userId: "user-plain-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      },
    });

    const req = new NextRequest("http://localhost/api/publicar?scope=all", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
