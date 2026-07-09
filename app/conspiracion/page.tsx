import type { Metadata } from "next";
import { ConspiracionPage } from "@/views/conspiracion";

export const metadata: Metadata = {
  title: "Conspiración",
  description: "Conspiraciones, teorías y misterios desde Rheckypolitan.",
  alternates: { canonical: "https://rheckypolitan.es/conspiracion" },
  openGraph: {
    title: "Conspiración — Rheckypolitan",
    description: "Conspiraciones, teorías y misterios desde Rheckypolitan.",
  },
};

export default function Page() {
  return <ConspiracionPage />;
}
