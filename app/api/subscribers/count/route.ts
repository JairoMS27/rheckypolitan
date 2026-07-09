import { NextResponse } from "next/server";
import { getSubscriberCount } from "@/lib/subscribers.functions";

export async function GET() {
  try {
    const result = await getSubscriberCount();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
