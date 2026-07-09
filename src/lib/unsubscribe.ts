import { createClient } from "@supabase/supabase-js";

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

export type UnsubscribeResult =
  | { ok: false; status: 500; reason: "config" | "update" | "suppress" }
  | { ok: false; status: 404; reason: "invalid" }
  | { ok: true; already: boolean; email: string };

export async function processUnsubscribe(token: string): Promise<UnsubscribeResult> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, status: 500, reason: "config" };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: tokenRecord, error: lookupError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (lookupError || !tokenRecord) {
    return { ok: false, status: 404, reason: "invalid" };
  }

  if (tokenRecord.used_at) {
    return { ok: true, already: true, email: tokenRecord.email as string };
  }

  const { data: updated, error: updateError } = await supabase
    .from("email_unsubscribe_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .select()
    .maybeSingle();

  if (updateError) {
    console.error("Failed to mark token as used", { error: updateError });
    return { ok: false, status: 500, reason: "update" };
  }
  if (!updated) {
    return { ok: true, already: true, email: tokenRecord.email as string };
  }

  const { error: suppressError } = await supabase
    .from("suppressed_emails")
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: "unsubscribe" },
      { onConflict: "email" },
    );

  if (suppressError) {
    console.error("Failed to suppress email", {
      error: suppressError,
      email_redacted: redactEmail(tokenRecord.email),
    });
    return { ok: false, status: 500, reason: "suppress" };
  }

  console.log("Email unsubscribed", { email_redacted: redactEmail(tokenRecord.email) });
  return { ok: true, already: false, email: tokenRecord.email as string };
}
