export async function GET() {
  const body = `# Rheckypolitan

> Revista digital independiente desde Kentucky. Archivo de crónicas, ensayos y postales editoriales con maquetación tipo papel.

Rheckypolitan publica números numerados que se hojean como una revista real (portada, lomo y páginas que pasan). El archivo es de lectura libre.

## Pages

- [Archivo](/): Portada con el archivo completo de números, columnistas y suscripción a Cartas desde Kentucky.

## Optional

- [Política y suscripción](/#newsletter): Boletín "Cartas desde Kentucky".
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}