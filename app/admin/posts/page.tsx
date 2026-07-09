import type { Metadata } from "next";
import { AdminPostsPage } from "@/views/admin-posts";

export const metadata: Metadata = {
  title: "Admin — Noticias",
  robots: { index: false },
};

export default function Page() {
  return <AdminPostsPage />;
}
