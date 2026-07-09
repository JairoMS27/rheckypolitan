import { NextResponse, type NextRequest } from "next/server";
import { processUnsubscribe } from "@/lib/unsubscribe";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let token: string | null = url.searchParams.get("token");
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formText = await request.text();
    const params = new URLSearchParams(formText);
    if (!params.get("List-Unsubscribe")) {
      const formToken = params.get("token");
      if (formToken) token = formToken;
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const result = await processUnsubscribe(token);
  if (!result.ok) {
    return NextResponse.json({ success: false }, { status: result.status });
  }

  return NextResponse.json({ success: true, already: result.already });
}
