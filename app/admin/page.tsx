import type { Metadata } from "next";
import { AdminPage } from "@/views/admin-page";

export const metadata: Metadata = {
  title: "Admin — Revistas",
  robots: { index: false },
};

export default function Page() {
  return <AdminPage />;
}
