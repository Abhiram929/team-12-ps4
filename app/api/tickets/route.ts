import { NextResponse } from "next/server";
import { CURRENT_USER_ID } from "@/lib/currentUser";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("tickets")
      .select("id, title, priority, status, created_at, support_teams(name)")
      .eq("employee_id", CURRENT_USER_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[GET /api/tickets] Supabase error:", error);
      return NextResponse.json({ error: "Could not load tickets." }, { status: 500 });
    }

    const tickets = data.map((ticket) => {
      const team = Array.isArray(ticket.support_teams)
        ? ticket.support_teams[0]
        : ticket.support_teams;
      return { ...ticket, team_name: team?.name ?? null };
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("[GET /api/tickets] Unexpected error:", error);
    return NextResponse.json({ error: "Could not load tickets." }, { status: 500 });
  }
}
