import type { Metadata } from "next";
import { AuthorPostsEditPage } from "@/views/author-posts-edit";

export const metadata: Metadata = {
  title: "Editar artículo",
  robots: { index: false },
};

export default function Page() {
  return <AuthorPostsEditPage />;
}