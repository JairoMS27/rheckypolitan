import { redirect } from "next/navigation";
import { authorPostNewPath } from "@/lib/dashboard-paths";

export default function Page() {
  redirect(authorPostNewPath());
}