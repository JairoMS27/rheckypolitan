import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { listRedactors, createRedactor, deleteRedactor } from "@/lib/admin-users.functions";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await listRedactors(auth.supabase, auth.userId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "No autorizado" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await createRedactor(auth.supabase, auth.userId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "No autorizado" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await deleteRedactor(auth.supabase, auth.userId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "No autorizado" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
