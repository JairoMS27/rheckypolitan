import type { ReactNode } from "react";
import { requireStaffPage } from "@/lib/auth";

/**
 * Defense in depth: every /admin route requires staff (admin or redactor).
 * Admin-only pages call requireAdminPage() in their own page.tsx.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireStaffPage();
  return children;
}
