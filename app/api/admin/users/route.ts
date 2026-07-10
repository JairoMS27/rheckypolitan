import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import {
  createRegisteredUser,
  deleteRegisteredUser,
  demoteRedactor,
  listRegisteredUsers,
  promoteToRedactor,
} from "@/lib/admin-users.functions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await listRegisteredUsers(auth.supabase, auth.userId);
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
    const action = body?.action as string | undefined;

    if (action === "promote") {
      const result = await promoteToRedactor(auth.supabase, auth.userId, {
        userId: body.userId,
      });
      return NextResponse.json(result);
    }
    if (action === "demote") {
      const result = await demoteRedactor(auth.supabase, auth.userId, {
        userId: body.userId,
      });
      return NextResponse.json(result);
    }

    // Default: create registered user (no role)
    const result = await createRegisteredUser(auth.supabase, auth.userId, body);
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
    const result = await deleteRegisteredUser(auth.supabase, auth.userId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "No autorizado" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
