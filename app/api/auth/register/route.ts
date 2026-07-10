import * as React from "react";
import { render } from "@react-email/components";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SignupEmail } from "@/lib/email-templates/signup";
import {
  AUTH_FROM_EMAIL,
  SITE_NAME,
  buildAppAuthCallbackUrl,
  siteUrl,
} from "@/lib/email/config";
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

function safeNextPath(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
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
  const nextPath = safeNextPath(body.redirectTo);
  // Allowed redirect for Supabase generateLink (must be in Auth redirect allow-list)
  const supabaseRedirectTo = `${siteUrl().replace(/\/$/, "")}/auth/callback`;

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

  // 2) Create user + confirmation tokens without Auth's public signup email
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password: body.password,
    options: {
      data: {
        username,
        display_name: displayName,
      },
      redirectTo: supabaseRedirectTo,
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
  const hashedToken = linkData.properties?.hashed_token;

  // Always host verification on our domain (never supabase /auth/v1/verify with localhost)
  const confirmationUrl = hashedToken
    ? buildAppAuthCallbackUrl({
        tokenHash: hashedToken,
        type: "signup",
        next: nextPath,
      })
    : null;

  // Force unconfirmed until they click the email link (even if project defaults auto-confirm)
  const { error: unconfirmErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: false,
  });
  if (unconfirmErr) {
    console.error("[register] could not force email unconfirmed", unconfirmErr);
  }

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
  }

  if (!confirmationUrl) {
    console.error("[register] missing hashed_token for user", userId);
    return NextResponse.json(
      {
        error:
          "Cuenta creada pero no pudimos generar el enlace de confirmación. Contacta con soporte.",
      },
      { status: 500 },
    );
  }

  // 5) Brand confirmation email via Resend
  try {
    const element = React.createElement(SignupEmail, {
      siteName: SITE_NAME,
      siteUrl: siteUrl(),
      recipient: email,
      confirmationUrl,
      displayName,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await sendEmail({
      to: email,
      from: AUTH_FROM_EMAIL,
      subject: "Confirma tu email — Rheckypolitan",
      html,
      text,
      // New key so re-sends after template fix are not blocked by old idempotency
      idempotencyKey: `register-v2-${userId}`,
    });
  } catch (err) {
    console.error("[register] resend failed", err);
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

  return NextResponse.json({
    ok: true,
    needsConfirmation: true,
    emailSent: true,
    message:
      "Revisa tu correo para confirmar la cuenta. Hasta entonces no podrás iniciar sesión.",
  });
}
