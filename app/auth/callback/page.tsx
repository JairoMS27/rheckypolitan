import type { Metadata } from "next";
import { AuthCallbackPage } from "@/views/auth-callback";

export const metadata: Metadata = {
  title: "Verificando sesión",
  robots: { index: false },
};

export default function Page() {
  return <AuthCallbackPage />;
}
