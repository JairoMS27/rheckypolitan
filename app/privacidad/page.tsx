import type { Metadata } from "next";
import { LegalPage } from "@/views/legal-page";

export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Política de privacidad y cookies de Rheckypolitan: qué datos tratamos y cómo puedes elegir.",
  alternates: { canonical: "https://rheckypolitan.es/privacidad" },
};

export default function Page() {
  return <LegalPage kind="privacidad" />;
}
