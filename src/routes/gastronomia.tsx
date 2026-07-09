import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/gastronomia")({
  component: () => (
    <SectionLayout
      section="gastronomia"
      intro="Recetas, restaurantes y vicios de la mesa."
    />
  ),
  head: () => ({
    meta: [
      { title: "Gastronomía — Rheckypolitan" },
      { name: "description", content: "Gastronomía, recetas y restaurantes en Rheckypolitan." },
      { property: "og:title", content: "Gastronomía — Rheckypolitan" },
      { property: "og:description", content: "Gastronomía, recetas y restaurantes en Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/gastronomia" }],
  }),
});
