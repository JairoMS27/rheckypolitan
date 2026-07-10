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
  Link,
} from "@react-email/components";

const SITE_NAME = "Rheckypolitan";

export interface SignupEmailProps {
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  confirmationUrl?: string;
  displayName?: string;
}

/**
 * Brand template aligned with new-issue-announcement / newsletter:
 * ribbon, Georgia, mono kickers, #B22234 accent.
 */
export const SignupEmail = ({
  siteName = SITE_NAME,
  siteUrl = "https://www.rheckypolitan.es",
  recipient,
  confirmationUrl = "#",
  displayName,
}: SignupEmailProps) => {
  const greeting = displayName?.trim()
    ? `Hola, ${displayName.trim()}`
    : "Hola";

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Confirma tu correo y entra en {siteName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={ribbon} />
          <Text style={kicker}>★ Cartas desde Kentucky ★</Text>
          <Heading style={h1}>
            Bienvenida/o a <span style={italic}>{siteName}</span>
          </Heading>
          <Text style={text}>
            {greeting}. Gracias por crear tu cuenta
            {recipient ? (
              <>
                {" "}
                con{" "}
                <Link href={`mailto:${recipient}`} style={link}>
                  {recipient}
                </Link>
              </>
            ) : null}
            . Solo falta un paso: confirma tu correo para publicar artículos,
            comentar y formar parte de la redacción lectora.
          </Text>

          <Section style={issueBox}>
            <Text style={issueKicker}>Confirmar cuenta</Text>
            <Heading as="h2" style={h2}>
              Un clic y ya estás dentro
            </Heading>
            <Text style={boxText}>
              Este enlace es personal y caduca en poco tiempo. Si no has
              solicitado el registro, ignora este mensaje.
            </Text>
            <Button href={confirmationUrl} style={button}>
              Verificar email →
            </Button>
          </Section>

          <Text style={text}>
            Sin spam, sin algoritmos, sin trucos. Solo crónicas, ensayos y
            postales desde Kentucky.
          </Text>
          <Text style={footer}>— El equipo de {siteName}</Text>

          <Text style={unsubText}>
            ¿Problemas con el botón?{" "}
            <Link href={confirmationUrl} style={unsubLink}>
              Abre este enlace
            </Link>
            {" · "}
            <Link href={siteUrl} style={unsubLink}>
              {siteUrl.replace(/^https?:\/\//, "")}
            </Link>
          </Text>
          <Section style={ribbon} />
        </Container>
      </Body>
    </Html>
  );
};

export default SignupEmail;

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: 0,
  padding: 0,
};
const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 28px",
};
const ribbon: React.CSSProperties = {
  height: "6px",
  backgroundImage:
    "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)",
  margin: "0 0 20px",
};
const kicker: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "10px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "#888888",
  margin: "0 0 12px",
};
const h1: React.CSSProperties = {
  fontSize: "32px",
  lineHeight: 1.1,
  fontWeight: 400,
  color: "#0a0a0a",
  margin: "0 0 24px",
};
const h2: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 400,
  color: "#0a0a0a",
  margin: "0 0 12px",
};
const italic: React.CSSProperties = { fontStyle: "italic", color: "#B22234" };
const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#333333",
  margin: "0 0 16px",
};
const boxText: React.CSSProperties = {
  ...text,
  margin: "0 0 18px",
};
const issueBox: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  padding: "20px",
  margin: "24px 0",
  backgroundColor: "#fafaf7",
};
const issueKicker: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "10px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#B22234",
  margin: "0 0 12px",
};
const button: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  fontFamily: "Menlo, monospace",
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  padding: "12px 22px",
  textDecoration: "none",
  display: "inline-block",
};
const link: React.CSSProperties = {
  color: "#B22234",
  textDecoration: "underline",
};
const footer: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#999999",
  margin: "24px 0 20px",
};
const unsubText: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "10px",
  color: "#aaaaaa",
  textAlign: "center",
  margin: "20px 0 12px",
  lineHeight: 1.5,
};
const unsubLink: React.CSSProperties = {
  color: "#888888",
  textDecoration: "underline",
};
