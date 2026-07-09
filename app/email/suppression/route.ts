import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase-env";

type SuppressionReason = "bounce" | "complaint" | "unsubscribe";

interface ResendWebhookEvent {
  type: string;
  data?: {
    to?: string | string[];
    email_id?: string;
    bounce?: { message?: string };
    complaint?: { message?: string };
  };
}

function mapEventToReason(type: string): SuppressionReason | null {
  switch (type) {
    case "email.bounced":
      return "bounce";
    case "email.complained":
      return "complaint";
    default:
      return null;
  }
}

function extractRecipient(data: ResendWebhookEvent["data"]): string | null {
  if (!data?.to) return null;
  if (Array.isArray(data.to)) return data.to[0] ?? null;
  return data.to;
}

function mapReasonToStatus(
  reason: SuppressionReason,
): "bounced" | "complained" | "suppressed" {
  switch (reason) {
    case "bounce":
      return "bounced";
    case "complaint":
      return "complained";
    default:
      return "suppressed";
  }
}

function mapReasonToMessage(reason: SuppressionReason): string {
  switch (reason) {
    case "bounce":
      return "Permanent bounce — email address is invalid or rejected";
    case "complaint":
      return "Spam complaint — recipient marked email as spam";
    default:
      return "Email suppressed";
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: ResendWebhookEvent;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as ResendWebhookEvent;
  } catch (error) {
    console.error("Invalid Resend webhook", { error });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const reason = mapEventToReason(event.type);
  if (!reason) {
    return Response.json({ success: true, ignored: true });
  }

  const email = extractRecipient(event.data);
  if (!email) {
    return Response.json({ error: "Missing recipient" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const normalizedEmail = email.toLowerCase();

  const { error: suppressError } = await supabase.from("suppressed_emails").upsert(
    {
      email: normalizedEmail,
      reason,
      metadata: {
        resend_event: event.type,
        email_id: event.data?.email_id ?? null,
      },
    },
    { onConflict: "email" },
  );

  if (suppressError) {
    console.error("Failed to upsert suppressed email", { error: suppressError });
    return Response.json({ error: "Failed to write suppression" }, { status: 500 });
  }

  await supabase.from("email_send_log").insert({
    message_id: event.data?.email_id ?? null,
    template_name: "system",
    recipient_email: normalizedEmail,
    status: mapReasonToStatus(reason),
    error_message: mapReasonToMessage(reason),
    metadata: { resend_event: event.type },
  });

  return Response.json({ success: true });
}