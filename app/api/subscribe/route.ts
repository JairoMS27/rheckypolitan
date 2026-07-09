import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logEmailSend, sendTemplateEmail } from "@/lib/email/send-transactional";

const BodySchema = z.object({
  email: z.string().email().max(254),
});

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  const email = parsed.email.trim().toLowerCase();

  const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

  const { data: existingSuppression } = await supabase
    .from("suppressed_emails")
    .select("email, reason")
    .eq("email", email)
    .maybeSingle();
  if (existingSuppression && existingSuppression.reason !== "unsubscribe") {
    return NextResponse.json(
      { error: "Este correo no puede recibir nuestros envíos." },
      { status: 409 },
    );
  }

  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (existing && !existingSuppression) {
    return NextResponse.json(
      { error: "Ya estás suscrita/o a las Cartas desde Kentucky." },
      { status: 409 },
    );
  }

  if (existingSuppression) {
    const { error: delSupErr } = await supabase
      .from("suppressed_emails")
      .delete()
      .eq("email", email);
    if (delSupErr) {
      console.error("Failed to clear suppression", delSupErr);
      return NextResponse.json({ error: "No se pudo reactivar la suscripción" }, { status: 500 });
    }
    await supabase.from("email_unsubscribe_tokens").delete().eq("email", email);
  }

  if (!existing) {
    const { error: insertErr } = await supabase.from("newsletter_subscribers").insert({ email });
    if (insertErr) {
      console.error("Failed to save subscriber", insertErr);
      return NextResponse.json({ error: "No se pudo guardar la suscripción" }, { status: 500 });
    }
  }

  const { data: latestIssue } = await supabase
    .from("issues")
    .select("number, title, cover_path, published_at")
    .order("published_at", { ascending: false })
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const siteOrigin = new URL(request.url).origin;
  const latest = latestIssue
    ? {
        number: latestIssue.number as number,
        title: latestIssue.title as string,
        coverUrl: latestIssue.cover_path
          ? `${supabaseUrl}/storage/v1/object/public/magazines/${latestIssue.cover_path}`
          : null,
        readUrl: `${siteOrigin}/revista/${latestIssue.number}/leer`,
      }
    : null;

  let unsubscribeToken: string | null = null;
  const { data: existingToken } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  if (existingToken?.token) {
    unsubscribeToken = existingToken.token;
  } else {
    const newToken = crypto.randomUUID();
    const { error: tokErr } = await supabase
      .from("email_unsubscribe_tokens")
      .insert({ email, token: newToken });
    if (!tokErr) unsubscribeToken = newToken;
  }

  const messageId = `newsletter-confirm-${email}`;
  const sendResult = await sendTemplateEmail({
    templateKey: "newsletter-confirmation",
    to: email,
    templateProps: { email, latest },
    messageId,
    unsubscribeToken,
    idempotencyKey: messageId,
  });

  if (!sendResult.ok) {
    await logEmailSend(supabase, {
      messageId,
      templateName: "newsletter-confirmation",
      recipientEmail: email,
      status: "failed",
      errorMessage: sendResult.error,
    });
    return NextResponse.json({ error: "No se pudo enviar el correo de confirmación" }, { status: 502 });
  }

  await logEmailSend(supabase, {
    messageId,
    templateName: "newsletter-confirmation",
    recipientEmail: email,
    status: "sent",
  });

  return NextResponse.json({ ok: true, sent: true, resendId: sendResult.resendId });
}