import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminSubscribersPage } from "@/views/admin-subscribers";

export const metadata: Metadata = {
  title: "Admin — Suscriptores",
  robots: { index: false },
};

export default async function Page() {
  await requireAdminPage();
  return <AdminSubscribersPage />;
}
