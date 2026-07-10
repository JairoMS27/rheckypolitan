import type { Metadata } from "next";
import { FeedPage } from "@/views/feed";

export const metadata: Metadata = {
  title: "Mi feed",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FeedPage />;
}
