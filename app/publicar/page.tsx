import type { Metadata } from "next";
import { AuthorPostsPage } from "@/views/author-posts";

export const metadata: Metadata = {
  title: "Mis artículos",
  robots: { index: false },
};

export default function Page() {
  return <AuthorPostsPage />;
}