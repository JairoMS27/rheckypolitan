import { redirect } from "next/navigation";

/** Pasatiempos section retired — keep URL from 404ing. */
export default function Page() {
  redirect("/");
}
