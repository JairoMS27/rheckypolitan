import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminAnalyticsPage } from "@/views/admin-analytics";

export const metadata: Metadata = {
  title: "Admin — Visitas",
  robots: { index: false },
};

export default async function Page() {
  await requireAdminPage();
  return <AdminAnalyticsPage />;
}
