import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/pasatiempos")({
  component: () => (
    <SectionLayout
      section="pasatiempos"
      intro="Crucigramas, juegos y otros pasatiempos."
    />
  ),
  head: () => ({
    meta: [
      { title: "Pasatiempos — Rheckypolitan" },
      { name: "description", content: "Pasatiempos, juegos y crucigramas de Rheckypolitan." },
      { property: "og:title", content: "Pasatiempos — Rheckypolitan" },
      { property: "og:description", content: "Pasatiempos, juegos y crucigramas de Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/pasatiempos" }],
  }),
});
