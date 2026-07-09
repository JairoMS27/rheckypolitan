import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/entrevistas")({
  component: () => (
    <SectionLayout
      section="entrevistas"
      intro="Conversaciones largas con gente interesante."
    />
  ),
  head: () => ({
    meta: [
      { title: "Entrevistas — Rheckypolitan" },
      { name: "description", content: "Entrevistas y conversaciones en Rheckypolitan." },
      { property: "og:title", content: "Entrevistas — Rheckypolitan" },
      { property: "og:description", content: "Entrevistas y conversaciones en Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/entrevistas" }],
  }),
});
