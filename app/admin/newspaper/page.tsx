import type { Metadata } from "next";
import { AdminNewspaperPage } from "@/views/admin-newspaper";

export const metadata: Metadata = {
  title: "Admin — Periódico",
  robots: { index: false },
};

export default function Page() {
  return <AdminNewspaperPage />;
}
