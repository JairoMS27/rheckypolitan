import type { Metadata } from "next";
import { AuthRegisterPage } from "@/views/auth-register";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false },
};

export default function Page() {
  return <AuthRegisterPage />;
}
