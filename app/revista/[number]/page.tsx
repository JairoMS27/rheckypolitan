import type { Metadata } from "next";
import { RevistaPage } from "@/views/revista";
import { buildIssueMetadata, fetchIssueMeta } from "@/lib/revista-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const meta = await fetchIssueMeta(number);
  return buildIssueMetadata(number, meta);
}

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const meta = await fetchIssueMeta(number);
  return <RevistaPage number={number} meta={meta} />;
}
