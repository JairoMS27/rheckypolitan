export const SITE_NAME = "Rheckypolitan";
export const ROOT_DOMAIN = "rheckypolitan.es";
/** Must match a domain verified in Resend (currently rheckypolitan.es). */
export const SENDER_DOMAIN = ROOT_DOMAIN;
export const FROM_EMAIL = `Rheckypolitan <hola@${SENDER_DOMAIN}>`;
export const AUTH_FROM_EMAIL = `Rheckypolitan <noreply@${ROOT_DOMAIN}>`;

function isLocalHostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Canonical public site origin for emails and auth redirects.
 * Never falls back to localhost in production (avoids broken verify links).
 */
export function siteUrl(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.replace(/\/$/, "");
    const withProtocol = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;
    if (!isLocalHostUrl(withProtocol)) return withProtocol;
  }

  // Brand production default (www matches live site)
  return `https://www.${ROOT_DOMAIN}`;
}

/**
 * App-hosted confirmation URL (token_hash flow).
 * Prefer this over Supabase /auth/v1/verify so redirect_to never becomes localhost.
 */
export function buildAppAuthCallbackUrl(opts: {
  tokenHash: string;
  type: string;
  next?: string;
}): string {
  const base = siteUrl().replace(/\/$/, "");
  const params = new URLSearchParams({
    token_hash: opts.tokenHash,
    type: opts.type,
  });
  const next =
    opts.next && opts.next.startsWith("/") && !opts.next.startsWith("//")
      ? opts.next
      : "/";
  params.set("redirect", next);
  return `${base}/auth/callback?${params.toString()}`;
}

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}