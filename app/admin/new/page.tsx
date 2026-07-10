import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminNewPage } from "@/views/admin-new";

export const metadata: Metadata = {
  title: "Admin — Nueva revista",
  robots: { index: false },
};

export default async function Page() {
  await requireAdminPage();
  return <AdminNewPage />;
}
