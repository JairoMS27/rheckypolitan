import { redirect } from "next/navigation";
import { authorPostsListPath } from "@/lib/dashboard-paths";

export default function Page() {
  redirect(authorPostsListPath());
}