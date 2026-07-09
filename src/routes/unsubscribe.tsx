import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

async function processUnsubscribe(token: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, status: 500 as const, reason: 'config' as const }
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    return { ok: false, status: 404 as const, reason: 'invalid' as const }
  }

  if (tokenRecord.used_at) {
    return { ok: true, already: true as const, email: tokenRecord.email as string }
  }

  const { data: updated, error: updateError } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to mark token as used', { error: updateError })
    return { ok: false, status: 500 as const, reason: 'update' as const }
  }
  if (!updated) {
    return { ok: true, already: true as const, email: tokenRecord.email as string }
  }

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to suppress email', {
      error: suppressError,
      email_redacted: redactEmail(tokenRecord.email),
    })
    return { ok: false, status: 500 as const, reason: 'suppress' as const }
  }

  console.log('Email unsubscribed', { email_redacted: redactEmail(tokenRecord.email) })
  return { ok: true, already: false as const, email: tokenRecord.email as string }
}

type LoaderData =
  | { state: 'missing' }
  | { state: 'invalid' }
  | { state: 'error' }
  | { state: 'done'; already: boolean; email: string }

export const Route = createFileRoute('/unsubscribe')({
  server: {
    handlers: {
      // RFC 8058 one-click unsubscribe (POST from mail clients)
      POST: async ({ request }) => {
        const url = new URL(request.url)
        let token: string | null = url.searchParams.get('token')
        const contentType = request.headers.get('content-type') ?? ''
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const formText = await request.text()
          const params = new URLSearchParams(formText)
          if (!params.get('List-Unsubscribe')) {
            const formToken = params.get('token')
            if (formToken) token = formToken
          }
        }
        if (!token) {
          return Response.json({ error: 'Token is required' }, { status: 400 })
        }
        const result = await processUnsubscribe(token)
        if (!result.ok) {
          return Response.json({ success: false }, { status: result.status })
        }
        return Response.json({ success: true, already: result.already })
      },
    },
  },
  loader: async ({ location }): Promise<LoaderData> => {
    const search = new URLSearchParams(location.searchStr || '')
    const token = search.get('token')
    if (!token) return { state: 'missing' }
    const result = await processUnsubscribe(token)
    if (!result.ok) {
      if (result.status === 404) return { state: 'invalid' }
      return { state: 'error' }
    }
    return { state: 'done', already: Boolean(result.already), email: result.email ?? '' }
  },
  component: UnsubscribePage,
  errorComponent: ({ error, reset }) => (
    <Shell>
      <h1 className="font-display text-3xl">Algo ha fallado</h1>
      <p className="mt-3 text-sm text-foreground/70">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-6 border border-foreground bg-foreground px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-background"
      >
        Reintentar
      </button>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <h1 className="font-display text-3xl">Enlace no encontrado</h1>
    </Shell>
  ),
  head: () => ({
    meta: [
      { title: 'Darse de baja — Rheckypolitan' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 h-1.5 w-full bg-[repeating-linear-gradient(to_right,#B22234_0_8px,transparent_8px_16px)]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          ✉ Cartas desde Kentucky
        </p>
        <div className="mt-4">{children}</div>
        <div className="mt-12 h-1.5 w-full bg-[repeating-linear-gradient(to_right,#B22234_0_8px,transparent_8px_16px)]" />
      </div>
    </main>
  )
}

function UnsubscribePage() {
  const data = Route.useLoaderData()
  const [retrying, setRetrying] = useState(false)

  // Retry POST in case loader had no service key (defensive)
  useEffect(() => {
    if (data.state === 'error') {
      setRetrying(true)
      const url = new URL(window.location.href)
      const token = url.searchParams.get('token')
      if (!token) return
      fetch('/unsubscribe?token=' + encodeURIComponent(token), {
        method: 'POST',
      }).finally(() => setRetrying(false))
    }
  }, [data.state])

  if (data.state === 'missing') {
    return (
      <Shell>
        <h1 className="font-display text-4xl">Falta el token</h1>
        <p className="mt-4 text-sm text-foreground/70">
          El enlace está incompleto. Abre el enlace original que recibiste en el correo.
        </p>
      </Shell>
    )
  }

  if (data.state === 'invalid') {
    return (
      <Shell>
        <h1 className="font-display text-4xl">Enlace caducado</h1>
        <p className="mt-4 text-sm text-foreground/70">
          Este enlace ya no es válido. Si quieres dejar de recibir nuestras cartas,
          responde al último correo y lo gestionamos a mano.
        </p>
      </Shell>
    )
  }

  if (data.state === 'error') {
    return (
      <Shell>
        <h1 className="font-display text-4xl">No hemos podido procesarlo</h1>
        <p className="mt-4 text-sm text-foreground/70">
          {retrying ? 'Reintentando…' : 'Inténtalo de nuevo en unos minutos.'}
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="font-display text-4xl leading-tight">
        {data.already ? 'Ya estabas dada de baja' : 'Listo, te hemos dado de baja'}
      </h1>
      <p className="mt-4 text-sm text-foreground/70">
        {data.already
          ? `${data.email} ya no recibe nuestras Cartas desde Kentucky.`
          : `No volveremos a escribirte a ${data.email}. Si cambias de idea, siempre puedes volver a suscribirte desde la página principal.`}
      </p>
      <a
        href="/"
        className="mt-8 inline-block border border-foreground bg-foreground px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-background hover:bg-[#B22234] hover:border-[#B22234]"
      >
        Volver a Rheckypolitan →
      </a>
    </Shell>
  )
}
