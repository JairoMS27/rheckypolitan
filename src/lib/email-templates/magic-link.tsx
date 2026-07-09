import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace mágico para entrar a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={ribbon} />
        <Text style={kicker}>★ Cartas desde Kentucky ★</Text>
        <Heading style={h1}>
          Tu pase de entrada a <span style={italic}>{siteName}</span>
        </Heading>
        <Text style={text}>
          Pulsa el botón para entrar en tu cuenta. El enlace caduca en breve y
          solo funciona una vez —como una buena edición de coleccionista.
        </Text>

        <Section style={issueBox}>
          <Text style={issueKicker}>
            ✦ Acceso personal · Edición {new Date().getFullYear()} ✦
          </Text>
          <Heading as="h2" style={h2}>
            Iniciar sesión
          </Heading>
          <Text style={subText}>
            Un solo clic. Sin contraseñas, sin trámites de imprenta.
          </Text>
          <Button href={confirmationUrl} style={button}>
            Entrar en {siteName} →
          </Button>
          <Text style={fallback}>
            ¿El botón no funciona? Copia y pega esta dirección en tu navegador:
          </Text>
          <Text style={fallbackUrl}>{confirmationUrl}</Text>
        </Section>

        <Text style={text}>
          Si no has pedido este enlace, ignora este correo. Nadie podrá entrar
          en tu cuenta sin él.
        </Text>
        <Text style={footer}>— La redacción de {siteName}</Text>
        <Section style={ribbon} />
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
  margin: '12px 0 8px',
}
const italic: React.CSSProperties = { fontStyle: 'italic', color: '#B22234' }
const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#333333',
  margin: '0 0 16px',
}
const subText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.5,
  color: '#555555',
  margin: '0 0 16px',
}
const issueBox: React.CSSProperties = {
  border: '1px solid #e6e6e6',
  padding: '24px',
  margin: '24px 0',
  backgroundColor: '#fafaf7',
}
const issueKicker: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '10px',
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: '#B22234',
  margin: '0 0 8px',
}
const button: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontFamily: 'Menlo, monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const fallback: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '10px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#888888',
  margin: '12px 0 4px',
}
const fallbackUrl: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '11px',
  color: '#555555',
  wordBreak: 'break-all',
  margin: '0 0 4px',
}
const footer: React.CSSProperties = {
  fontFamily: 'Menlo, monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#999999',
  margin: '24px 0 20px',
}
