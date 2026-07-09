import { createFileRoute } from "@tanstack/react-router";
import { SectionLayout } from "@/components/section-layout";

export const Route = createFileRoute("/conspiracion")({
  component: () => (
    <SectionLayout
      section="conspiracion"
      intro="Teorías, sospechas y pistas que nadie más se atreve a unir."
    />
  ),
  head: () => ({
    meta: [
      { title: "Conspiración — Rheckypolitan" },
      { name: "description", content: "Conspiraciones, teorías y misterios desde Rheckypolitan." },
      { property: "og:title", content: "Conspiración — Rheckypolitan" },
      { property: "og:description", content: "Conspiraciones, teorías y misterios desde Rheckypolitan." },
    ],
    links: [{ rel: "canonical", href: "https://rheckypolitan.es/conspiracion" }],
  }),
});
