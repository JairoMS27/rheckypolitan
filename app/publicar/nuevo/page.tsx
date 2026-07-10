import type { Metadata } from "next";
import { AuthorPostsNewPage } from "@/views/author-posts-new";

export const metadata: Metadata = {
  title: "Publicar artículo",
  robots: { index: false },
};

export default function Page() {
  return <AuthorPostsNewPage />;
}