import type { User } from "@supabase/supabase-js";

/** True when Supabase marks the email as confirmed. */
export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  // Some providers set identity flags without email_confirmed_at
  const identity = user.identities?.find((i) => i.provider === "email");
  if (identity?.identity_data?.email_verified === true) return true;
  return false;
}

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja (y spam) o regístrate de nuevo para recibir otro enlace.";
