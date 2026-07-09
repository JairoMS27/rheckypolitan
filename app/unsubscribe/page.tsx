import type { Metadata } from "next";
import { UnsubscribePage, type UnsubscribeData } from "@/views/unsubscribe";
import { processUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Darse de baja",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let data: UnsubscribeData;

  if (!token) {
    data = { state: "missing" };
  } else {
    const result = await processUnsubscribe(token);
    if (!result.ok) {
      if (result.status === 404) data = { state: "invalid" };
      else data = { state: "error" };
    } else {
      data = { state: "done", already: result.already, email: result.email ?? "" };
    }
  }

  return <UnsubscribePage data={data} />;
}
