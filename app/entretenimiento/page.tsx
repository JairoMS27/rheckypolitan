import type { Metadata } from "next";
import { EntretenimientoPage } from "@/views/entretenimiento";

export const metadata: Metadata = {
  title: "Entretenimiento",
  description: "Cultura, música y entretenimiento desde Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/entretenimiento" },
  openGraph: {
    title: "Entretenimiento — Rheckypolitan",
    description: "Cultura, música y entretenimiento desde Rheckypolitan.",
  },
};

export default function Page() {
  return <EntretenimientoPage />;
}
