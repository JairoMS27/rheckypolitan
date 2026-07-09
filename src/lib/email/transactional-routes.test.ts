import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

const sendTemplateEmail = mock(async () => ({
  ok: true as const,
  resendId: "resend-abc",
  messageId: "newsletter-confirm-a@b.com",
}));

const sendBulkTemplateEmails = mock(async () => ({
  sent: 2,
  failed: 0,
  errors: [] as string[],
  results: [],
}));

const logEmailSend = mock(async () => {});

mock.module("@/lib/email/send-transactional", () => ({
  sendTemplateEmail,
  sendBulkTemplateEmails,
  logEmailSend,
}));

function serviceSupabase() {
  return {
    from: (table: string) => {
      if (table === "suppressed_emails") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "newsletter_subscribers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            then: undefined,
          }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === "issues") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  number: 3,
                  title: "Marzo",
                  cover_path: null,
                },
                error: null,
              }),
            }),
            order: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "email_unsubscribe_tokens") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
          insert: async () => ({ error: null }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      };
    },
  };
}

function notifyServiceSupabase() {
  return {
    from: (table: string) => {
      if (table === "issues") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  number: 3,
                  title: "Marzo",
                  cover_path: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "newsletter_subscribers") {
        return {
          select: () =>
            Promise.resolve({
              data: [{ email: "a@b.com" }, { email: "c@d.com" }],
              error: null,
            }),
        };
      }
      if (table === "suppressed_emails") {
        return {
          select: () => Promise.resolve({ data: [], error: null }),
        };
      }
      if (table === "email_unsubscribe_tokens") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      return serviceSupabase().from(table);
    },
  };
}

let clientCall = 0;
const createClient = mock(() => {
  clientCall += 1;
  if (clientCall % 2 === 1) {
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }),
      },
      rpc: async (name: string) =>
        name === "has_role" ? { data: true, error: null } : { data: null, error: null },
    };
  }
  return notifyServiceSupabase();
});

mock.module("@supabase/supabase-js", () => ({ createClient }));

const { POST: subscribePOST } = await import("../../../app/api/subscribe/route");
const { POST: notifyPOST } = await import("../../../app/api/admin/notify-issue/route");

describe("transactional API routes", () => {
  beforeEach(() => {
    clientCall = 0;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    sendTemplateEmail.mockReset();
    sendBulkTemplateEmails.mockReset();
    logEmailSend.mockReset();
    createClient.mockReset();
    createClient.mockImplementation(() => {
      clientCall += 1;
      if (clientCall === 1 && process.env._TEST_NOTIFY === "1") {
        return {
          auth: {
            getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }),
          },
          rpc: async (name: string) =>
            name === "has_role" ? { data: true, error: null } : { data: null, error: null },
        };
      }
      if (process.env._TEST_NOTIFY === "1" && clientCall === 2) {
        return notifyServiceSupabase();
      }
      return serviceSupabase();
    });
    sendTemplateEmail.mockImplementation(async () => ({
      ok: true as const,
      resendId: "resend-abc",
      messageId: "newsletter-confirm-a@b.com",
    }));
    sendBulkTemplateEmails.mockImplementation(async () => ({
      sent: 2,
      failed: 0,
      errors: [],
      results: [],
    }));
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env._TEST_NOTIFY;
  });

  test("subscribe sends email directly via Resend service", async () => {
    const req = new NextRequest("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const res = await subscribePOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(true);
    expect(sendTemplateEmail).toHaveBeenCalledTimes(1);
    expect(logEmailSend).toHaveBeenCalled();
  });

  test("subscribe returns 502 when Resend send fails", async () => {
    sendTemplateEmail.mockImplementation(async () => ({
      ok: false as const,
      messageId: "newsletter-confirm-a@b.com",
      error: "Resend down",
    }));

    const req = new NextRequest("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const res = await subscribePOST(req);
    expect(res.status).toBe(502);
    expect(sendTemplateEmail).toHaveBeenCalledTimes(1);
  });

  test("notify-issue sends bulk emails directly", async () => {
    process.env._TEST_NOTIFY = "1";
    clientCall = 0;
    createClient.mockImplementation(() => {
      clientCall += 1;
      if (clientCall === 1) {
        return {
          auth: {
            getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }),
          },
          rpc: async (name: string) =>
            name === "has_role" ? { data: true, error: null } : { data: null, error: null },
        };
      }
      return notifyServiceSupabase();
    });

    const req = new NextRequest("http://localhost/api/admin/notify-issue", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token" },
      body: JSON.stringify({ issueId: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const res = await notifyPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(2);
    expect(sendBulkTemplateEmails).toHaveBeenCalledTimes(1);
  });
});