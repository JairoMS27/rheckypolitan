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
  Link,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Rheckypolitan'

interface NewIssueProps {
  number?: number
  title?: string
  coverUrl?: string | null
  readUrl?: string
  unsubscribeUrl?: string
}

const NewIssueEmail = ({
  number = 1,
  title = 'Nuevo número',
  coverUrl,
  readUrl = '#',
  unsubscribeUrl,
}: NewIssueProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Ya está aquí el Nº${number}: ${title}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={ribbon} />
        <Text style={kicker}>★ Cartas desde Kentucky ★</Text>
        <Heading style={h1}>
          Nuevo número de <span style={italic}>Rheckypolitan</span>
        </Heading>
        <Text style={text}>
          Acabamos de publicar el Nº{String(number).padStart(2, '0')}. Aquí
          tienes la portada y el enlace para leerlo entero.
        </Text>

        <Section style={issueBox}>
          <Text style={issueKicker}>
            Recién salido · Nº{String(number).padStart(2, '0')}
          </Text>
          {coverUrl && (
            <Img
              src={coverUrl}
              alt={`Portada del número ${number}`}
              width="504"
              style={coverImg}
            />
          )}
          <Heading as="h2" style={h2}>
            {title}
          </Heading>
          <Button href={readUrl} style={button}>
            Leer el número →
          </Button>
        </Section>

        <Text style={text}>
          Gracias por leernos desde Kentucky (y desde donde sea que estés).
        </Text>
        <Text style={footer}>— El equipo de {SITE_NAME}</Text>

        {unsubscribeUrl && (
          <Text style={unsubText}>
            ¿No quieres recibir más correos?{' '}
            <Link href={unsubscribeUrl} style={unsubLink}>
              Date de baja
            </Link>
          </Text>
        )}
        <Section style={ribbon} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewIssueEmail,
  subject: (data: Record<string, any>) =>
    `Nº${String(data.number ?? '').padStart(2, '0')} · ${data.title ?? 'Nuevo número'}`,
  displayName: 'Aviso de nuevo número',
  previewData: {
    number: 5,
    title: 'Postales desde Lexington',
    coverUrl: null,
    readUrl: 'https://rheckypolitan.es/revista/5/leer',
    unsubscribeUrl: 'https://rheckypolitan.es/unsubscribe?token=abc',
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
const unsubText: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '10px',
  color: '#aaaaaa',
  textAlign: 'center',
  margin: '20px 0 12px',
}
const unsubLink: React.CSSProperties = {
  color: '#888888',
  textDecoration: 'underline',
}
