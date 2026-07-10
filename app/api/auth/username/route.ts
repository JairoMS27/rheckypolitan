import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/** Public: check if a username is free (case-insensitive). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const formatError = validateUsername(raw);
  if (formatError) {
    return NextResponse.json({
      available: false,
      reason: "invalid",
      message: formatError,
    });
  }

  const username = normalizeUsername(raw);

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const available = !data?.length;
    return NextResponse.json({
      available,
      username,
      reason: available ? "ok" : "taken",
      message: available ? "Disponible" : "Ese nombre de usuario ya está en uso",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al comprobar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
