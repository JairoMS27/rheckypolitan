import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  logEmailSend,
  sendBulkTemplateEmails,
  type SendTemplateEmailInput,
} from "@/lib/email/send-transactional";

const BodySchema = z.object({
  issueId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishable =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabasePublishable || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient: any = createClient(supabaseUrl, supabasePublishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

  const { data: issue, error: issueErr } = await supabase
    .from("issues")
    .select("id, number, title, cover_path")
    .eq("id", parsed.issueId)
    .maybeSingle();
  if (issueErr || !issue) {
    return NextResponse.json({ error: "Número no encontrado" }, { status: 404 });
  }

  const siteOrigin = new URL(request.url).origin;
  const coverUrl = issue.cover_path
    ? `${supabaseUrl}/storage/v1/object/public/magazines/${issue.cover_path}`
    : null;
  const readUrl = `${siteOrigin}/revista/${issue.number}/leer`;

  const { data: subs } = await supabase.from("newsletter_subscribers").select("email");
  const { data: suppressed } = await supabase.from("suppressed_emails").select("email");
  const suppressedSet = new Set((suppressed ?? []).map((r: any) => r.email));
  const recipients: string[] = (subs ?? [])
    .map((r: any) => r.email)
    .filter((e: string) => !suppressedSet.has(e));

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0, message: "No hay suscriptores" });
  }

  const { data: existingTokens } = await supabase
    .from("email_unsubscribe_tokens")
    .select("email, token")
    .in("email", recipients);
  const tokenMap = new Map<string, string>();
  (existingTokens ?? []).forEach((r: any) => tokenMap.set(r.email, r.token));
  const missing = recipients.filter((e) => !tokenMap.has(e));
  if (missing.length) {
    const rows = missing.map((email) => ({ email, token: crypto.randomUUID() }));
    const { error: tokErr } = await supabase.from("email_unsubscribe_tokens").insert(rows);
    if (!tokErr) rows.forEach((r) => tokenMap.set(r.email, r.token));
  }

  const messageIdBase = `new-issue-${issue.id}`;
  const items: SendTemplateEmailInput[] = recipients.map((email) => {
    const unsubscribeToken = tokenMap.get(email) ?? null;
    const unsubscribeUrl = unsubscribeToken
      ? `${siteOrigin}/unsubscribe?token=${unsubscribeToken}`
      : undefined;
    const messageId = `${messageIdBase}-${email}`;
    return {
      templateKey: "new-issue-announcement",
      to: email,
      templateProps: {
        number: issue.number,
        title: issue.title,
        coverUrl,
        readUrl,
        unsubscribeUrl,
      },
      messageId,
      unsubscribeToken,
      idempotencyKey: messageId,
    };
  });

  const { sent, failed, errors, results } = await sendBulkTemplateEmails(items);

  for (const { input, result } of results) {
    await logEmailSend(supabase, {
      messageId: input.messageId,
      templateName: "new-issue-announcement",
      recipientEmail: input.to,
      status: result.ok ? "sent" : "failed",
      errorMessage: result.ok ? undefined : result.error,
    });
  }

  if (sent === 0 && failed > 0) {
    return NextResponse.json(
      {
        ok: false,
        sent: 0,
        failed,
        total: recipients.length,
        errors: errors.slice(0, 5),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: recipients.length,
    errors: errors.slice(0, 5),
  });
}