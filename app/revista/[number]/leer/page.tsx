import type { Metadata } from "next";
import { RevistaLeerPage } from "@/views/revista-leer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const numFmt = String(number).padStart(2, "0");
  const url = `https://rheckypolitan.es/revista/${number}/leer`;
  const title = `Leer N.º ${numFmt}`;
  return {
    title,
    description: `Lee el número ${numFmt} de Rheckypolitan página a página, como una revista de papel.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — Rheckypolitan`,
      description: `Lee el número ${numFmt} de Rheckypolitan página a página, como una revista de papel.`,
      url,
      type: "article",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <RevistaLeerPage number={number} />;
}
