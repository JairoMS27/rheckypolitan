import { Resend } from 'resend'
import { siteUrl, unsubscribeUrl } from './config'

export class EmailSendError extends Error {
  status: number
  retryAfterSeconds: number | null

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'EmailSendError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export interface SendEmailInput {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  unsubscribeToken?: string
  idempotencyKey?: string
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new EmailSendError('RESEND_API_KEY not configured', 500)
  }
  return new Resend(apiKey)
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const seconds = Number.parseInt(header, 10)
  return Number.isFinite(seconds) ? seconds : null
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const resend = getResendClient()

  const headers: Record<string, string> = {}
  if (input.unsubscribeToken) {
    const url = unsubscribeUrl(input.unsubscribeToken)
    headers['List-Unsubscribe'] = `<${url}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  const response = await resend.emails.send(
    {
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: Object.keys(headers).length ? headers : undefined,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  )

  const { data, error, headers: responseHeaders } = response

  if (error) {
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500
    const retryAfter = parseRetryAfter(responseHeaders?.['retry-after'] ?? null)
    throw new EmailSendError(error.message, status, retryAfter)
  }

  if (!data?.id) {
    throw new EmailSendError('Resend returned no message id', 500)
  }

  return { id: data.id }
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof EmailSendError && error.status === 429
}

export function isForbidden(error: unknown): boolean {
  return error instanceof EmailSendError && error.status === 403
}

export function getRetryAfterSeconds(error: unknown): number {
  if (error instanceof EmailSendError && error.retryAfterSeconds) {
    return error.retryAfterSeconds
  }
  return 60
}