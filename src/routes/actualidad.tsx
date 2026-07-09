import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/actualidad")({
  component: () => (
    <SectionLayout
      section="actualidad"
      intro="Noticias, crónicas y reflexiones sobre lo que pasa en Kentucky y más allá."
    />
  ),
  head: () => ({
    meta: [
      { title: "Actualidad — Rheckypolitan" },
      { name: "description", content: "Actualidad desde Kentucky. Noticias y crónicas de Rheckypolitan." },
      { property: "og:title", content: "Actualidad — Rheckypolitan" },
      { property: "og:description", content: "Actualidad desde Kentucky. Noticias y crónicas de Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/actualidad" }],
  }),
});
