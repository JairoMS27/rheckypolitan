import { render } from "@react-email/components";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { scheduleEmailQueueProcessing } from "@/lib/email/schedule-queue";
import { z } from "zod";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { FROM_EMAIL, SENDER_DOMAIN } from "@/lib/email/config";

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

  const entry = TEMPLATES["newsletter-confirmation"];
  if (!entry) {
    return NextResponse.json({ error: "Template missing" }, { status: 500 });
  }
  const templateProps = { email, latest };
  const element = React.createElement(entry.component, templateProps);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof entry.subject === "function" ? entry.subject(templateProps) : entry.subject;

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

  const { error: enqErr } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      to: email,
      from: FROM_EMAIL,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: "newsletter-confirmation",
      idempotency_key: messageId,
      message_id: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (enqErr) {
    console.error("Failed to enqueue email", enqErr);
    return NextResponse.json({ error: "No se pudo encolar el correo" }, { status: 500 });
  }

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "newsletter-confirmation",
    recipient_email: email,
    status: "pending",
  });

  scheduleEmailQueueProcessing();

  return NextResponse.json({ ok: true });
}
