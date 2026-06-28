import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const { data, error } = await ctx.admin
      .from("lumenai_action_runs")
      .select("id,agent,action_name,status,error,created_at,completed_at,payload,result")
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, actionRuns: Array.isArray(data) ? data : [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo leer historial.") },
      { status: safeErrorStatus(error) }
    );
  }
}
