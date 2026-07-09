import type { Metadata } from "next";
import { AdminUsersPage } from "@/views/admin-users";

export const metadata: Metadata = {
  title: "Admin — Redactores",
  robots: { index: false },
};

export default function Page() {
  return <AdminUsersPage />;
}
