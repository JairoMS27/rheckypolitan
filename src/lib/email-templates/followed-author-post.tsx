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
import type { TemplateEntry } from "./registry";

const SITE_NAME = "Rheckypolitan";

interface FollowedAuthorPostProps {
  authorName?: string;
  authorUsername?: string;
  title?: string;
  excerpt?: string | null;
  readUrl?: string;
  siteUrl?: string;
}

const FollowedAuthorPostEmail = ({
  authorName = "Un autor",
  authorUsername,
  title = "Nuevo artículo",
  excerpt,
  readUrl = "#",
  siteUrl = "https://www.rheckypolitan.es",
}: FollowedAuthorPostProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {authorName} publicó: {title}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={ribbon} />
        <Text style={kicker}>★ Tu feed · Rheckypolitan ★</Text>
        <Heading style={h1}>
          {authorName}
          {authorUsername ? (
            <span style={muted}> @{authorUsername}</span>
          ) : null}{" "}
          publicó un artículo
        </Heading>
        <Text style={text}>
          Alguien a quien sigues acaba de publicar en{" "}
          <Link href={siteUrl} style={link}>
            <strong>{SITE_NAME}</strong>
          </Link>
          .
        </Text>

        <Section style={issueBox}>
          <Text style={issueKicker}>Nuevo en tu feed</Text>
          <Heading as="h2" style={h2}>
            {title}
          </Heading>
          {excerpt ? <Text style={boxText}>{excerpt}</Text> : null}
          <Button href={readUrl} style={button}>
            Leer artículo →
          </Button>
        </Section>

        <Text style={footer}>— El equipo de {SITE_NAME}</Text>
        <Text style={unsubText}>
          Puedes desactivar estos avisos en Mi feed o al dejar de seguir al
          autor.
        </Text>
        <Section style={ribbon} />
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: FollowedAuthorPostEmail,
  subject: (data: Record<string, unknown>) =>
    `${data.authorName ?? "Alguien que sigues"} publicó: ${data.title ?? "nuevo artículo"}`,
  displayName: "Aviso de artículo de seguido",
  previewData: {
    authorName: "John Bourbon",
    authorUsername: "john_bourbon",
    title: "Postales desde Lexington",
    excerpt: "Una crónica lenta sobre el whiskey y el verano.",
    readUrl: "https://www.rheckypolitan.es/noticia/actualidad/ejemplo",
    siteUrl: "https://www.rheckypolitan.es",
  },
} satisfies TemplateEntry;

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
  fontSize: "28px",
  lineHeight: 1.15,
  fontWeight: 400,
  color: "#0a0a0a",
  margin: "0 0 20px",
};
const h2: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 400,
  color: "#0a0a0a",
  margin: "0 0 12px",
};
const muted: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "14px",
  color: "#888888",
  fontWeight: 400,
};
const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#333333",
  margin: "0 0 16px",
};
const boxText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.55,
  color: "#555555",
  margin: "0 0 16px",
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
  margin: "24px 0 12px",
};
const unsubText: React.CSSProperties = {
  fontFamily: "Menlo, monospace",
  fontSize: "10px",
  color: "#aaaaaa",
  margin: "0 0 12px",
  lineHeight: 1.5,
};
