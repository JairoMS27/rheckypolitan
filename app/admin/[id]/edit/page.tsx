import type { Metadata } from "next";
import { AdminEditPage } from "@/views/admin-edit";

export const metadata: Metadata = {
  title: "Admin — Editar revista",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <AdminEditPage />;
}
