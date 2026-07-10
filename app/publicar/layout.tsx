import type { ReactNode } from "react";
import { requireAuthPage } from "@/lib/auth";

export default async function PublicarLayout({ children }: { children: ReactNode }) {
  await requireAuthPage();
  return children;
}