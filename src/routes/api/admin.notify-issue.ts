import { createFileRoute } from '@tanstack/react-router'
import { render } from '@react-email/components'
import * as React from 'react'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { FROM_EMAIL, SENDER_DOMAIN } from '@/lib/email/config'

const BodySchema = z.object({
  issueId: z.string().uuid(),
})

export const Route = createFileRoute('/api/admin/notify-issue')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabasePublishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabasePublishable || !supabaseServiceKey) {
          return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        // Verify caller is an authenticated admin.
        const authHeader = request.headers.get('authorization') ?? ''
        const token = authHeader.replace(/^Bearer\s+/i, '')
        if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const userClient: any = createClient(supabaseUrl, supabasePublishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: userData, error: userErr } = await userClient.auth.getUser()
        if (userErr || !userData?.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: isAdmin } = await userClient.rpc('has_role', {
          _user_id: userData.user.id,
          _role: 'admin',
        })
        if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })

        let parsed: z.infer<typeof BodySchema>
        try {
          parsed = BodySchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Petición inválida' }, { status: 400 })
        }

        const supabase: any = createClient(supabaseUrl, supabaseServiceKey)

        // Load issue.
        const { data: issue, error: issueErr } = await supabase
          .from('issues')
          .select('id, number, title, cover_path')
          .eq('id', parsed.issueId)
          .maybeSingle()
        if (issueErr || !issue) {
          return Response.json({ error: 'Número no encontrado' }, { status: 404 })
        }

        const siteOrigin = new URL(request.url).origin
        const coverUrl = issue.cover_path
          ? `${supabaseUrl}/storage/v1/object/public/magazines/${issue.cover_path}`
          : null
        const readUrl = `${siteOrigin}/revista/${issue.number}/leer`

        // Subscribers minus suppressed.
        const { data: subs } = await supabase
          .from('newsletter_subscribers')
          .select('email')
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('email')
        const suppressedSet = new Set((suppressed ?? []).map((r: any) => r.email))
        const recipients: string[] = (subs ?? [])
          .map((r: any) => r.email)
          .filter((e: string) => !suppressedSet.has(e))

        if (recipients.length === 0) {
          return Response.json({ ok: true, queued: 0, total: 0, message: 'No hay suscriptores' })
        }

        // Ensure unsubscribe tokens exist for all recipients.
        const { data: existingTokens } = await supabase
          .from('email_unsubscribe_tokens')
          .select('email, token')
          .in('email', recipients)
        const tokenMap = new Map<string, string>()
        ;(existingTokens ?? []).forEach((r: any) => tokenMap.set(r.email, r.token))
        const missing = recipients.filter((e) => !tokenMap.has(e))
        if (missing.length) {
          const rows = missing.map((email) => ({ email, token: crypto.randomUUID() }))
          const { error: tokErr } = await supabase
            .from('email_unsubscribe_tokens')
            .insert(rows)
          if (!tokErr) rows.forEach((r) => tokenMap.set(r.email, r.token))
        }

        const entry = TEMPLATES['new-issue-announcement']
        if (!entry) return Response.json({ error: 'Template missing' }, { status: 500 })

        const subjectFn = entry.subject
        const subject =
          typeof subjectFn === 'function'
            ? subjectFn({ number: issue.number, title: issue.title })
            : subjectFn

        const messageIdBase = `new-issue-${issue.id}`
        let queued = 0
        let failed = 0
        const errors: string[] = []

        for (const email of recipients) {
          const unsubscribeToken = tokenMap.get(email) ?? null
          const unsubscribeUrl = unsubscribeToken
            ? `${siteOrigin}/unsubscribe?token=${unsubscribeToken}`
            : undefined
          const props = {
            number: issue.number,
            title: issue.title,
            coverUrl,
            readUrl,
            unsubscribeUrl,
          }
          const element = React.createElement(entry.component, props)
          const html = await render(element)
          const text = await render(element, { plainText: true })
          const messageId = `${messageIdBase}-${email}`

          const { error: enqErr } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              to: email,
              from: FROM_EMAIL,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: 'transactional',
              label: 'new-issue-announcement',
              idempotency_key: messageId,
              message_id: messageId,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })

          if (enqErr) {
            failed++
            errors.push(`${email}: ${enqErr.message}`)
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'new-issue-announcement',
              recipient_email: email,
              status: 'failed',
              error_message: enqErr.message,
            })
          } else {
            queued++
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'new-issue-announcement',
              recipient_email: email,
              status: 'pending',
            })
          }
        }

        return Response.json({
          ok: true,
          sent: queued,
          queued,
          failed,
          total: recipients.length,
          errors: errors.slice(0, 5),
        })
      },
    },
  },
})

