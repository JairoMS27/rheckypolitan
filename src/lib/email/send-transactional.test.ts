import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { EmailSendError } from "@/lib/email/resend";

const sendEmail = mock(async () => ({ id: "resend-msg-123" }));

mock.module("@/lib/email/resend", () => ({
  sendEmail,
  EmailSendError,
  isRateLimited: (error: unknown) =>
    error instanceof EmailSendError && error.status === 429,
  getRetryAfterSeconds: () => 60,
  isForbidden: () => false,
}));

const { sendTemplateEmail, renderTemplateEmail } = await import("./send-transactional");

describe("send-transactional", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    sendEmail.mockImplementation(async () => ({ id: "resend-msg-123" }));
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  test("renderTemplateEmail renders newsletter-confirmation subject", async () => {
    const rendered = await renderTemplateEmail("newsletter-confirmation", {
      email: "reader@example.com",
      latest: null,
    });
    expect(rendered.subject).toBe("Gracias por suscribirte a Rheckypolitan");
    expect(rendered.html).toContain("reader@example.com");
    expect(rendered.text.length).toBeGreaterThan(0);
  });

  test("sendTemplateEmail calls Resend sendEmail with rendered content", async () => {
    const result = await sendTemplateEmail({
      templateKey: "newsletter-confirmation",
      to: "reader@example.com",
      templateProps: { email: "reader@example.com", latest: null },
      messageId: "newsletter-confirm-reader@example.com",
      unsubscribeToken: "token-abc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resendId).toBe("resend-msg-123");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
      unsubscribeToken?: string;
    };
    expect(call.to).toBe("reader@example.com");
    expect(call.subject).toBe("Gracias por suscribirte a Rheckypolitan");
    expect(call.html).toContain("reader@example.com");
    expect(call.unsubscribeToken).toBe("token-abc");
  });

  test("sendTemplateEmail returns failure when Resend throws", async () => {
    sendEmail.mockImplementation(async () => {
      throw new EmailSendError("Mailbox unavailable", 502);
    });

    const result = await sendTemplateEmail({
      templateKey: "newsletter-confirmation",
      to: "bad@example.com",
      templateProps: { email: "bad@example.com", latest: null },
      messageId: "newsletter-confirm-bad@example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Mailbox unavailable");
  });
});