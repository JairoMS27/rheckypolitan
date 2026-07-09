import { render } from "@react-email/components";
import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { FROM_EMAIL } from "@/lib/email/config";
import { EmailSendError, isRateLimited, sendEmail } from "@/lib/email/resend";

export type SendTemplateEmailInput = {
  templateKey: string;
  to: string;
  templateProps: Record<string, unknown>;
  messageId: string;
  unsubscribeToken?: string | null;
  idempotencyKey?: string;
};

export type SendTemplateEmailResult =
  | { ok: true; resendId: string; messageId: string }
  | {
      ok: false;
      messageId: string;
      error: string;
      rateLimited?: boolean;
      retryAfterSeconds?: number | null;
    };

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local[0]}***@${domain}`;
}

export async function renderTemplateEmail(
  templateKey: string,
  templateProps: Record<string, unknown>,
): Promise<{ subject: string; html: string; text: string; label: string }> {
  const entry = TEMPLATES[templateKey];
  if (!entry) {
    throw new Error(`Unknown email template: ${templateKey}`);
  }

  const element = React.createElement(entry.component, templateProps);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof entry.subject === "function"
      ? entry.subject(templateProps)
      : entry.subject;

  return { subject, html, text, label: templateKey };
}

export async function sendTemplateEmail(
  input: SendTemplateEmailInput,
): Promise<SendTemplateEmailResult> {
  const { subject, html, text, label } = await renderTemplateEmail(
    input.templateKey,
    input.templateProps,
  );

  try {
    const result = await sendEmail({
      to: input.to,
      from: FROM_EMAIL,
      subject,
      html,
      text,
      unsubscribeToken: input.unsubscribeToken ?? undefined,
      idempotencyKey: input.idempotencyKey ?? input.messageId,
    });

    console.info("email.sent", {
      template: label,
      messageId: input.messageId,
      to: redactEmail(input.to),
      resendId: result.id,
    });

    return { ok: true, resendId: result.id, messageId: input.messageId };
  } catch (error) {
    const message =
      error instanceof EmailSendError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    console.error("email.failed", {
      template: label,
      messageId: input.messageId,
      to: redactEmail(input.to),
      error: message,
    });

    return {
      ok: false,
      messageId: input.messageId,
      error: message,
      rateLimited: isRateLimited(error),
      retryAfterSeconds:
        error instanceof EmailSendError ? error.retryAfterSeconds : null,
    };
  }
}

export async function logEmailSend(
  supabase: SupabaseClient,
  row: {
    messageId: string;
    templateName: string;
    recipientEmail: string;
    status: "sent" | "failed";
    errorMessage?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("email_send_log").insert({
    message_id: row.messageId,
    template_name: row.templateName,
    recipient_email: row.recipientEmail,
    status: row.status,
    error_message: row.errorMessage?.slice(0, 1000) ?? null,
  });
  if (error) {
    console.error("email.log_failed", { messageId: row.messageId, error });
  }
}

const DEFAULT_SEND_DELAY_MS = 200;
const MAX_RATE_LIMIT_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BulkSendItemResult = {
  input: SendTemplateEmailInput;
  result: SendTemplateEmailResult;
};

export async function sendBulkTemplateEmails(
  items: SendTemplateEmailInput[],
  options?: { sendDelayMs?: number },
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
  results: BulkSendItemResult[];
}> {
  const sendDelayMs = options?.sendDelayMs ?? DEFAULT_SEND_DELAY_MS;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const results: BulkSendItemResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let rateLimitRetries = 0;
    let finalResult: SendTemplateEmailResult | null = null;

    while (rateLimitRetries <= MAX_RATE_LIMIT_RETRIES) {
      const result = await sendTemplateEmail(item);
      if (result.ok) {
        finalResult = result;
        sent++;
        break;
      }

      if (result.rateLimited && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries++;
        const waitMs = (result.retryAfterSeconds ?? 60) * 1000;
        await sleep(waitMs);
        continue;
      }

      finalResult = result;
      failed++;
      errors.push(`${item.to}: ${result.error}`);
      break;
    }

    results.push({
      input: item,
      result: finalResult ?? {
        ok: false,
        messageId: item.messageId,
        error: "Send aborted",
      },
    });

    if (i < items.length - 1) {
      await sleep(sendDelayMs);
    }
  }

  return { sent, failed, errors, results };
}