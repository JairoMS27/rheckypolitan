import type { Metadata } from "next";
import { AdminPostsEditPage } from "@/views/admin-posts-edit";

export const metadata: Metadata = {
  title: "Admin — Editar noticia",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <AdminPostsEditPage />;
}
