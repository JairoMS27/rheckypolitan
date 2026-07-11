import type { Metadata } from "next";
import { LegalPage } from "@/views/legal-page";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso de Rheckypolitan, la revista digital desde Kentucky.",
  alternates: { canonical: "https://rheckypolitan.es/terminos" },
};

export default function Page() {
  return <LegalPage kind="terminos" />;
}
