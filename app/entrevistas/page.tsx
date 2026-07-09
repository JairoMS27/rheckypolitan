import type { Metadata } from "next";
import { EntrevistasPage } from "@/views/entrevistas";

export const metadata: Metadata = {
  title: "Entrevistas",
  description: "Entrevistas y conversaciones en Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/entrevistas" },
  openGraph: {
    title: "Entrevistas — Rheckypolitan",
    description: "Entrevistas y conversaciones en Rheckypolitan.",
  },
};

export default function Page() {
  return <EntrevistasPage />;
}
