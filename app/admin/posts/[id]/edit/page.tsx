import { redirect } from "next/navigation";
import { authorPostEditPath } from "@/lib/dashboard-paths";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(authorPostEditPath(id));
}