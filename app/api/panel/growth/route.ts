import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { getGroqStatus } from "@/lib/ai/groq";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const [snapshot, opportunities, tasks, playbooks, signals] = await Promise.all([
      buildLumeniteBusinessSnapshot({
        admin: ctx.admin,
        businessId: ctx.businessId,
        businessName: ctx.business.name,
        publicKey: ctx.business.public_key,
      }),
      ctx.admin
        .from("lumenai_opportunities")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(80),
      ctx.admin
        .from("lumenai_followup_tasks")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(80),
      ctx.admin
        .from("lumenai_growth_playbooks")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
      ctx.admin
        .from("lumenai_signal_events")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const safeOpportunities = list<Record<string, unknown>>(opportunities.data);
    const safeTasks = list<Record<string, unknown>>(tasks.data);
    const safePlaybooks = list<Record<string, unknown>>(playbooks.data);
    const safeSignals = list<Record<string, unknown>>(signals.data);
    const open = safeOpportunities.filter((item) =>
      ["open", "new", "active"].includes(String(item.status ?? ""))
    );

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("growth"),
      business: snapshot.business,
      summary: {
        opportunities: safeOpportunities.length,
        open: open.length,
        hot: safeOpportunities.filter((item) => Number(item.score ?? 0) >= 75).length,
        followups: safeTasks.filter((item) => item.status === "pending").length,
        playbooks: safePlaybooks.filter((item) => item.enabled !== false).length,
        analyzedLeads: snapshot.leads.length,
      },
      opportunities: safeOpportunities,
      followupTasks: safeTasks,
      playbooks: safePlaybooks,
      signals: safeSignals,
      missingData: snapshot.missingData,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo cargar Growth.") },
      { status: safeErrorStatus(error) }
    );
  }
}
