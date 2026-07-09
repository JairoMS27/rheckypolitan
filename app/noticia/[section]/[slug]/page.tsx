import { NoticiaPage } from "@/views/noticia";

export default async function Page({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  return <NoticiaPage section={section} slug={slug} />;
}
