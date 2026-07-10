import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminPage } from "@/views/admin-page";

export const metadata: Metadata = {
  title: "Admin — Revistas",
  robots: { index: false },
};

export default async function Page() {
  await requireAdminPage();
  return <AdminPage />;
}
