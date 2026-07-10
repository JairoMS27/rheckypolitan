import * as React from "react";
import { render } from "@react-email/components";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SignupEmail } from "@/lib/email-templates/signup";
import { AUTH_FROM_EMAIL, SITE_NAME, siteUrl } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
import { passwordMeetsAllRules } from "@/lib/password";
import { normalizeUsername, validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public registration that avoids Supabase Auth's public /signup email rate limit.
 * Creates the user via Admin API (no Auth email send) and mails confirmation with Resend.
 */
const BodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(80),
  redirectTo: z.string().max(500).optional(),
});

function safeAppRedirect(raw: string | undefined): string {
  const base = siteUrl().replace(/\/$/, "");
  if (!raw) return `${base}/auth/callback?redirect=${encodeURIComponent("/")}`;
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return `${base}/auth/callback?redirect=${encodeURIComponent("/")}`;
  }
  return `${base}/auth/callback?redirect=${encodeURIComponent(raw)}`;
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Datos de registro inválidos" }, { status: 400 });
  }

  const formatError = validateUsername(body.username);
  if (formatError) {
    return NextResponse.json({ error: formatError, field: "username" }, { status: 400 });
  }
  if (!passwordMeetsAllRules(body.password)) {
    return NextResponse.json(
      { error: "La contraseña no cumple los requisitos", field: "password" },
      { status: 400 },
    );
  }

  const username = normalizeUsername(body.username);
  const displayName = body.displayName.trim();
  const email = body.email.trim().toLowerCase();
  const redirectTo = safeAppRedirect(body.redirectTo);

  // 1) Username must be free
  const { data: taken, error: takenErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .limit(1);
  if (takenErr) {
    return NextResponse.json({ error: "No se pudo comprobar el usuario" }, { status: 500 });
  }
  if (taken?.length) {
    return NextResponse.json(
      { error: "Ese nombre de usuario ya está en uso", field: "username" },
      { status: 409 },
    );
  }

  // 2) Create user + confirmation link without going through Auth's public signup email
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password: body.password,
    options: {
      data: {
        username,
        display_name: displayName,
      },
      redirectTo,
    },
  });

  if (linkErr || !linkData?.user) {
    const msg = linkErr?.message ?? "No se pudo crear la cuenta";
    const lower = msg.toLowerCase();
    if (
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("exists") ||
      lower.includes("duplicate")
    ) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo", field: "email" },
        { status: 409 },
      );
    }
    if (lower.includes("rate") || lower.includes("429")) {
      return NextResponse.json(
        {
          error:
            "Demasiados intentos de registro. Espera unos minutos e inténtalo de nuevo.",
        },
        { status: 429 },
      );
    }
    console.error("[register] generateLink failed", linkErr);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const userId = linkData.user.id;
  const actionLink =
    linkData.properties?.action_link ||
    // Fallback: build verify URL from hashed token if action_link missing
    (() => {
      const hash = linkData.properties?.hashed_token;
      const supabaseUrl = (
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        ""
      ).replace(/\/$/, "");
      if (!hash || !supabaseUrl) return null;
      const params = new URLSearchParams({
        token: hash,
        type: "signup",
        redirect_to: redirectTo,
      });
      return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
    })();

  // 3) Ensure profile has the exact chosen username (trigger may have slugified)
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName,
      username,
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    // Unique username race: roll back the auth user
    if (profileErr.code === "23505" || profileErr.message.toLowerCase().includes("unique")) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso", field: "username" },
        { status: 409 },
      );
    }
    console.error("[register] profile upsert failed", profileErr);
    // User exists; still try to send email — profile can be fixed later
  }

  // 4) If project auto-confirms (email_confirm on), no email needed
  const emailConfirmed = Boolean(
    (linkData.user as { email_confirmed_at?: string | null }).email_confirmed_at,
  );

  if (emailConfirmed || !actionLink) {
    // With generateLink, users are usually unconfirmed; if no link, treat as created.
    if (emailConfirmed) {
      return NextResponse.json({
        ok: true,
        needsConfirmation: false,
        message: "Cuenta creada. Ya puedes iniciar sesión.",
      });
    }
    // No link and not confirmed — still return success so client can prompt login/check mail
    console.warn("[register] missing action_link for user", userId);
  }

  // 5) Send confirmation via our Resend path (bypasses Supabase email quota)
  if (actionLink) {
    try {
      const element = React.createElement(SignupEmail, {
        siteName: SITE_NAME,
        siteUrl: siteUrl(),
        recipient: email,
        confirmationUrl: actionLink,
      });
      const html = await render(element);
      const text = await render(element, { plainText: true });
      await sendEmail({
        to: email,
        from: AUTH_FROM_EMAIL,
        subject: "Confirma tu email — Rheckypolitan",
        html,
        text,
        idempotencyKey: `register-${userId}`,
      });
    } catch (err) {
      console.error("[register] resend failed", err);
      // Leave user unconfirmed so they can retry; don't delete (password already set).
      return NextResponse.json(
        {
          error:
            "Cuenta creada pero no pudimos enviar el correo de confirmación. Espera un momento e inténtalo de nuevo o contacta con soporte.",
          needsConfirmation: true,
          emailSent: false,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    needsConfirmation: !emailConfirmed,
    emailSent: Boolean(actionLink),
    message: emailConfirmed
      ? "Cuenta creada. Ya puedes iniciar sesión."
      : "Revisa tu correo para confirmar la cuenta.",
  });
}
