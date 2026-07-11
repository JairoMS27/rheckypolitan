import { createFileRoute, redirect } from "@tanstack/react-router";

/** Section retired — keep route file so routeTree import stays valid. */
export const Route = createFileRoute("/pasatiempos")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
