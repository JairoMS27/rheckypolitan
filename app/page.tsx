import type { Metadata } from "next";
import { HomePage } from "@/views/home-page";

export const metadata: Metadata = {
  title: "Rheckypolitan — Archivo de crónicas desde Kentucky",
  description:
    "Archivo digital de Rheckypolitan: crónicas, ensayos y postales editoriales desde Kentucky. Hojea cada número como una revista de papel.",
  alternates: { canonical: "https://rheckypolitan.es/" },
  openGraph: {
    title: "Rheckypolitan — Archivo de crónicas desde Kentucky",
    description:
      "Archivo digital de Rheckypolitan: crónicas, ensayos y postales editoriales desde Kentucky.",
    url: "https://rheckypolitan.es/",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Rheckypolitan",
      url: "https://rheckypolitan.es/",
    },
    {
      "@type": "WebSite",
      name: "Rheckypolitan",
      url: "https://rheckypolitan.es/",
      inLanguage: "es",
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
