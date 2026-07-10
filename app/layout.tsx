import type { Metadata } from "next";
import { MaintenanceGate } from "./maintenance-gate";
import { Providers } from "./providers";
import "./globals.css";

/** Always re-read maintenance flag from DB; never serve a cached ON screen after toggle OFF. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Rheckypolitan — Revista digital",
    template: "%s — Rheckypolitan",
  },
  description: "Archivo digital de Rheckypolitan. Lee todos los números.",
  openGraph: {
    title: "Rheckypolitan — Revista digital",
    description: "Archivo digital de Rheckypolitan. Lee todos los números.",
    type: "website",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/015589e2-2d4f-4dd7-b8f2-499356a132eb/id-preview-188561ac--ab40637f-3009-456a-b317-a668f19700ca.lovable.app-1778633973053.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rheckypolitan — Revista digital",
    description: "Archivo digital de Rheckypolitan. Lee todos los números.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/015589e2-2d4f-4dd7-b8f2-499356a132eb/id-preview-188561ac--ab40637f-3009-456a-b317-a668f19700ca.lovable.app-1778633973053.png",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <MaintenanceGate>{children}</MaintenanceGate>
        </Providers>
      </body>
    </html>
  );
}
