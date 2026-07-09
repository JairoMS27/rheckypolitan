import type { Metadata } from "next";
import { AdminNewPage } from "@/views/admin-new";

export const metadata: Metadata = {
  title: "Admin — Nueva revista",
  robots: { index: false },
};

export default function Page() {
  return <AdminNewPage />;
}
