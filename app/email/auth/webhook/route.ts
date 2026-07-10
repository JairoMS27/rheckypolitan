import * as React from "react";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { AUTH_FROM_EMAIL, SITE_NAME, siteUrl } from "@/lib/email/config";
import {
  buildAuthConfirmationUrl,
  verifySupabaseAuthHook,
} from "@/lib/email/supabase-auth-hook";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirma tu email — Rheckypolitan",
  invite: "Te han invitado a Rheckypolitan",
  magiclink: "Tu enlace de acceso — Rheckypolitan",
  recovery: "Restablece tu contraseña — Rheckypolitan",
  email_change: "Confirma tu nuevo email — Rheckypolitan",
  reauthentication: "Tu código de verificación — Rheckypolitan",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

/**
 * Supabase Auth → Send Email Hook (HTTPS).
 * Dashboard: Authentication → Hooks → Send Email → HTTPS endpoint
 * URL: https://rheckypolitan.es/email/auth/webhook
 * Secret: SUPABASE_AUTH_HOOK_SECRET (v1,whsec_...)
 */
export async function POST(request: Request) {
  if (!process.env.SUPABASE_AUTH_HOOK_SECRET) {
    console.error("SUPABASE_AUTH_HOOK_SECRET not configured");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const rawBody = await request.text();
  let payload;
  try {
    payload = verifySupabaseAuthHook(request, rawBody);
  } catch (error) {
    console.error("Invalid Supabase auth hook", { error });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailType = payload.email_data.email_action_type;
  const recipient = payload.user.email;
  if (!recipient) {
    return Response.json({ error: "Missing recipient email" }, { status: 400 });
  }

  // Notifications without a dedicated template: acknowledge so Auth doesn't fail.
  if (!EMAIL_TEMPLATES[emailType]) {
    console.warn("Unhandled auth email type, skipping send", { emailType });
    return Response.json({});
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const confirmationUrl = buildAuthConfirmationUrl(supabaseUrl, payload.email_data);
  const newEmail =
    payload.user.new_email ?? payload.user.email_new ?? payload.email_data.token_new ?? recipient;

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: siteUrl(),
    recipient,
    confirmationUrl,
    token: payload.email_data.token,
    email: recipient,
    oldEmail: recipient,
    newEmail,
  };

  const EmailTemplate = EMAIL_TEMPLATES[emailType];
  const element = React.createElement(EmailTemplate, templateProps);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = EMAIL_SUBJECTS[emailType] || "Rheckypolitan";
  const messageId = `auth-${emailType}-${payload.user.id}-${payload.email_data.token_hash.slice(0, 12)}`;

  try {
    const result = await sendEmail({
      to: recipient,
      from: AUTH_FROM_EMAIL,
      subject,
      html,
      text,
      idempotencyKey: messageId,
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipient,
      status: "sent",
      metadata: { resend_id: result.id },
    });

    console.info("auth.email.sent", {
      emailType,
      to: redactEmail(recipient),
      resendId: result.id,
    });

    // Supabase expects empty JSON body with 200 on success.
    return Response.json({});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("auth.email.failed", {
      emailType,
      to: redactEmail(recipient),
      error: message,
    });

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: emailType,
        recipient_email: recipient,
        status: "failed",
        error_message: message.slice(0, 1000),
      });
    } catch {
      // logging failure must not mask the send error
    }

    return Response.json(
      {
        error: {
          http_code: 500,
          message: "Failed to send auth email",
        },
      },
      { status: 500 },
    );
  }
}
