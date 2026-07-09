import type { Metadata } from "next";
import { ActualidadPage } from "@/views/actualidad";

export const metadata: Metadata = {
  title: "Actualidad",
  description: "Actualidad desde Kentucky. Noticias y crónicas de Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/actualidad" },
  openGraph: {
    title: "Actualidad — Rheckypolitan",
    description: "Actualidad desde Kentucky. Noticias y crónicas de Rheckypolitan.",
  },
};

export default function Page() {
  return <ActualidadPage />;
}
