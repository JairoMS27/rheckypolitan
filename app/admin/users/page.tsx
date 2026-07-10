import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminUsersPage } from "@/views/admin-users";

export const metadata: Metadata = {
  title: "Admin — Usuarios",
  robots: { index: false },
};

export default async function Page() {
  await requireAdminPage();
  return <AdminUsersPage />;
}
