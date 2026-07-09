import { Webhook } from 'svix'

export interface SupabaseAuthHookPayload {
  user: {
    id: string
    email?: string
    email_new?: string
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

function normalizeWebhookSecret(secret: string): string {
  return secret.startsWith('v1,') ? secret.slice(3) : secret
}

function webhookHeaders(request: Request): Record<string, string> {
  return {
    'webhook-id': request.headers.get('webhook-id') ?? request.headers.get('svix-id') ?? '',
    'webhook-timestamp':
      request.headers.get('webhook-timestamp') ?? request.headers.get('svix-timestamp') ?? '',
    'webhook-signature':
      request.headers.get('webhook-signature') ?? request.headers.get('svix-signature') ?? '',
  }
}

export function verifySupabaseAuthHook(request: Request, rawBody: string): SupabaseAuthHookPayload {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET
  if (!secret) {
    throw new Error('SUPABASE_AUTH_HOOK_SECRET not configured')
  }

  const wh = new Webhook(normalizeWebhookSecret(secret))
  const verified = wh.verify(rawBody, webhookHeaders(request))
  return parseSupabaseAuthHook(verified)
}

export function parseSupabaseAuthHook(body: unknown): SupabaseAuthHookPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid hook payload')
  }

  const payload = body as Partial<SupabaseAuthHookPayload>
  if (!payload.user?.id || !payload.email_data?.email_action_type) {
    throw new Error('Missing required hook fields')
  }

  return payload as SupabaseAuthHookPayload
}

export function buildAuthConfirmationUrl(
  supabaseUrl: string,
  emailData: SupabaseAuthHookPayload['email_data'],
): string {
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
  })
  if (emailData.redirect_to) {
    params.set('redirect_to', emailData.redirect_to)
  }
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`
}