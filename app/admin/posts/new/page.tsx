import type { Metadata } from "next";
import { AdminPostsNewPage } from "@/views/admin-posts-new";

export const metadata: Metadata = {
  title: "Admin — Nueva noticia",
  robots: { index: false },
};

export default function Page() {
  return <AdminPostsNewPage />;
}
