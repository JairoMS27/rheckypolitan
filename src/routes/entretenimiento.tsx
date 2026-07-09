import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/entretenimiento")({
  component: () => (
    <SectionLayout
      section="entretenimiento"
      intro="Cultura, música, cine y todo lo que entretiene a los rheckys."
    />
  ),
  head: () => ({
    meta: [
      { title: "Entretenimiento — Rheckypolitan" },
      { name: "description", content: "Cultura, música y entretenimiento desde Rheckypolitan." },
      { property: "og:title", content: "Entretenimiento — Rheckypolitan" },
      { property: "og:description", content: "Cultura, música y entretenimiento desde Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/entretenimiento" }],
  }),
});
