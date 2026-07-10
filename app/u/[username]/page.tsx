import type { Metadata } from "next";
import { PublicProfilePage } from "@/views/public-profile";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} · Perfil`,
    description: `Perfil de @${username} en Rheckypolitan`,
  };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <PublicProfilePage username={decodeURIComponent(username)} />;
}
