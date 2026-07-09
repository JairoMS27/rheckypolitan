import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Rheckypolitan'

interface LatestIssue {
  number: number
  title: string
  coverUrl: string | null
  readUrl: string
}

interface NewsletterConfirmationProps {
  email?: string
  latest?: LatestIssue | null
}

const NewsletterConfirmationEmail = ({ email, latest }: NewsletterConfirmationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {latest
        ? `Empieza por el nº${latest.number}: ${latest.title}`
        : 'Te hemos apuntado a las Cartas desde Kentucky'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={ribbon} />
        <Text style={kicker}>★ Cartas desde Kentucky ★</Text>
        <Heading style={h1}>
          Bienvenida/o a <span style={italic}>Rheckypolitan</span>
        </Heading>
        <Text style={text}>
          Gracias por suscribirte{email ? ` con ${email}` : ''}. Te
          escribiremos cada vez que publiquemos un nuevo número, y de paso te
          mandaremos una columna corta escrita a mano.
        </Text>

        {latest && (
          <Section style={issueBox}>
            <Text style={issueKicker}>
              Mientras tanto · Nº{String(latest.number).padStart(2, '0')}
            </Text>
            {latest.coverUrl && (
              <Img
                src={latest.coverUrl}
                alt={`Portada del número ${latest.number}`}
                width="504"
                style={coverImg}
              />
            )}
            <Heading as="h2" style={h2}>
              {latest.title}
            </Heading>
            <Button href={latest.readUrl} style={button}>
              Leer este número →
            </Button>
          </Section>
        )}

        <Text style={text}>
          Sin spam, sin algoritmos, sin trucos. Solo crónicas, ensayos y
          postales desde Kentucky.
        </Text>
        <Text style={footer}>— El equipo de {SITE_NAME}</Text>
        <Section style={ribbon} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewsletterConfirmationEmail,
  subject: 'Gracias por suscribirte a Rheckypolitan',
  displayName: 'Confirmación de suscripción',
  previewData: {
    email: 'lector@example.com',
    latest: {
      number: 4,
      title: 'Postales desde Lexington',
      coverUrl: null,
      readUrl: 'https://rheckypolitan.es/revista/4/leer',
    },
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}
const ribbon: React.CSSProperties = {
  height: '6px',
  backgroundImage:
    'repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)',
  margin: '0 0 20px',
}
const kicker: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '10px',
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: '#888888',
  margin: '0 0 12px',
}
const h1: React.CSSProperties = {
  fontSize: '32px',
  lineHeight: 1.1,
  fontWeight: 400,
  color: '#0a0a0a',
  margin: '0 0 24px',
}
const h2: React.CSSProperties = {
  fontSize: '22px',
  lineHeight: 1.2,
  fontWeight: 400,
  color: '#0a0a0a',
  margin: '12px 0 18px',
}
const italic: React.CSSProperties = { fontStyle: 'italic', color: '#B22234' }
const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#333333',
  margin: '0 0 16px',
}
const issueBox: React.CSSProperties = {
  border: '1px solid #e6e6e6',
  padding: '20px',
  margin: '24px 0',
  backgroundColor: '#fafaf7',
}
const issueKicker: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '10px',
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: '#B22234',
  margin: '0 0 12px',
}
const coverImg: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  border: '1px solid #e6e6e6',
}
const button: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontFamily: 'Menlo, monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#999999',
  margin: '24px 0 20px',
}
