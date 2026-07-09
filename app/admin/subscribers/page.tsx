import type { Metadata } from "next";
import { AdminSubscribersPage } from "@/views/admin-subscribers";

export const metadata: Metadata = {
  title: "Admin — Suscriptores",
  robots: { index: false },
};

export default function Page() {
  return <AdminSubscribersPage />;
}
