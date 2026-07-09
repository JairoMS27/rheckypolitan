import type { Metadata } from "next";
import { GastronomiaPage } from "@/views/gastronomia";

export const metadata: Metadata = {
  title: "Gastronomía",
  description: "Gastronomía, recetas y restaurantes en Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/gastronomia" },
  openGraph: {
    title: "Gastronomía — Rheckypolitan",
    description: "Gastronomía, recetas y restaurantes en Rheckypolitan.",
  },
};

export default function Page() {
  return <GastronomiaPage />;
}
