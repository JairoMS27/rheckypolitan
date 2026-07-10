export const SITE_NAME = 'rheckypolitan'
export const ROOT_DOMAIN = 'rheckypolitan.es'
/** Must match a domain verified in Resend (currently rheckypolitan.es). */
export const SENDER_DOMAIN = ROOT_DOMAIN
export const FROM_EMAIL = `Rheckypolitan <hola@${SENDER_DOMAIN}>`
export const AUTH_FROM_EMAIL = `Rheckypolitan <noreply@${ROOT_DOMAIN}>`

export function siteUrl(): string {
  return process.env.SITE_URL ?? `https://${ROOT_DOMAIN}`
}

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
}