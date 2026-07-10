import type { Metadata } from "next";
import { ProfilePage } from "@/views/profile";

export const metadata: Metadata = {
  title: "Ajustes de cuenta",
  robots: { index: false },
};

export default function Page() {
  return <ProfilePage />;
}
