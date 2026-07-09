import type { Metadata } from "next";
import { PasatiemposPage } from "@/views/pasatiempos";

export const metadata: Metadata = {
  title: "Pasatiempos",
  description: "Pasatiempos, juegos y crucigramas de Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/pasatiempos" },
  openGraph: {
    title: "Pasatiempos — Rheckypolitan",
    description: "Pasatiempos, juegos y crucigramas de Rheckypolitan.",
  },
};

export default function Page() {
  return <PasatiemposPage />;
}
