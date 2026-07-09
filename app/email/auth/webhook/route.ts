import * as React from "react";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import {
  AUTH_FROM_EMAIL,
  ROOT_DOMAIN,
  SITE_NAME,
  SENDER_DOMAIN,
} from "@/lib/email/config";
import {
  buildAuthConfirmationUrl,
  verifySupabaseAuthHook,
} from "@/lib/email/supabase-auth-hook";
import { getSupabaseUrl } from "@/lib/supabase-env";

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
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

  const EmailTemplate = EMAIL_TEMPLATES[emailType];
  if (!EmailTemplate) {
    console.error("Unknown email type", { emailType });
    return Response.json({ error: `Unknown email type: ${emailType}` }, { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const confirmationUrl = buildAuthConfirmationUrl(supabaseUrl, payload.email_data);
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient,
    confirmationUrl,
    token: payload.email_data.token,
    email: recipient,
    oldEmail: recipient,
    newEmail: payload.user.email_new ?? payload.email_data.token_new ?? recipient,
  };

  const element = React.createElement(EmailTemplate, templateProps);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const messageId = crypto.randomUUID();

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "auth_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: AUTH_FROM_EMAIL,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || "Notification",
      html,
      text,
      purpose: "transactional",
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    console.error("Failed to enqueue auth email", { error: enqueueError, emailType });
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    return Response.json({ error: "Failed to enqueue email" }, { status: 500 });
  }

  console.log("Auth email enqueued", {
    emailType,
    email_redacted: redactEmail(recipient),
  });

  return Response.json({ success: true, queued: true });
}